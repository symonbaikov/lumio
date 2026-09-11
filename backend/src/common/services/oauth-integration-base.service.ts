import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationToken,
  User,
} from '../../entities';
import { decryptText, encryptText } from '../utils/encryption.util';

export type OAuthRepositoryLike<T> = {
  findOne: (args: unknown) => Promise<T | null>;
  create?: (data: Partial<T>) => T;
  save: (entity: T) => Promise<T>;
  delete: (criteria: unknown) => Promise<unknown>;
};

export type OAuthIntegrationSettingsRelationName = Exclude<keyof Integration, number | symbol>;

export abstract class OAuthIntegrationBaseService {
  protected abstract readonly logger: {
    error(message: string, error?: unknown): void;
    warn(message: string): void;
  };

  constructor(
    protected readonly integrationRepository: OAuthRepositoryLike<Integration>,
    protected readonly integrationTokenRepository: OAuthRepositoryLike<IntegrationToken>,
    protected readonly userRepository: OAuthRepositoryLike<User>,
  ) {}

  protected abstract getProvider(): IntegrationProvider;

  protected abstract getProviderName(): string;

  protected abstract getProviderRouteSegment(): string;

  protected abstract getFrontendBaseUrl(): string;

  protected abstract getSettingsRelationName(): OAuthIntegrationSettingsRelationName;

  protected abstract getStateSecret(): string;

  protected abstract refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }>;

  protected abstract getAuthorizationExpiredMessage(): string;

  protected buildState(payload: Record<string, unknown>): string {
    const encoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.signState(encoded);
    return `${encoded}.${signature}`;
  }

  protected parseState(state: string): Record<string, unknown> {
    const [encoded, signature] = (state || '').split('.');
    if (!(encoded && signature)) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const expected = this.signState(encoded);
    if (expected !== signature) {
      throw new BadRequestException('Invalid OAuth state signature');
    }

    return JSON.parse(this.base64UrlDecode(encoded));
  }

  protected async getWorkspaceId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });

    return user?.workspaceId ?? null;
  }

  protected async findIntegrationForUser(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const where = workspaceId
      ? { workspaceId, provider: this.getProvider() }
      : { connectedByUserId: userId, provider: this.getProvider() };

    const integration = await this.integrationRepository.findOne({
      where,
      relations: ['token', this.getSettingsRelationName()],
    });

    return { integration, workspaceId };
  }

  protected async ensureIntegration(userId: string) {
    const { integration } = await this.findIntegrationForUser(userId);
    if (!integration) {
      throw new NotFoundException(`${this.getProviderName()} integration not found`);
    }

    return integration;
  }

  protected async ensureValidAccessToken(integration: Integration): Promise<string> {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }

    const refreshToken = decryptText(integration.token.refreshToken || '');
    let accessToken = decryptText(integration.token.accessToken || '');
    const expiresAt = integration.token.expiresAt?.getTime() || 0;
    const shouldRefresh = !accessToken || (expiresAt && expiresAt <= Date.now() + 60 * 1000);
    if (!shouldRefresh) {
      return accessToken;
    }

    try {
      const refreshed = await this.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      integration.token.accessToken = encryptText(accessToken);
      if (refreshed.expiresAt) {
        integration.token.expiresAt = refreshed.expiresAt;
      }
      await this.integrationTokenRepository.save(integration.token);
      return accessToken;
    } catch {
      integration.status = IntegrationStatus.NEEDS_REAUTH;
      await this.integrationRepository.save(integration);
      throw new BadRequestException(this.getAuthorizationExpiredMessage());
    }
  }

  protected buildProviderAuthUrl(
    user: Pick<User, 'id' | 'workspaceId'>,
    buildUrl: (state: string) => string,
  ): string {
    const state = this.buildState({
      userId: user.id,
      workspaceId: user.workspaceId || null,
      redirect: `${this.getFrontendBaseUrl()}/integrations/${this.getProviderRouteSegment()}`,
    });

    return buildUrl(state);
  }

  protected buildIntegrationRedirect(status: string, reason?: string): string {
    const base = `${this.getFrontendBaseUrl()}/integrations/${this.getProviderRouteSegment()}`;
    if (!reason) {
      return `${base}?status=${status}`;
    }

    return `${base}?status=${status}&reason=${encodeURIComponent(reason)}`;
  }

  protected async resolveOAuthCallbackUser<TUser extends Pick<User, 'id'>>(
    params: { code?: string; state?: string; error?: string },
    select: Array<keyof User>,
  ): Promise<
    | { redirectBase: string; user: TUser }
    | { redirectUrl: string; code?: undefined; user?: undefined; redirectBase?: undefined }
  > {
    const redirectBase = `${this.getFrontendBaseUrl()}/integrations/${this.getProviderRouteSegment()}`;

    if (params.error) {
      return { redirectUrl: this.buildIntegrationRedirect('error', params.error) };
    }

    if (!(params.code && params.state)) {
      return { redirectUrl: this.buildIntegrationRedirect('error', 'missing_code') };
    }

    let state: Record<string, unknown>;
    try {
      state = this.parseState(params.state);
    } catch {
      return { redirectUrl: this.buildIntegrationRedirect('error', 'bad_state') };
    }

    const userId = typeof state.userId === 'string' ? state.userId : null;
    if (!userId) {
      return { redirectUrl: this.buildIntegrationRedirect('error', 'missing_user') };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select,
    });

    if (!user) {
      return { redirectUrl: this.buildIntegrationRedirect('error', 'user_not_found') };
    }

    return { redirectBase, user: user as unknown as TUser };
  }

  protected async upsertConnectedIntegration(
    existing: Integration | null,
    user: Pick<User, 'id' | 'workspaceId'>,
    scopes: string[],
  ): Promise<Integration> {
    const integration =
      existing ||
      this.integrationRepository.create?.({
        provider: this.getProvider(),
        workspaceId: user.workspaceId || null,
        connectedByUserId: user.id,
      }) ||
      ({
        provider: this.getProvider(),
        workspaceId: user.workspaceId || null,
        connectedByUserId: user.id,
      } as Integration);

    integration.status = IntegrationStatus.CONNECTED;
    integration.scopes = scopes;
    integration.connectedByUserId = user.id;

    return this.integrationRepository.save(integration);
  }

  protected async saveEncryptedTokenRecord(
    existingToken: IntegrationToken | null | undefined,
    integrationId: string,
    tokens: { accessToken?: string; refreshToken?: string; expiresAt?: Date },
  ): Promise<IntegrationToken> {
    const tokenRecord =
      existingToken ||
      this.integrationTokenRepository.create?.({
        integrationId,
        accessToken: '',
        refreshToken: '',
      }) ||
      ({ integrationId, accessToken: '', refreshToken: '' } as IntegrationToken);

    if (tokens.accessToken) {
      tokenRecord.accessToken = encryptText(tokens.accessToken);
    }
    if (tokens.refreshToken) {
      tokenRecord.refreshToken = encryptText(tokens.refreshToken);
    }
    if (tokens.expiresAt) {
      tokenRecord.expiresAt = tokens.expiresAt;
    }

    await this.integrationTokenRepository.save(tokenRecord);
    return tokenRecord;
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private signState(payload: string): string {
    const hmac = crypto.createHmac('sha256', this.getStateSecret());
    hmac.update(payload);
    return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}

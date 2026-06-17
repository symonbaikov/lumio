import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import nodemailer from 'nodemailer';
import type { Repository } from 'typeorm';
import { decryptText, encryptText } from '../../common/utils/encryption.util';
import { assertPublicEgressHost, assertPublicEgressUrl } from '../../common/utils/egress-url.util';
import { User, WorkspaceServiceSettings, WorkspaceServiceSettingsKey } from '../../entities';
import { TransactionCategorizer } from '../classification/helpers/transaction-categorizer';

export type AiRuntimeSettings = {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type LocalCategorizationRuntimeSettings = {
  enabled: boolean;
  modelId: string;
  threshold: number;
  localModelPath: string | null;
  source: 'workspace' | 'env' | 'disabled';
};

export type SmtpRuntimeSettings = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string | null;
  replyTo: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type TelegramRuntimeSettings = {
  botToken: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type AppRuntimeSettings = {
  publicUrl: string | null;
  source: 'workspace' | 'env' | 'disabled';
};

type UploadedModelArchive = {
  originalname?: string;
  buffer?: Buffer;
};

const DEFAULT_LOCAL_CATEGORIZATION_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const DEFAULT_LOCAL_CATEGORIZATION_THRESHOLD = 0.35;
const DEFAULT_LOCAL_CATEGORIZATION_CATEGORIES = [
  'Продукты',
  'Транспорт',
  'Развлечения',
  'Здоровье',
  'Коммунальные услуги',
];

@Injectable()
export class ApplicationSettingsService {
  constructor(
    @InjectRepository(WorkspaceServiceSettings)
    private readonly settingsRepository: Repository<WorkspaceServiceSettings>,
  ) {}

  async getAiStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.AI);
    const runtime = await this.getAiSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        enabled: runtime.enabled,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        timeoutMs: runtime.timeoutMs,
        apiKeyConfigured: Boolean(settings?.encryptedSecrets?.apiKey || process.env.AI_API_KEY),
      },
    };
  }

  async saveAiSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.AI);
    const config = {
      enabled: this.booleanValue(input.enabled, true),
      baseUrl: this.requiredString(input.baseUrl, 'baseUrl').replace(/\/+$/, ''),
      model: this.requiredString(input.model, 'model'),
      timeoutMs: this.positiveNumber(input.timeoutMs, 20000),
    };
    const secrets = this.mergeSecrets(existing, ['apiKey'], input);
    const runtime = this.aiRuntimeFromParts(config, secrets, 'workspace');
    await assertPublicEgressUrl(runtime.baseUrl);
    await this.assertAiConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.AI, config, secrets);
    return this.getAiStatus(user);
  }

  async getSmtpStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP);
    const runtime = await this.getSmtpSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        host: runtime.host,
        port: runtime.port,
        secure: runtime.secure,
        user: runtime.user,
        from: runtime.from,
        replyTo: runtime.replyTo,
        timeoutMs: runtime.timeoutMs,
        passConfigured: Boolean(settings?.encryptedSecrets?.pass || process.env.SMTP_PASS),
      },
    };
  }

  async saveSmtpSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP);
    const config = {
      host: this.requiredString(input.host, 'host'),
      port: this.positiveNumber(input.port, 587),
      secure: this.booleanValue(input.secure, false),
      user: this.stringValue(input.user),
      from: this.requiredString(input.from, 'from'),
      replyTo: this.stringValue(input.replyTo),
      timeoutMs: this.positiveNumber(input.timeoutMs, 10000),
    };
    const secrets = this.mergeSecrets(existing, ['pass'], input);
    const runtime = this.smtpRuntimeFromParts(config, secrets, 'workspace');
    await assertPublicEgressHost(runtime.host);
    await this.assertSmtpConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.SMTP, config, secrets);
    return this.getSmtpStatus(user);
  }

  async getTelegramStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM);
    const runtime = await this.getTelegramSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        timeoutMs: runtime.timeoutMs,
        botTokenConfigured: Boolean(
          settings?.encryptedSecrets?.botToken || process.env.TELEGRAM_BOT_TOKEN,
        ),
      },
    };
  }

  async saveTelegramSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM);
    const config = {
      timeoutMs: this.positiveNumber(input.timeoutMs, 10000),
    };
    const secrets = this.mergeSecrets(existing, ['botToken'], input);
    const runtime = this.telegramRuntimeFromParts(config, secrets, 'workspace');
    await this.assertTelegramConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.TELEGRAM, config, secrets);
    return this.getTelegramStatus(user);
  }

  async getAppStatus(user: User) {
    const runtime = await this.getAppSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        publicUrl: runtime.publicUrl,
      },
    };
  }

  async saveAppSettings(user: User, input: Record<string, unknown>) {
    const publicUrl = this.normalizeOrigin(this.requiredString(input.publicUrl, 'publicUrl'));
    await this.saveSettings(user, WorkspaceServiceSettingsKey.APP, { publicUrl }, {});
    return this.getAppStatus(user);
  }

  async disconnect(user: User, key: WorkspaceServiceSettingsKey) {
    const workspaceId = this.requireWorkspaceId(user);
    await this.settingsRepository.delete({ workspaceId, key });
    return { ok: true };
  }

  async getLocalCategorizationStatus(user: User) {
    const runtime = await this.getLocalCategorizationSettings(user);
    const modelInstalled = runtime.localModelPath
      ? await this.hasLocalCategorizationModelFiles(runtime.localModelPath, runtime.modelId)
      : false;

    return {
      connected: runtime.enabled && modelInstalled,
      status: runtime.enabled && modelInstalled ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        enabled: runtime.enabled,
        modelId: runtime.modelId,
        threshold: runtime.threshold,
        localModelPath: runtime.localModelPath,
        modelInstalled,
      },
    };
  }

  async saveLocalCategorizationSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(
      user,
      WorkspaceServiceSettingsKey.LOCAL_CATEGORIZATION,
    );
    const previous = existing
      ? this.localCategorizationRuntimeFromParts(existing.config, 'workspace')
      : null;
    const config = {
      enabled: this.booleanValue(input.enabled, previous?.enabled ?? true),
      modelId:
        this.stringValue(input.modelId) ||
        previous?.modelId ||
        DEFAULT_LOCAL_CATEGORIZATION_MODEL_ID,
      threshold: this.thresholdValue(input.threshold, previous?.threshold),
      localModelPath: this.stringValue(input.localModelPath) || previous?.localModelPath || null,
    };

    await this.saveSettings(user, WorkspaceServiceSettingsKey.LOCAL_CATEGORIZATION, config, {});
    return this.getLocalCategorizationStatus(user);
  }

  async installLocalCategorizationModel(user: User, file: UploadedModelArchive) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Model archive is required');
    }

    const existing = await this.getLocalCategorizationSettings(user);
    const modelId = existing.modelId || DEFAULT_LOCAL_CATEGORIZATION_MODEL_ID;
    const modelRoot = this.getLocalCategorizationModelRoot();
    const targetDir = this.resolveLocalModelDirectory(modelRoot, modelId);
    const stagingDir = path.join(os.tmpdir(), `lumio-model-${randomUUID()}`);

    try {
      await fs.mkdir(stagingDir, { recursive: true });
      await this.extractZipBuffer(file.buffer, stagingDir);
      const modelSourceDir = await this.findExtractedModelDirectory(stagingDir);

      await fs.rm(targetDir, { recursive: true, force: true });
      await fs.mkdir(path.dirname(targetDir), { recursive: true });
      await fs.cp(modelSourceDir, targetDir, { recursive: true });
    } finally {
      await fs.rm(stagingDir, { recursive: true, force: true });
    }

    await this.saveLocalCategorizationSettings(user, {
      enabled: true,
      modelId,
      threshold: existing.threshold,
      localModelPath: modelRoot,
    });

    return this.getLocalCategorizationStatus(user);
  }

  async testLocalCategorization(user: User, input: Record<string, unknown>) {
    const runtime = await this.getLocalCategorizationSettings(user);
    const merchantName = this.requiredString(input.merchantName, 'merchantName');
    const categories = this.stringArrayValue(input.categories);
    const categorizer = new TransactionCategorizer({
      categories: categories.length ? categories : DEFAULT_LOCAL_CATEGORIZATION_CATEGORIES,
      threshold: runtime.threshold,
      modelId: runtime.modelId,
      allowRemoteModels: false,
      localModelPath: runtime.localModelPath || undefined,
    });
    const category = await categorizer.categorize(merchantName);
    const modelLoadError = categorizer.getModelLoadError();

    return {
      ready: !modelLoadError,
      merchantName,
      category,
      modelLoadError: modelLoadError?.message || null,
    };
  }

  async getAiSettings(user?: User | null): Promise<AiRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.AI) : null;
    if (workspace) {
      return this.aiRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      enabled: true,
      baseUrl: process.env.AI_BASE_URL?.replace(/\/+$/, '') || null,
      apiKey: process.env.AI_API_KEY || null,
      model: process.env.AI_MODEL || null,
      timeoutMs: this.positiveNumber(process.env.AI_TIMEOUT_MS, 20000),
    };
    return env.baseUrl && env.model ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getLocalCategorizationSettings(
    user?: User | null,
  ): Promise<LocalCategorizationRuntimeSettings> {
    const workspace = user
      ? await this.findSettings(user, WorkspaceServiceSettingsKey.LOCAL_CATEGORIZATION)
      : null;
    if (workspace) {
      return this.localCategorizationRuntimeFromParts(workspace.config, 'workspace');
    }

    const env = {
      enabled: process.env.LOCAL_CATEGORIZATION_ENABLED !== 'false',
      modelId: process.env.LOCAL_CATEGORIZATION_MODEL_ID || DEFAULT_LOCAL_CATEGORIZATION_MODEL_ID,
      threshold: this.thresholdValue(process.env.LOCAL_CATEGORIZATION_THRESHOLD),
      localModelPath: process.env.LOCAL_CATEGORIZATION_MODEL_PATH || null,
    };
    return {
      ...env,
      source: env.enabled && env.localModelPath ? 'env' : 'disabled',
    };
  }

  async getAiSettingsForWorkspaceId(workspaceId?: string | null): Promise<AiRuntimeSettings> {
    if (workspaceId) {
      const workspace = await this.settingsRepository.findOne({
        where: { workspaceId, key: WorkspaceServiceSettingsKey.AI },
      });
      if (workspace) {
        return this.aiRuntimeFromParts(
          workspace.config,
          this.decryptSecrets(workspace.encryptedSecrets),
          'workspace',
        );
      }
    }
    return this.getAiSettings(null);
  }

  async getSmtpSettings(user?: User | null): Promise<SmtpRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP) : null;
    if (workspace) {
      return this.smtpRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      host: process.env.SMTP_HOST || null,
      port: this.positiveNumber(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null,
      from: process.env.SMTP_FROM || null,
      replyTo: process.env.SMTP_REPLY_TO || null,
      timeoutMs: this.positiveNumber(process.env.SMTP_TIMEOUT_MS, 10000),
    };
    return env.host && env.from ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getTelegramSettings(user?: User | null): Promise<TelegramRuntimeSettings> {
    const workspace = user
      ? await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM)
      : null;
    if (workspace) {
      return this.telegramRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || null,
      timeoutMs: this.positiveNumber(process.env.TELEGRAM_TIMEOUT_MS, 10000),
    };
    return env.botToken ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getAppSettings(user?: User | null): Promise<AppRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.APP) : null;
    if (workspace) {
      const publicUrl = this.stringValue(workspace.config.publicUrl);
      return publicUrl
        ? { publicUrl, source: 'workspace' }
        : { publicUrl: null, source: 'disabled' };
    }

    const publicUrl = this.normalizeOrigin(process.env.APP_URL || process.env.FRONTEND_URL || '');
    return publicUrl ? { publicUrl, source: 'env' } : { publicUrl: null, source: 'disabled' };
  }

  private async findSettings(user: User, key: WorkspaceServiceSettingsKey) {
    const workspaceId = this.requireWorkspaceId(user);
    return this.settingsRepository.findOne({ where: { workspaceId, key } });
  }

  private async saveSettings(
    user: User,
    key: WorkspaceServiceSettingsKey,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ) {
    const workspaceId = this.requireWorkspaceId(user);
    const existing = await this.settingsRepository.findOne({ where: { workspaceId, key } });
    const entity =
      existing ||
      this.settingsRepository.create({
        workspaceId,
        key,
      });
    entity.config = config;
    entity.encryptedSecrets = Object.fromEntries(
      Object.entries(secrets)
        .filter(([, value]) => value)
        .map(([secretKey, value]) => [secretKey, encryptText(value)]),
    );
    entity.updatedByUserId = user.id;
    await this.settingsRepository.save(entity);
  }

  private mergeSecrets(
    existing: WorkspaceServiceSettings | null,
    keys: string[],
    input: Record<string, unknown>,
  ): Record<string, string> {
    const previous = this.decryptSecrets(existing?.encryptedSecrets || {});
    const next: Record<string, string> = {};
    for (const key of keys) {
      const incoming = this.stringValue(input[key]);
      next[key] = incoming === undefined || incoming === '' ? previous[key] || '' : incoming;
    }
    return next;
  }

  private decryptSecrets(encryptedSecrets: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(encryptedSecrets || {}).map(([key, value]) => [key, decryptText(value)]),
    );
  }

  private aiRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: AiRuntimeSettings['source'],
  ): AiRuntimeSettings {
    const baseUrl = this.stringValue(config.baseUrl)?.replace(/\/+$/, '') || null;
    const model = this.stringValue(config.model) || null;
    return {
      enabled: this.booleanValue(config.enabled, true),
      baseUrl,
      apiKey: secrets.apiKey || null,
      model,
      timeoutMs: this.positiveNumber(config.timeoutMs, 20000),
      source: baseUrl && model ? source : 'disabled',
    };
  }

  private smtpRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: SmtpRuntimeSettings['source'],
  ): SmtpRuntimeSettings {
    const host = this.stringValue(config.host) || null;
    const from = this.stringValue(config.from) || null;
    return {
      host,
      port: this.positiveNumber(config.port, 587),
      secure: this.booleanValue(config.secure, false),
      user: this.stringValue(config.user) || null,
      pass: secrets.pass || null,
      from,
      replyTo: this.stringValue(config.replyTo) || null,
      timeoutMs: this.positiveNumber(config.timeoutMs, 10000),
      source: host && from ? source : 'disabled',
    };
  }

  private telegramRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: TelegramRuntimeSettings['source'],
  ): TelegramRuntimeSettings {
    const botToken = secrets.botToken || null;
    return {
      botToken,
      timeoutMs: this.positiveNumber(config.timeoutMs, 10000),
      source: botToken ? source : 'disabled',
    };
  }

  private localCategorizationRuntimeFromParts(
    config: Record<string, unknown>,
    source: LocalCategorizationRuntimeSettings['source'],
  ): LocalCategorizationRuntimeSettings {
    const enabled = this.booleanValue(config.enabled, true);
    const localModelPath = this.stringValue(config.localModelPath) || null;
    return {
      enabled,
      modelId: this.stringValue(config.modelId) || DEFAULT_LOCAL_CATEGORIZATION_MODEL_ID,
      threshold: this.thresholdValue(config.threshold),
      localModelPath,
      source: enabled && localModelPath ? source : 'disabled',
    };
  }

  private getLocalCategorizationModelRoot(): string {
    return (
      process.env.LOCAL_CATEGORIZATION_MODEL_ROOT ||
      path.join(process.cwd(), '.local-models', 'categorization')
    );
  }

  private resolveLocalModelDirectory(modelRoot: string, modelId: string): string {
    const parts = modelId.split('/').filter(Boolean);
    if (
      !parts.length ||
      parts.some(part => part === '.' || part === '..' || path.isAbsolute(part))
    ) {
      throw new BadRequestException('modelId is invalid');
    }
    return path.join(modelRoot, ...parts);
  }

  private async extractZipBuffer(buffer: Buffer, destination: string): Promise<void> {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException('Model archive must be a valid ZIP file');
    }

    for (const entry of zip.getEntries()) {
      const normalizedName = path.normalize(entry.entryName);
      if (
        path.isAbsolute(normalizedName) ||
        normalizedName.startsWith('..') ||
        normalizedName.includes(`${path.sep}..${path.sep}`)
      ) {
        throw new BadRequestException('Model archive contains unsafe paths');
      }

      const targetPath = path.join(destination, normalizedName);
      if (entry.isDirectory) {
        await fs.mkdir(targetPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, entry.getData());
      }
    }
  }

  private async findExtractedModelDirectory(root: string): Promise<string> {
    const candidates = await this.walkDirectories(root);
    for (const candidate of candidates) {
      if (await this.directoryLooksLikeTransformersModel(candidate)) {
        return candidate;
      }
    }
    throw new BadRequestException('Model archive must contain config.json and an ONNX model file');
  }

  private async walkDirectories(root: string): Promise<string[]> {
    const result = [root];
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        result.push(...(await this.walkDirectories(path.join(root, entry.name))));
      }
    }
    return result;
  }

  private async hasLocalCategorizationModelFiles(
    modelRoot: string,
    modelId: string,
  ): Promise<boolean> {
    return this.directoryLooksLikeTransformersModel(
      this.resolveLocalModelDirectory(modelRoot, modelId),
    );
  }

  private async directoryLooksLikeTransformersModel(directory: string): Promise<boolean> {
    try {
      const configPath = path.join(directory, 'config.json');
      await fs.access(configPath);
      const onnxDir = path.join(directory, 'onnx');
      const onnxEntries = await fs.readdir(onnxDir);
      return onnxEntries.some(entry => entry.endsWith('.onnx'));
    } catch {
      return false;
    }
  }

  private async assertAiConnection(settings: AiRuntimeSettings) {
    if (!(settings.baseUrl && settings.model)) {
      throw new BadRequestException('AI baseUrl and model are required');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: 'Return {"ok":true} as JSON.' }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadRequestException(`AI endpoint returned ${response.status}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to connect to AI endpoint');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async assertSmtpConnection(settings: SmtpRuntimeSettings) {
    if (!(settings.host && settings.from)) {
      throw new BadRequestException('SMTP host and from are required');
    }
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth:
        settings.user && settings.pass
          ? {
              user: settings.user,
              pass: settings.pass,
            }
          : undefined,
      connectionTimeout: settings.timeoutMs,
      greetingTimeout: settings.timeoutMs,
      socketTimeout: settings.timeoutMs,
    });
    try {
      await transporter.verify();
    } catch {
      throw new BadRequestException('Unable to verify SMTP connection');
    }
  }

  private async assertTelegramConnection(settings: TelegramRuntimeSettings) {
    if (!settings.botToken) {
      throw new BadRequestException('Telegram botToken is required');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as { ok?: boolean; description?: string };
      if (!(response.ok && payload.ok)) {
        throw new BadRequestException(payload.description || 'Telegram bot token is invalid');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to connect to Telegram');
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireWorkspaceId(user: User): string {
    const workspaceId = user.workspaceId || user.lastWorkspaceId;
    if (!workspaceId) {
      throw new BadRequestException('Workspace is required');
    }
    return workspaceId;
  }

  private requiredString(value: unknown, name: string): string {
    const text = this.stringValue(value);
    if (!text) {
      throw new BadRequestException(`${name} is required`);
    }
    return text;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim() || undefined : undefined;
  }

  private booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private positiveNumber(value: unknown, fallback: number): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private thresholdValue(
    value: unknown,
    fallback = DEFAULT_LOCAL_CATEGORIZATION_THRESHOLD,
  ): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : fallback;
  }

  private stringArrayValue(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean);
  }

  private normalizeOrigin(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
      return new URL(hasScheme ? trimmed : `https://${trimmed}`).origin;
    } catch {
      throw new BadRequestException('publicUrl must be a valid URL');
    }
  }
}

import { createHmac, randomBytes, randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { IsNull, type Repository } from 'typeorm';
import {
  AuthSession,
  User,
  UserRole,
  Workspace,
  WorkspaceInvitation,
  WorkspaceInvitationStatus,
  WorkspaceMember,
  WorkspaceRole,
} from '../../entities';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { GoogleLoginDto } from './dto/google-login.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface UserSessionDto {
  id: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceInvitation)
    private workspaceInvitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, sessionContext?: SessionContext): Promise<AuthResponseDto> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const invitationToken = registerDto.invitationToken?.trim() || null;

    if (invitationToken) {
      const invitation = await this.workspaceInvitationRepository.findOne({
        where: { token: invitationToken },
      });

      if (!invitation) {
        throw new BadRequestException('Invitation not found or already used');
      }

      if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
        throw new BadRequestException('Invitation is not pending');
      }

      if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
        invitation.status = WorkspaceInvitationStatus.EXPIRED;
        await this.workspaceInvitationRepository.save(invitation);
        throw new BadRequestException('Invitation has expired');
      }

      const invitationEmail = invitation.email.trim().toLowerCase();
      if (invitationEmail !== normalizedEmail) {
        throw new BadRequestException('Email does not match invitation');
      }
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: registerDto.name,
      company: registerDto.company || null,
      role: UserRole.USER,
      isActive: true,
      permissions: null, // Use role-based permissions by default
    });

    const savedUser = await this.userRepository.save(user);

    if (invitationToken) {
      return this.generateTokens(savedUser, sessionContext);
    }

    const workspaceName = registerDto.company?.trim()
      ? `${registerDto.company.trim()} workspace`
      : `${registerDto.name || registerDto.email} workspace`;

    const workspace = this.workspaceRepository.create({
      name: workspaceName,
      ownerId: savedUser.id,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    savedUser.workspaceId = savedWorkspace.id;
    await this.userRepository.save(savedUser);

    await this.workspaceMemberRepository.save({
      workspaceId: savedWorkspace.id,
      userId: savedUser.id,
      role: WorkspaceRole.OWNER,
      invitedById: savedUser.id,
    });

    return this.generateTokens(savedUser, sessionContext);
  }

  async login(loginDto: LoginDto, sessionContext?: SessionContext): Promise<AuthResponseDto> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: [
        'id',
        'email',
        'passwordHash',
        'name',
        'role',
        'workspaceId',
        'locale',
        'timeZone',
        'avatarUrl',
        'isActive',
        'tokenVersion',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    return this.generateTokens(user, sessionContext);
  }

  async loginWithGoogle(
    dto: GoogleLoginDto,
    sessionContext?: SessionContext,
  ): Promise<AuthResponseDto> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google login is not configured');
    }

    const googleClient = new OAuth2Client(clientId);

    const ticket = await googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    const googleId = payload?.sub;

    if (!email || !googleId) {
      throw new UnauthorizedException('Google account data is incomplete');
    }

    if (payload?.email_verified === false) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    const invitationToken = dto.invitationToken?.trim() || null;

    if (invitationToken) {
      const invitation = await this.workspaceInvitationRepository.findOne({
        where: { token: invitationToken },
      });

      if (!invitation) {
        throw new BadRequestException('Invitation not found or already used');
      }

      if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
        throw new BadRequestException('Invitation is not pending');
      }

      if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
        invitation.status = WorkspaceInvitationStatus.EXPIRED;
        await this.workspaceInvitationRepository.save(invitation);
        throw new BadRequestException('Invitation has expired');
      }

      const invitationEmail = invitation.email.trim().toLowerCase();
      if (invitationEmail !== email) {
        throw new BadRequestException('Email does not match invitation');
      }
    }

    let user = await this.userRepository.findOne({
      where: [{ email }, { googleId }],
    });

    if (user && !user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user) {
      const randomPassword = randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const displayName =
        payload?.name?.trim() || payload?.given_name?.trim() || email.split('@')[0];

      user = this.userRepository.create({
        email,
        passwordHash,
        name: displayName,
        company: null,
        role: UserRole.USER,
        isActive: true,
        permissions: null,
        googleId,
        avatarUrl: payload?.picture || null,
      });

      const savedUser = await this.userRepository.save(user);

      if (invitationToken) {
        return this.generateTokens(savedUser, sessionContext);
      }

      const workspaceName = `${displayName || email} workspace`;

      const workspace = this.workspaceRepository.create({
        name: workspaceName,
        ownerId: savedUser.id,
      });

      const savedWorkspace = await this.workspaceRepository.save(workspace);

      savedUser.workspaceId = savedWorkspace.id;
      await this.userRepository.save(savedUser);

      await this.workspaceMemberRepository.save({
        workspaceId: savedWorkspace.id,
        userId: savedUser.id,
        role: WorkspaceRole.OWNER,
        invitedById: savedUser.id,
      });

      user = savedUser;
    } else {
      const updates: Partial<User> = {
        googleId: user.googleId || googleId,
        avatarUrl: payload?.picture || user.avatarUrl || null,
        lastLogin: new Date(),
      };

      if (!user.name && payload?.name) {
        updates.name = payload.name;
      }

      await this.userRepository.update(user.id, updates);
      user = { ...user, ...updates };
    }

    return this.generateTokens(user, sessionContext);
  }

  async refreshToken(
    refreshToken: string,
    sessionContext?: SessionContext,
  ): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokenVersion = payload.tokenVersion ?? 0;
      if ((user.tokenVersion ?? 0) !== tokenVersion) {
        throw new UnauthorizedException('Token has been revoked');
      }

      if (!payload.sessionId) {
        throw new UnauthorizedException('Session is missing');
      }

      const session = await this.authSessionRepository.findOne({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          revokedAt: IsNull(),
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session is not active');
      }

      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      if (session.refreshTokenHash !== refreshTokenHash) {
        throw new UnauthorizedException('Refresh token does not match session');
      }

      const parsedDevice = this.parseUserAgent(sessionContext?.userAgent || session.userAgent || null);

      await this.authSessionRepository.update(
        { id: session.id },
        {
          lastUsedAt: new Date(),
          userAgent: sessionContext?.userAgent || session.userAgent,
          ipAddress: this.resolveIpAddress(sessionContext?.ipAddress) || session.ipAddress,
          device: parsedDevice.device,
          browser: parsedDevice.browser,
          os: parsedDevice.os,
        },
      );

      const accessTokenPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
        sessionId: payload.sessionId,
      };

      const access_token = this.jwtService.sign(accessTokenPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      } as any);

      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string | null): Promise<{ message: string }> {
    if (sessionId) {
      await this.authSessionRepository.update(
        {
          id: sessionId,
          userId,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.authSessionRepository.update(
      {
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );

    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    return { message: 'Logged out from all devices successfully' };
  }

  async getSessions(userId: string, currentSessionId?: string | null): Promise<UserSessionDto[]> {
    const sessions = await this.authSessionRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });

    return sessions.map(session => ({
      id: session.id,
      device: session.device,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      isCurrent: currentSessionId ? session.id === currentSessionId : false,
    }));
  }

  async logoutSession(userId: string, sessionId: string): Promise<{ message: string }> {
    const result = await this.authSessionRepository.update(
      {
        id: sessionId,
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );

    if (!result.affected) {
      throw new NotFoundException('Session not found');
    }

    return { message: 'Session logged out successfully' };
  }

  private async generateTokens(user: User, sessionContext?: SessionContext): Promise<AuthResponseDto> {
    const sessionId = randomUUID();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
      sessionId,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      type: 'refresh',
      tokenVersion: user.tokenVersion ?? 0,
      sessionId,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    } as any);

    const refresh_token = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    } as any);

    const parsedDevice = this.parseUserAgent(sessionContext?.userAgent);
    await this.authSessionRepository.save(
      this.authSessionRepository.create({
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(refresh_token),
        userAgent: sessionContext?.userAgent || null,
        ipAddress: this.resolveIpAddress(sessionContext?.ipAddress),
        device: parsedDevice.device,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        lastUsedAt: new Date(),
      }),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId || null,
        locale: user.locale,
        timeZone: user.timeZone ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
      access_token,
      refresh_token,
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    const secret =
      this.configService.get<string>('SESSION_TOKEN_SALT') ||
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'session-default-secret';

    return createHmac('sha256', secret).update(refreshToken).digest('hex');
  }

  private resolveIpAddress(ipAddress?: string | null): string | null {
    if (!ipAddress) {
      return null;
    }

    const normalized = ipAddress
      .split(',')
      .map(part => part.trim())
      .find(Boolean);

    return normalized || null;
  }

  private parseUserAgent(userAgent?: string | null): {
    device: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return {
        device: 'Unknown device',
        browser: 'Unknown browser',
        os: 'Unknown OS',
      };
    }

    const browser = this.detectBrowser(userAgent);
    const os = this.detectOs(userAgent);
    const lowerUa = userAgent.toLowerCase();
    const isTablet = /(ipad|tablet)/i.test(userAgent);
    const isMobile = /(iphone|ipod|android.*mobile|mobile)/i.test(userAgent);

    let device = 'Desktop';
    if (isTablet) {
      device = 'Tablet';
    } else if (isMobile) {
      device = 'Mobile';
    } else if (lowerUa.includes('bot') || lowerUa.includes('spider') || lowerUa.includes('crawl')) {
      device = 'Bot';
    }

    return {
      device,
      browser,
      os,
    };
  }

  private detectBrowser(userAgent: string): string {
    if (/Edg\//i.test(userAgent)) return 'Edge';
    if (/OPR\//i.test(userAgent)) return 'Opera';
    if (/Firefox\//i.test(userAgent)) return 'Firefox';
    if (/Chrome\//i.test(userAgent)) return 'Chrome';
    if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
    return 'Unknown browser';
  }

  private detectOs(userAgent: string): string {
    if (/Windows NT/i.test(userAgent)) return 'Windows';
    if (/Mac OS X/i.test(userAgent) && !/(iphone|ipad|ipod)/i.test(userAgent)) return 'macOS';
    if (/(iphone|ipad|ipod)/i.test(userAgent)) return 'iOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown OS';
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, type Repository } from 'typeorm';
import { devDefault } from '../../../common/utils/dev-defaults';
import { AuthSession } from '../../../entities/auth-session.entity';
import { User } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion?: number;
  sessionId?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface AuthenticatedUser extends User {
  currentSessionId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private jwtSecret: string;
  private readonly dicebearBaseUrl = 'https://api.dicebear.com/7.x/identicon/svg';

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
  ) {
    // Prefer dedicated access token secret but fall back to legacy key
    const jwtSecret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      devDefault(configService.get<string>('JWT_SECRET'), 'JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.jwtSecret = jwtSecret;
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!(payload?.sub && payload.email)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User is inactive');
    }

    const tokenVersion = payload.tokenVersion ?? 0;
    if ((user.tokenVersion ?? 0) !== tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Revoking a single session only marks the row; without this check the
    // access token of that device would keep working until it expires.
    // Legacy tokens carry no sessionId — they stay covered by tokenVersion alone.
    if (payload.sessionId) {
      const session = await this.authSessionRepository.findOne({
        where: { id: payload.sessionId, userId: user.id, revokedAt: IsNull() },
        select: ['id'],
      });

      if (!session) {
        throw new UnauthorizedException('Session is not active');
      }
    }

    const authenticatedUser = {
      ...user,
      currentSessionId: payload.sessionId || null,
    } as AuthenticatedUser;

    if (!user.avatarUrl) {
      const seed = `${user.id}-${Date.now().toString(36)}`;
      const avatarUrl = `${this.dicebearBaseUrl}?seed=${encodeURIComponent(seed)}`;
      await this.userRepository.update(user.id, { avatarUrl });
      return { ...authenticatedUser, avatarUrl };
    }

    return authenticatedUser;
  }
}

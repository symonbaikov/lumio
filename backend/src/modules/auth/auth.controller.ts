import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { User } from '../../entities/user.entity';
import { AuthService, type SessionContext } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthResponseDto, LoginResultDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorCodeDto, TwoFactorPasswordDto } from './dto/two-factor.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { TwoFactorSetupDto, TwoFactorStatusDto } from './two-factor.service';
import { TwoFactorService } from './two-factor.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  private getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  }

  private extractSessionContext(req: Request): SessionContext {
    const forwardedForHeader = req?.headers?.['x-forwarded-for'];
    const forwardedFor = Array.isArray(forwardedForHeader)
      ? forwardedForHeader[0]
      : forwardedForHeader;

    return {
      userAgent: req?.headers?.['user-agent'] || null,
      ipAddress: forwardedFor || req?.ip || req?.socket?.remoteAddress || null,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, this.extractSessionContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<LoginResultDto> {
    return this.authService.login(loginDto, this.extractSessionContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa')
  async getTwoFactorStatus(@CurrentUser() user: User): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorPasswordDto,
  ): Promise<TwoFactorSetupDto> {
    return this.twoFactorService.setup(user.id, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<{ recoveryCodes: string[] }> {
    return this.twoFactorService.enable(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorPasswordDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.disable(user.id, dto.password);
    return { message: 'Two-factor authentication disabled' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/recovery-codes')
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorPasswordDto,
  ): Promise<{ recoveryCodes: string[] }> {
    return this.twoFactorService.regenerateRecoveryCodes(user.id, dto.password);
  }

  @Public()
  @Get('google/callback')
  @Redirect()
  handleGoogleCallback(
    @Query('state') state?: string,
    @Query('code') code?: string,
    @Query('error') error?: string,
  ) {
    if (state === 'integrations/google-sheets') {
      const frontendBaseUrl = this.getFrontendBaseUrl();
      const params = new URLSearchParams();

      if (code) {
        params.set('code', code);
      }
      if (state) {
        params.set('state', state);
      }
      if (error) {
        params.set('error', error);
      }

      return {
        statusCode: 302,
        url: `${frontendBaseUrl}/google-sheets/callback?${params.toString()}`,
      };
    }

    return {
      statusCode: 302,
      url: `${this.getFrontendBaseUrl()}/login?google_callback=unsupported`,
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request): Promise<{ access_token: string; refresh_token: string }> {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.refreshToken(refreshToken, this.extractSessionContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const currentSessionId = req?.user?.currentSessionId || null;
    return this.authService.logout(user.id, currentSessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: User): Promise<{ message: string }> {
    return this.authService.logoutAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: User, @Req() req: AuthenticatedRequest) {
    const currentSessionId = req?.user?.currentSessionId || null;
    return this.authService.getSessions(user.id, currentSessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/logout')
  @HttpCode(HttpStatus.OK)
  async logoutSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    return this.authService.logoutSession(user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}

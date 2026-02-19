import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { User } from '../../entities/user.entity';
import { AuthService, type SessionContext } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractSessionContext(req: any): SessionContext {
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
  async register(@Body() registerDto: RegisterDto, @Req() req: any): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, this.extractSessionContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, this.extractSessionContext(req));
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() googleLoginDto: GoogleLoginDto,
    @Req() req: any,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(googleLoginDto, this.extractSessionContext(req));
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any): Promise<{ access_token: string }> {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.refreshToken(refreshToken, this.extractSessionContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User, @Req() req: any): Promise<{ message: string }> {
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
  async getSessions(@CurrentUser() user: User, @Req() req: any) {
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

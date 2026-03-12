import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthDevBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthDevBootstrapService.name);

  constructor(private readonly authService: AuthService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    try {
      await this.authService.ensureDevAdminUser();
      this.logger.log('Dev admin ensured: admin@example.com');
    } catch (error) {
      this.logger.error('Failed to ensure dev admin user', error as Error);
    }
  }
}

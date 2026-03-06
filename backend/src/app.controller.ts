import * as fs from 'fs';
import * as path from 'path';
import { Controller, Get, Res, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/ready')
  async getReadiness(): Promise<any> {
    const readiness = await this.appService.getReadiness();
    if (readiness.status !== 'ok') {
      throw new ServiceUnavailableException(readiness);
    }
    return readiness;
  }

  @Public()
  @Get()
  serveRoot(@Res() res: Response): void {
    // Try to serve Next.js app
    const nextPath = path.join(__dirname, 'public', '.next', 'standalone');
    const indexPath = path.join(nextPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback to API info
      res.status(200).json({
        message: 'Lumio - Bank Statement Processing System',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          api: '/api/v1',
          health: '/api/v1/health',
          docs: '/api/docs',
        },
      });
    }
  }
}

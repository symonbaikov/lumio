import { GoogleSheetsApiService } from '@/modules/google-sheets/services/google-sheets-api.service';
import { ConfigService } from '@nestjs/config';

describe('GoogleSheetsApiService', () => {
  it('uses GOOGLE_SHEETS_REDIRECT_URI before generic GOOGLE_REDIRECT_URI', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'client-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'client-secret';
        if (key === 'GOOGLE_SHEETS_REDIRECT_URI') {
          return 'http://localhost:3001/api/v1/google-sheets/oauth/callback';
        }
        if (key === 'GOOGLE_REDIRECT_URI') {
          return 'http://localhost:3001/api/v1/auth/google/callback';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new GoogleSheetsApiService(configService);
    const authUrl = service.getAuthUrl('test-state');
    const redirectUri = new URL(authUrl).searchParams.get('redirect_uri');

    expect(redirectUri).toBe('http://localhost:3001/api/v1/google-sheets/oauth/callback');
  });
});

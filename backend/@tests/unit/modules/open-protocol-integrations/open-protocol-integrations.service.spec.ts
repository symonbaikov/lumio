jest.mock('webdav', () => ({
  createClient: jest.fn(),
}));

import { OpenProtocolIntegrationsService } from '../../../../src/modules/open-protocol-integrations/open-protocol-integrations.service';
import { IntegrationProvider, IntegrationStatus } from '../../../../src/entities';

describe('OpenProtocolIntegrationsService', () => {
  const originalEnv = process.env;
  const integrationRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const createService = () =>
    new OpenProtocolIntegrationsService(
      integrationRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  beforeEach(() => {
    process.env = { ...originalEnv };
    integrationRepository.findOne.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports S3-compatible storage as connected when endpoint and bucket are configured', async () => {
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_BUCKET = 'lumio';
    process.env.S3_ACCESS_KEY_ID = 'access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret-key';

    const status = await createService().s3Status('workspace-1');

    expect(status.connected).toBe(true);
    expect(status.status).toBe(IntegrationStatus.CONNECTED);
    expect(status.settings).toMatchObject({
      endpoint: 'http://localhost:9000',
      bucket: 'lumio',
      accessKeyConfigured: true,
      secretKeyConfigured: true,
    });
    expect(status.settings).not.toHaveProperty('secretAccessKey');
  });

  it('reports WebDAV storage without exposing credentials', async () => {
    process.env.WEBDAV_URL = 'https://nextcloud.example.com/remote.php/dav/files/lumio';
    process.env.WEBDAV_USERNAME = 'user';
    process.env.WEBDAV_PASSWORD = 'password';

    const status = await createService().webdavStatus('workspace-1');

    expect(status.connected).toBe(true);
    expect(status.settings).toMatchObject({
      url: 'https://nextcloud.example.com/remote.php/dav/files/lumio',
      usernameConfigured: true,
      passwordConfigured: true,
    });
    expect(status.settings).not.toHaveProperty('password');
  });

  it('reports IMAP inbox as disconnected until host and username are configured', async () => {
    delete process.env.IMAP_HOST;
    process.env.IMAP_USER = 'receipts@example.com';

    const status = await createService().imapStatus('workspace-1');

    expect(status.connected).toBe(false);
    expect(status.status).toBe(IntegrationStatus.DISCONNECTED);
    expect(status.settings).toMatchObject({
      host: null,
      usernameConfigured: false,
    });
  });

  it('reads the integration of the workspace it is given', async () => {
    await createService().s3Status('ws-open');

    expect(integrationRepository.findOne).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-open', provider: IntegrationProvider.S3_COMPATIBLE },
      relations: ['openProtocolSettings'],
    });
  });
});

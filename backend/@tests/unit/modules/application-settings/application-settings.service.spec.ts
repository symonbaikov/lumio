jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
  })),
}));
jest.mock('../../../../src/common/utils/egress-url.util', () => ({
  assertPublicEgressHost: jest.fn().mockResolvedValue(undefined),
  assertPublicEgressUrl: jest.fn().mockResolvedValue(new URL('https://example.com')),
}));

const mockCategorize = jest.fn();
const mockGetModelLoadError = jest.fn();
const mockTransactionCategorizerConstructor = jest.fn();

jest.mock('../../../../src/modules/classification/helpers/transaction-categorizer', () => ({
  TransactionCategorizer: jest.fn().mockImplementation(options => {
    mockTransactionCategorizerConstructor(options);
    return {
      categorize: mockCategorize,
      getModelLoadError: mockGetModelLoadError,
    };
  }),
}));

import { ApplicationSettingsService } from '../../../../src/modules/application-settings/application-settings.service';
import { WorkspaceServiceSettingsKey } from '../../../../src/entities';
import {
  assertPublicEgressHost,
  assertPublicEgressUrl,
} from '../../../../src/common/utils/egress-url.util';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('ApplicationSettingsService', () => {
  const originalEnv = process.env;
  const user = { id: 'user-1', workspaceId: 'workspace-1' } as never;
  const saved: Record<string, unknown> = {};
  const repository = {
    findOne: jest.fn(),
    create: jest.fn(input => input),
    save: jest.fn(async entity => {
      saved[String(entity.key)] = entity;
      return entity;
    }),
    delete: jest.fn(),
  };

  const createService = () => new ApplicationSettingsService(repository as never);

  beforeEach(() => {
    process.env = { ...originalEnv };
    repository.findOne.mockImplementation(({ where }: { where?: { key?: string } } = {}) =>
      Promise.resolve(where?.key ? saved[where.key] || null : null),
    );
    repository.create.mockImplementation(input => input);
    repository.save.mockClear();
    repository.delete.mockClear();
    mockCategorize.mockReset();
    mockGetModelLoadError.mockReset();
    mockTransactionCategorizerConstructor.mockClear();
    (assertPublicEgressHost as jest.Mock).mockResolvedValue(undefined);
    (assertPublicEgressUrl as jest.Mock).mockResolvedValue(new URL('https://example.com'));
    (assertPublicEgressHost as jest.Mock).mockClear();
    (assertPublicEgressUrl as jest.Mock).mockClear();
    Object.keys(saved).forEach(key => delete saved[key]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    }) as never;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('saves AI settings without returning the API key', async () => {
    const result = await createService().saveAiSettings(user, {
      baseUrl: 'http://localhost:11434/',
      model: 'llama3.1',
      apiKey: 'secret-key',
      timeoutMs: 15000,
    });

    expect(result.connected).toBe(true);
    expect(result.settings).toMatchObject({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
      apiKeyConfigured: true,
    });
    expect(result.settings).not.toHaveProperty('apiKey');
    expect(assertPublicEgressUrl).toHaveBeenCalledWith('http://localhost:11434');
    expect(saved[WorkspaceServiceSettingsKey.AI]).toMatchObject({
      workspaceId: 'workspace-1',
      key: WorkspaceServiceSettingsKey.AI,
    });
  });

  it('preserves an existing SMTP password when the password field is blank', async () => {
    await createService().saveSmtpSettings(user, {
      host: 'mail.example.com',
      port: 587,
      user: 'lumio@example.com',
      pass: 'initial-secret',
      from: 'Lumio <noreply@example.com>',
    });

    const result = await createService().saveSmtpSettings(user, {
      host: 'mail.example.com',
      port: 587,
      user: 'lumio@example.com',
      pass: '',
      from: 'Lumio <noreply@example.com>',
    });

    expect(result.settings.passConfigured).toBe(true);
    expect(result.settings).not.toHaveProperty('pass');
    expect(assertPublicEgressHost).toHaveBeenCalledWith('mail.example.com');
  });

  it('deletes workspace settings on disconnect', async () => {
    await createService().disconnect(user, WorkspaceServiceSettingsKey.TELEGRAM);

    expect(repository.delete).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      key: WorkspaceServiceSettingsKey.TELEGRAM,
    });
  });

  it('saves local categorization settings without requiring a manual model path', async () => {
    const result = await createService().saveLocalCategorizationSettings(user, {
      enabled: true,
      modelId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      threshold: 0.42,
    });

    expect(result.connected).toBe(false);
    expect(result.settings).toMatchObject({
      enabled: true,
      modelId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      threshold: 0.42,
      modelInstalled: false,
    });
    expect(saved[WorkspaceServiceSettingsKey.LOCAL_CATEGORIZATION]).toMatchObject({
      workspaceId: 'workspace-1',
      key: WorkspaceServiceSettingsKey.LOCAL_CATEGORIZATION,
    });
  });

  it('tests local categorization with the saved local model path', async () => {
    await createService().saveLocalCategorizationSettings(user, {
      enabled: true,
      modelId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      threshold: 0.35,
      localModelPath: '/tmp/lumio-models',
    });
    mockCategorize.mockResolvedValue('Продукты');
    mockGetModelLoadError.mockReturnValue(null);

    const result = await createService().testLocalCategorization(user, {
      merchantName: 'Fresh Market',
      categories: ['Продукты', 'Транспорт'],
    });

    expect(result).toEqual({
      ready: true,
      merchantName: 'Fresh Market',
      category: 'Продукты',
      modelLoadError: null,
    });
    expect(mockTransactionCategorizerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['Продукты', 'Транспорт'],
        threshold: 0.35,
        allowRemoteModels: false,
        localModelPath: '/tmp/lumio-models',
      }),
    );
  });

  it('installs a local categorization model archive into workspace storage', async () => {
    const AdmZip = require('adm-zip');
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'lumio-model-test-'));
    process.env.LOCAL_CATEGORIZATION_MODEL_ROOT = tempRoot;

    const zip = new AdmZip();
    zip.addFile('model/config.json', Buffer.from('{}'));
    zip.addFile('model/tokenizer.json', Buffer.from('{}'));
    zip.addFile('model/onnx/model_quantized.onnx', Buffer.from('fake-onnx'));

    const result = await createService().installLocalCategorizationModel(user, {
      originalname: 'model.zip',
      buffer: zip.toBuffer(),
    } as never);

    expect(result.connected).toBe(true);
    expect(result.settings.modelInstalled).toBe(true);
    expect(result.settings.localModelPath).toBe(tempRoot);

    rmSync(tempRoot, { recursive: true, force: true });
  });
});

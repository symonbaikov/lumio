import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportSession } from '../../../../src/entities/import-session.entity';
import { ImportConfigService } from '../../../../src/modules/import/config/import.config';
import { ImportModule } from '../../../../src/modules/import/import.module';
import { ImportRetryService } from '../../../../src/modules/import/services/import-retry.service';

describe('ImportModule', () => {
  let module: TestingModule;
  let configService: ImportConfigService;
  let retryService: ImportRetryService;
  let repository: Repository<ImportSession>;

  beforeEach(async () => {
    // Create a mock repository
    const mockRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [ImportModule, ConfigModule.forRoot({ isGlobal: true })],
    })
      .overrideProvider(getRepositoryToken(ImportSession))
      .useValue(mockRepository)
      .compile();

    configService = module.get<ImportConfigService>(ImportConfigService);
    retryService = module.get<ImportRetryService>(ImportRetryService);
    repository = module.get<Repository<ImportSession>>(getRepositoryToken(ImportSession));
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Registration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide ImportConfigService', () => {
      expect(configService).toBeDefined();
      expect(configService).toBeInstanceOf(ImportConfigService);
    });

    it('should provide ImportRetryService', () => {
      expect(retryService).toBeDefined();
      expect(retryService).toBeInstanceOf(ImportRetryService);
    });

    it('should provide ImportSession repository', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    it('should inject ImportConfigService into ImportRetryService', () => {
      // Verify ImportRetryService can access config methods
      expect(configService.getMaxRetries()).toBe(3);
      expect(configService.getRetryBackoffBaseMs()).toBe(30000);
    });

    it('should allow ImportRetryService to use repository', async () => {
      // Verify ImportRetryService has access to repository
      const mockSession = {
        id: 'test-id',
        status: 'failed',
        sessionMetadata: null,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(mockSession);

      // This would throw if repository wasn't properly injected
      await expect(retryService.scheduleRetry('test-id', 0)).resolves.not.toThrow();

      expect(repository.findOne).toHaveBeenCalled();
    });
  });

  describe('Module Exports', () => {
    it('should export ImportConfigService for use in other modules', async () => {
      // Create a test consumer module
      const consumerModule = await Test.createTestingModule({
        imports: [ImportModule, ConfigModule.forRoot({ isGlobal: true })],
        providers: [
          {
            provide: 'TestConsumer',
            useFactory: (config: ImportConfigService) => ({
              config,
            }),
            inject: [ImportConfigService],
          },
        ],
      })
        .overrideProvider(getRepositoryToken(ImportSession))
        .useValue({})
        .compile();

      const testConsumer = consumerModule.get('TestConsumer');
      expect(testConsumer.config).toBeDefined();
      expect(testConsumer.config).toBeInstanceOf(ImportConfigService);

      await consumerModule.close();
    });

    it('should export ImportRetryService for use in other modules', async () => {
      // Create a test consumer module
      const consumerModule = await Test.createTestingModule({
        imports: [ImportModule, ConfigModule.forRoot({ isGlobal: true })],
        providers: [
          {
            provide: 'TestConsumer',
            useFactory: (retry: ImportRetryService) => ({
              retry,
            }),
            inject: [ImportRetryService],
          },
        ],
      })
        .overrideProvider(getRepositoryToken(ImportSession))
        .useValue({})
        .compile();

      const testConsumer = consumerModule.get('TestConsumer');
      expect(testConsumer.retry).toBeDefined();
      expect(testConsumer.retry).toBeInstanceOf(ImportRetryService);

      await consumerModule.close();
    });
  });
});

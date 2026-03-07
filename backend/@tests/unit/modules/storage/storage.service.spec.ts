import { FileStorageService } from '@/common/services/file-storage.service';
import {
  FilePermission,
  FilePermissionType,
  ShareLinkStatus,
  SharePermissionLevel,
  SharedLink,
  Statement,
  User,
  WorkspaceMember,
  WorkspaceRole,
  FileVersion,
  StorageView,
  Folder,
  Tag,
  Transaction,
  Category,
} from '@/entities';
import type { CreateSharedLinkDto } from '@/modules/storage/dto/create-shared-link.dto';
import { StorageService } from '@/modules/storage/storage.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { StatementsService } from '@/modules/statements/statements.service';
import { MetricsService } from '@/modules/observability/metrics.service';

describe('StorageService', () => {
  let testingModule: TestingModule;
  let service: StorageService;
  let sharedLinkRepository: Repository<SharedLink>;
  let filePermissionRepository: Repository<FilePermission>;
  let statementRepository: Repository<Statement>;
  let userRepository: Repository<User>;
  let workspaceMemberRepository: Repository<WorkspaceMember>;
  let fileStorageService: FileStorageService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    workspaceId: 'ws-1',
  };

  const mockStatement: Partial<Statement> = {
    id: 'stmt-1',
    userId: '1',
    fileName: 'statement.pdf',
  };

  const mockSharedLink: Partial<SharedLink> = {
    id: 'link-1',
    token: 'abc123',
    statementId: 'stmt-1',
    userId: '1',
    permission: SharePermissionLevel.VIEW,
    status: ShareLinkStatus.ACTIVE,
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: getRepositoryToken(SharedLink),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FilePermission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Statement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FileVersion),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StorageView),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Folder),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            getFileAvailability: jest.fn().mockResolvedValue({
              onDisk: true,
              inDb: false,
              status: 'disk',
            }),
            getFileUrl: jest.fn(),
          },
        },
        {
          provide: StatementsService,
          useValue: {
            remove: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            observeStorageRead: jest.fn(),
            observeStorageWrite: jest.fn(),
          },
        },
      ],
    }).compile();

    service = testingModule.get<StorageService>(StorageService);
    sharedLinkRepository = testingModule.get<Repository<SharedLink>>(
      getRepositoryToken(SharedLink),
    );
    filePermissionRepository = testingModule.get<Repository<FilePermission>>(
      getRepositoryToken(FilePermission),
    );
    statementRepository = testingModule.get<Repository<Statement>>(getRepositoryToken(Statement));
    userRepository = testingModule.get<Repository<User>>(getRepositoryToken(User));
    workspaceMemberRepository = testingModule.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
    fileStorageService = testingModule.get<FileStorageService>(FileStorageService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStorageFiles', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(filePermissionRepository, 'find').mockResolvedValue([]);

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockStatement]),
      };

      jest
        .spyOn(statementRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
    });

    it('should return all files for user', async () => {
      const result = await service.getStorageFiles('1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include workspace files', async () => {
      await service.getStorageFiles('1');

      expect(statementRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should include file metadata', async () => {
      jest.spyOn(fileStorageService, 'getFileAvailability').mockResolvedValue({
        onDisk: true,
        inDb: true,
        status: 'both',
      });

      const result = await service.getStorageFiles('1');

      expect(result).toBeDefined();
    });
  });

  describe('createSharedLink', () => {
    const createDto: CreateSharedLinkDto = {
      permission: SharePermissionLevel.VIEW,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    beforeEach(() => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);
    });

    it('should create shared link', async () => {
      jest.spyOn(sharedLinkRepository, 'create').mockReturnValue(mockSharedLink as SharedLink);
      jest.spyOn(sharedLinkRepository, 'save').mockResolvedValue(mockSharedLink as SharedLink);

      const result = await service.createSharedLink('1', '1', createDto);

      expect(result).toEqual(mockSharedLink);
      expect(sharedLinkRepository.save).toHaveBeenCalled();
    });

    it('should generate unique token', async () => {
      const createSpy = jest
        .spyOn(sharedLinkRepository, 'create')
        .mockReturnValue(mockSharedLink as SharedLink);
      jest.spyOn(sharedLinkRepository, 'save').mockResolvedValue(mockSharedLink as SharedLink);

      await service.createSharedLink('1', '1', createDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
        }),
      );
    });

    it('should set expiration date', async () => {
      const createSpy = jest
        .spyOn(sharedLinkRepository, 'create')
        .mockReturnValue(mockSharedLink as SharedLink);
      jest.spyOn(sharedLinkRepository, 'save').mockResolvedValue(mockSharedLink as SharedLink);

      await service.createSharedLink('1', '1', createDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should verify resource ownership', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createSharedLink('1', '1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow password protection', async () => {
      const dtoWithPassword = {
        ...createDto,
        password: 'secret123',
      };

      jest.spyOn(sharedLinkRepository, 'create').mockReturnValue(mockSharedLink as SharedLink);
      jest.spyOn(sharedLinkRepository, 'save').mockResolvedValue(mockSharedLink as SharedLink);

      await service.createSharedLink('1', '1', dtoWithPassword);

      expect(sharedLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
    });
  });

  describe('grantPermission', () => {
    const grantDto = {
      resourceType: 'statement' as const,
      resourceId: 'stmt-1',
      userId: '2',
      permissionType: FilePermissionType.VIEWER,
    };

    beforeEach(() => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        id: '2',
      } as User);
      jest.spyOn(service as any, 'checkFileAccess').mockResolvedValue(undefined);
    });

    it('should grant permission to user', async () => {
      jest.spyOn(filePermissionRepository, 'create').mockReturnValue({} as FilePermission);
      jest.spyOn(filePermissionRepository, 'save').mockResolvedValue({} as FilePermission);

      await service.grantPermission('1', '1', grantDto);

      expect(filePermissionRepository.save).toHaveBeenCalled();
    });

    it('should verify resource ownership', async () => {
      (service as any).checkFileAccess.mockRejectedValue(new NotFoundException('File not found'));

      await expect(service.grantPermission('1', '1', grantDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle duplicate permissions', async () => {
      jest.spyOn(filePermissionRepository, 'findOne').mockResolvedValue({
        id: 'perm-1',
      } as FilePermission);

      await expect(service.grantPermission('1', '1', grantDto)).rejects.toThrow();
    });
  });

  describe('revokePermission', () => {
    beforeEach(() => {
      jest.spyOn(filePermissionRepository, 'findOne').mockResolvedValue({
        id: 'perm-1',
        grantedById: '1',
        userId: '2',
      } as FilePermission);
      jest.spyOn(service as any, 'checkFileAccess').mockResolvedValue(undefined);
    });

    it('should revoke permission', async () => {
      const removeSpy = jest.spyOn(filePermissionRepository, 'remove').mockResolvedValue({} as any);

      await service.revokePermission('perm-1', '1');

      expect(removeSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'perm-1' }));
    });

    it('should verify permission ownership', async () => {
      jest.spyOn(filePermissionRepository, 'findOne').mockResolvedValue({
        id: 'perm-1',
        grantedById: '999',
      } as FilePermission);
      (service as any).checkFileAccess.mockRejectedValue(new ForbiddenException(''));

      await expect(service.revokePermission('perm-1', '1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if permission not found', async () => {
      jest.spyOn(filePermissionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.revokePermission('invalid', '1')).rejects.toThrow(NotFoundException);
    });
  });
});

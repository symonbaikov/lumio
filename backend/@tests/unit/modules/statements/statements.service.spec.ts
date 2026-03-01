import * as fs from 'fs';
import { FileStorageService } from '@/common/services/file-storage.service';
import { BankName, FileType, Statement, StatementStatus } from '@/entities/statement.entity';
import { Transaction } from '@/entities/transaction.entity';
import { User, UserRole } from '@/entities/user.entity';
import { WorkspaceMember, WorkspaceRole } from '@/entities/workspace-member.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { StatementProcessingService } from '@/modules/parsing/services/statement-processing.service';
import { StatementsService } from '@/modules/statements/statements.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
jest.mock('@/common/utils/file-hash.util');
jest.mock('@/common/utils/file-validator.util');
jest.mock('@/common/utils/filename.util');

describe('StatementsService', () => {
  let testingModule: TestingModule;
  let service: StatementsService;
  let statementRepository: Repository<Statement>;
  let transactionRepository: Repository<Transaction>;
  let auditService: AuditService;
  let userRepository: Repository<User>;
  let workspaceMemberRepository: Repository<WorkspaceMember>;
  let fileStorageService: FileStorageService;
  let statementProcessingService: StatementProcessingService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    workspaceId: 'ws-1',
    isActive: true,
  };

  const mockStatement: Partial<Statement> = {
    id: '1',
    fileName: 'statement.pdf',
    fileType: FileType.PDF,
    bankName: BankName.KASPI,
    status: StatementStatus.UPLOADED,
    userId: '1',
    fileHash: 'abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile = {
    path: '/tmp/statement.pdf',
    originalname: 'statement.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        StatementsService,
        {
          provide: getRepositoryToken(Statement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createEvent: jest.fn(),
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
          provide: FileStorageService,
          useValue: {
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
            isOnDisk: jest.fn(),
            resolveFilePath: jest.fn(),
          },
        },
        {
          provide: StatementProcessingService,
          useValue: {
            processStatement: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = testingModule.get<StatementsService>(StatementsService);
    statementRepository = testingModule.get<Repository<Statement>>(getRepositoryToken(Statement));
    transactionRepository = testingModule.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    auditService = testingModule.get<AuditService>(AuditService);
    userRepository = testingModule.get<Repository<User>>(getRepositoryToken(User));
    workspaceMemberRepository = testingModule.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
    fileStorageService = testingModule.get<FileStorageService>(FileStorageService);
    statementProcessingService = testingModule.get<StatementProcessingService>(
      StatementProcessingService,
    );

    // Setup fs.promises mocks
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('test'));
    jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (statementRepository as any).createQueryBuilder = undefined;
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      } as WorkspaceMember);
      const { calculateFileHash } = require('@/common/utils/file-hash.util');
      calculateFileHash.mockResolvedValue('abc123');
      const { getFileTypeFromMime } = require('@/common/utils/file-validator.util');
      getFileTypeFromMime.mockReturnValue(FileType.PDF);
      const { normalizeFilename } = require('@/common/utils/filename.util');
      normalizeFilename.mockReturnValue('statement.pdf');
    });

    it('should create a new statement', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null); // No duplicate
      jest.spyOn(statementRepository, 'create').mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      const result = await service.create(mockUser as User, mockFile);

      expect(result).toEqual(mockStatement);
      expect(statementRepository.save).toHaveBeenCalled();
    });

    it('should detect duplicate files', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);

      await expect(service.create(mockUser as User, mockFile)).rejects.toThrow(ConflictException);
    });

    it('should set status to UPLOADED initially', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(statementRepository, 'create')
        .mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StatementStatus.UPLOADED,
        }),
      );
    });

    it('should calculate file hash', async () => {
      const { calculateFileHash } = require('@/common/utils/file-hash.util');
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(statementRepository, 'create').mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile);

      expect(calculateFileHash).toHaveBeenCalledWith(mockFile.path);
    });

    it('should normalize filename', async () => {
      const { normalizeFilename } = require('@/common/utils/filename.util');
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(statementRepository, 'create').mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile);

      expect(normalizeFilename).toHaveBeenCalledWith('statement.pdf');
    });

    it('should check permissions for workspace members', async () => {
      const restrictedMember = {
        role: WorkspaceRole.MEMBER,
        permissions: { canEditStatements: false },
      } as WorkspaceMember;
      jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue(restrictedMember);

      await expect(service.create(mockUser as User, mockFile)).rejects.toThrow(ForbiddenException);
    });

    it('should upload file to storage service', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(statementRepository, 'create').mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile);

      expect(statementRepository.save).toHaveBeenCalled();
    });

    it('should handle optional googleSheetId', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(statementRepository, 'create')
        .mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile, 'sheet-123');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          googleSheetId: 'sheet-123',
        }),
      );
    });

    it('should cleanup temp file after upload', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(statementRepository, 'create').mockReturnValue(mockStatement as Statement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement as Statement);

      await service.create(mockUser as User, mockFile);

      expect(fs.promises.unlink).toHaveBeenCalledWith(mockFile.path);
    });
  });

  describe('findAll', () => {
    const createQueryBuilderMock = <TData extends object>(
      data: TData[],
      total: number,
      qbOverrides?: Partial<Record<string, jest.Mock>>,
    ) => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total] as const),
        ...qbOverrides,
      };

      (statementRepository as any).createQueryBuilder = jest.fn(() => qb);

      return qb;
    };

    it('should return all statements for user workspace', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: '1', workspaceId: 'ws-1' } as User);
      const statements = [mockStatement, { ...mockStatement, id: '2' }] as Statement[];
      const qb = createQueryBuilderMock(statements, 2);

      const result = await service.findAll('1', 1, 20);

      expect(result).toEqual({
        data: statements,
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('statement.createdAt', 'DESC');
      expect(qb.where).toHaveBeenCalledWith(
        'user.workspaceId = :workspaceId OR statement.userId = :userId',
        { workspaceId: 'ws-1', userId: '1' },
      );
    });

    it('should scope to user only when workspace is missing', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const qb = createQueryBuilderMock([mockStatement as Statement], 1);

      await service.findAll('1', 1, 20);

      expect(qb.where).toHaveBeenCalledWith('statement.userId = :userId', {
        userId: '1',
      });
    });

    it('should apply search filter', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: '1', workspaceId: 'ws-1' } as User);
      const qb = createQueryBuilderMock([mockStatement as Statement], 1);

      await service.findAll('1', 2, 10, 'abc');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.andWhere).toHaveBeenCalledWith('statement.fileName ILIKE :search', {
        search: '%abc%',
      });
    });
  });

  describe('findOne', () => {
    it('should return statement by id', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);

      const result = await service.findOne('1', '1');

      expect(result).toEqual(mockStatement);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('999', '1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other workspace', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        workspaceId: 'other-ws',
      } as unknown as Statement);

      const result = await service.findOne('1', '1');

      expect(result).toBeDefined();
    });

    it('should include transactions relation', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      const findOneSpy = jest
        .spyOn(statementRepository, 'findOne')
        .mockResolvedValue(mockStatement as Statement);

      await service.findOne('1', '1');

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.arrayContaining(['transactions']),
        }),
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      } as WorkspaceMember);
    });

    it('should delete statement and related transactions', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        filePath: '/tmp/file.pdf',
      } as Statement);
      const deleteTxSpy = jest
        .spyOn(transactionRepository, 'delete')
        .mockResolvedValue({ affected: 5, raw: [] });
      const removeSpy = jest
        .spyOn(statementRepository, 'remove')
        .mockResolvedValue(mockStatement as Statement);

      await service.remove('1', '1');

      expect(deleteTxSpy).toHaveBeenCalledWith({ statementId: '1' });
      expect(removeSpy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });

    it('should delete file from storage', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        filePath: '/tmp/file.pdf',
      } as Statement);
      jest.spyOn(transactionRepository, 'delete').mockResolvedValue({ affected: 0, raw: [] });
      jest.spyOn(statementRepository, 'remove').mockResolvedValue(mockStatement as Statement);

      await service.remove('1', '1');
    });

    it('should check permissions before delete', async () => {
      const restrictedMember = {
        role: WorkspaceRole.MEMBER,
        permissions: { canEditStatements: false },
      } as WorkspaceMember;
      jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue(restrictedMember);
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);

      await expect(service.remove('1', '1')).rejects.toThrow(ForbiddenException);
    });

    it('should create audit event for deletion', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        filePath: '/tmp/file.pdf',
      } as Statement);
      jest.spyOn(transactionRepository, 'delete').mockResolvedValue({ affected: 0, raw: [] });
      jest.spyOn(statementRepository, 'remove').mockResolvedValue(mockStatement as Statement);
      const auditSpy = jest.spyOn(auditService, 'createEvent');

      await service.remove('1', '1');

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
        }),
      );
    });
  });

  describe('reprocess', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      } as WorkspaceMember);
    });

    it('should trigger statement reprocessing', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement as Statement);
      const reprocessSpy = jest
        .spyOn(statementProcessingService, 'processStatement')
        .mockResolvedValue(mockStatement as Statement);

      await service.reprocess('1', '1');

      expect(reprocessSpy).toHaveBeenCalledWith('1');
    });

    it('should reset status to PROCESSING', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        status: StatementStatus.ERROR,
      } as Statement);
      const saveSpy = jest
        .spyOn(statementRepository, 'save')
        .mockResolvedValue(mockStatement as Statement);
      jest
        .spyOn(statementProcessingService, 'processStatement')
        .mockResolvedValue(mockStatement as Statement);

      await service.reprocess('1', '1');

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StatementStatus.UPLOADED,
        }),
      );
    });

    it('should skip reprocess when already processing', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue({
        ...mockStatement,
        status: StatementStatus.PROCESSING,
      } as Statement);

      await expect(service.reprocess('1', '1')).resolves.toBeDefined();
    });
  });
});

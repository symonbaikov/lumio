import {
  AuthSession,
  User,
  UserRole,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/entities';
import { AuthService } from '@/modules/auth/auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed_${value}`),
  compare: jest.fn(async () => true),
}));

describe('AuthService', () => {
  let testingModule: TestingModule;
  let service: AuthService;
  let userRepository: Repository<User>;
  let workspaceRepository: Repository<Workspace>;
  let workspaceInvitationRepository: Repository<WorkspaceInvitation>;
  let workspaceMemberRepository: Repository<WorkspaceMember>;
  let authSessionRepository: Repository<AuthSession>;
  let jwtService: JwtService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    role: UserRole.USER,
    workspaceId: '1',
    isActive: true,
  };

  const mockWorkspace: Partial<Workspace> = {
    id: '1',
    name: 'Test Workspace',
    ownerId: '1',
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Workspace),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceInvitation),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuthSession),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(payload => payload),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SESSION_TOKEN_SALT') return 'session-salt';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = testingModule.get<AuthService>(AuthService);
    userRepository = testingModule.get<Repository<User>>(getRepositoryToken(User));
    workspaceRepository = testingModule.get<Repository<Workspace>>(getRepositoryToken(Workspace));
    workspaceInvitationRepository = testingModule.get<Repository<WorkspaceInvitation>>(
      getRepositoryToken(WorkspaceInvitation),
    );
    workspaceMemberRepository = testingModule.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
    authSessionRepository = testingModule.get<Repository<AuthSession>>(getRepositoryToken(AuthSession));
    jwtService = testingModule.get<JwtService>(JwtService);
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

  describe('register', () => {
    it('should create new user with hashed password', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        ...mockUser,
        email: registerDto.email,
      } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      } as User);
      jest.spyOn(workspaceRepository, 'create').mockReturnValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceRepository, 'save').mockResolvedValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceMemberRepository, 'create').mockReturnValue({} as WorkspaceMember);
      jest.spyOn(workspaceMemberRepository, 'save').mockResolvedValue({} as WorkspaceMember);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => 'hashed_password');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should normalize email to lowercase', async () => {
      const registerDto = {
        email: 'Test@EXAMPLE.com',
        password: 'password123',
        name: 'Test User',
      };

      const findOneSpy = jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(workspaceRepository, 'create').mockReturnValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceRepository, 'save').mockResolvedValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceMemberRepository, 'create').mockReturnValue({} as WorkspaceMember);
      jest.spyOn(workspaceMemberRepository, 'save').mockResolvedValue({} as WorkspaceMember);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => 'hashed_password');

      await service.register(registerDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should not store plain text password', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'plain_password',
        name: 'New User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const saveSpy = jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(workspaceRepository, 'create').mockReturnValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceRepository, 'save').mockResolvedValue(mockWorkspace as Workspace);
      jest.spyOn(workspaceMemberRepository, 'create').mockReturnValue({} as WorkspaceMember);
      jest.spyOn(workspaceMemberRepository, 'save').mockResolvedValue({} as WorkspaceMember);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => 'hashed_password');

      await service.register(registerDto);

      const savedUser = saveSpy.mock.calls[0][0];
      expect(savedUser.passwordHash).not.toBe(registerDto.password);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');
    });

    it('should return access and refresh tokens for valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('password123', 10),
      } as User);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('correct_password', 10),
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle case-insensitive email lookup', async () => {
      const loginDto = {
        email: 'Test@EXAMPLE.com',
        password: 'password123',
      };

      const findOneSpy = jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('password123', 10),
      } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      await service.login(loginDto);

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        }),
      );
    });

    it('should update last login timestamp', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('password123', 10),
      } as User);

      await service.login(loginDto);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lastLogin: expect.any(Date) }),
      );
    });

    it('includes sessionId in access and refresh token payloads', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('password123', 10),
      } as User);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
        }),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token from database', async () => {
      const userId = '1';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      const saveSpy = jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.logout(userId);

      expect(result).toHaveProperty('message');
    });

    it('should return success even if user not found', async () => {
      const userId = '999';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.logout(userId)).resolves.not.toThrow();
    });
  });

  describe('sessions', () => {
    it('returns active sessions and marks current one', async () => {
      jest.spyOn(authSessionRepository, 'find').mockResolvedValue([
        {
          id: 'session-2',
          userId: '1',
          device: 'Desktop',
          browser: 'Chrome',
          os: 'macOS',
          ipAddress: '10.0.0.1',
          createdAt: new Date('2026-02-15T10:00:00.000Z'),
          lastUsedAt: new Date('2026-02-15T12:00:00.000Z'),
          revokedAt: null,
        },
      ] as AuthSession[]);

      const result = await service.getSessions('1', 'session-2');

      expect(result).toEqual([
        expect.objectContaining({
          id: 'session-2',
          isCurrent: true,
          browser: 'Chrome',
        }),
      ]);
    });

    it('revokes specific session by id', async () => {
      jest.spyOn(authSessionRepository, 'update').mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const result = await service.logoutSession('1', 'session-2');

      expect(result).toEqual({ message: 'Session logged out successfully' });
      expect(authSessionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-2', userId: '1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('refreshToken', () => {
    it('issues access token when refresh token belongs to active session', async () => {
      const refreshToken = 'refresh-token';
      const refreshTokenHash = createHmac('sha256', 'session-salt').update(refreshToken).digest('hex');

      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: '1',
        type: 'refresh',
        tokenVersion: 0,
        sessionId: 'session-1',
      } as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(authSessionRepository, 'findOne').mockResolvedValue({
        id: 'session-1',
        userId: '1',
        refreshTokenHash,
        userAgent: 'Mozilla/5.0',
        ipAddress: '10.0.0.1',
        revokedAt: null,
      } as AuthSession);
      jest.spyOn(authSessionRepository, 'update').mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });
      jest.spyOn(jwtService, 'sign').mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken, {
        userAgent: 'Mozilla/5.0 (Macintosh)',
        ipAddress: '10.0.0.2',
      });

      expect(result).toEqual({ access_token: 'new-access-token' });
      expect(authSessionRepository.update).toHaveBeenCalledWith(
        { id: 'session-1' },
        expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      );
    });

    it('throws when session is missing', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: '1',
        type: 'refresh',
        tokenVersion: 0,
        sessionId: 'missing-session',
      } as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(authSessionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refreshToken('refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});

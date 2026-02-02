import { User, UserRole } from '@/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let testingModule: TestingModule;
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    role: UserRole.USER,
    workspaceId: '1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { passwordHash: _, ...mockUserWithoutPasswordHash } = mockUser;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = testingModule.get<UsersService>(UsersService);
    repository = testingModule.get<Repository<User>>(getRepositoryToken(User));
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

  describe('findOne', () => {
    it('should return user by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUserWithoutPasswordHash as User);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUserWithoutPasswordHash);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          select: expect.any(Array),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should not expose password field', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUserWithoutPasswordHash as User);

      const result = await service.findOne('1');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updateDto = {
        name: 'Updated Name',
        company: 'Updated Company',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(repository, 'save').mockResolvedValue({
        ...mockUser,
        ...updateDto,
      } as User);

      const result = await service.update('1', updateDto, mockUser as User);

      expect(result.name).toBe(updateDto.name);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.update('999', { name: 'Test' }, adminUser as User)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not update email if already taken', async () => {
      const updateDto = {
        email: 'existing@example.com',
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockUser as User) // First call for the user being updated
        .mockResolvedValueOnce({ id: '2' } as User); // Second call to check if email exists

      await expect(service.update('1', updateDto, mockUser as User)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      const adminUser = { ...mockUser, id: '2', role: UserRole.ADMIN };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);
      const softDeleteSpy = jest
        .spyOn(repository, 'softDelete')
        .mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.remove('1', adminUser as User);

      expect(softDeleteSpy).toHaveBeenCalledWith('1');
    });

    it('should not physically delete from database', async () => {
      const adminUser = { ...mockUser, id: '2', role: UserRole.ADMIN };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);
      const deleteSpy = jest.spyOn(repository, 'delete');
      jest
        .spyOn(repository, 'softDelete')
        .mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.remove('1', adminUser as User);

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('999', adminUser as User)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new_hashed' as never);
    });

    it('should verify old password', async () => {
      const changePasswordDto = {
        currentPassword: 'old_password',
        newPassword: 'new_password',
      };

      jest.spyOn<any, any>(service as any, 'findOneWithPassword').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('old_password', 10),
      } as User);
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser as User);

      await service.changePassword('1', changePasswordDto);

      expect(compareSpy).toHaveBeenCalledWith('old_password', expect.any(String));
    });

    it('should throw UnauthorizedException if old password wrong', async () => {
      const changePasswordDto = {
        currentPassword: 'wrong_password',
        newPassword: 'new_password',
      };

      jest.spyOn<any, any>(service as any, 'findOneWithPassword').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('correct_password', 10),
      } as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should hash new password', async () => {
      const changePasswordDto = {
        currentPassword: 'old_password',
        newPassword: 'new_password',
      };

      jest.spyOn<any, any>(service as any, 'findOneWithPassword').mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('old_password', 10),
      } as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue(mockUser as User);

      await service.changePassword('1', changePasswordDto);

      expect(hashSpy).toHaveBeenCalledWith('new_password', 10);
      const savedUser = saveSpy.mock.calls[0][0];
      expect(savedUser.passwordHash).toBe('new_hashed');
    });

    it('should increment token version to revoke all refresh tokens', async () => {
      const changePasswordDto = {
        currentPassword: 'old_password',
        newPassword: 'new_password',
      };

      const userWithTokenVersion = {
        ...mockUser,
        passwordHash: await bcrypt.hash('old_password', 10),
        tokenVersion: 1,
      };
      const initialTokenVersion = userWithTokenVersion.tokenVersion;

      jest
        .spyOn<any, any>(service as any, 'findOneWithPassword')
        .mockResolvedValue(userWithTokenVersion as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue(mockUser as User);

      await service.changePassword('1', changePasswordDto);

      const savedUser = saveSpy.mock.calls[0][0];
      expect(savedUser.tokenVersion).toBe(initialTokenVersion + 1);
    });
  });

  describe('findAll', () => {
    it('should return all users in workspace', async () => {
      const users = [mockUser, { ...mockUser, id: '2' }];
      jest.spyOn(repository, 'find').mockResolvedValue(users as User[]);

      const result = await service.findAll(1, 20);

      expect(result).toHaveLength(2);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should not include deleted users', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockUser] as User[]);

      await service.findAll(1, 20);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should filter by workspace access', async () => {
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue([mockUser] as User[]);

      await service.findAll(1, 20);

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: '1',
          }),
        }),
      );
    });

    it('should handle empty result', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.findAll(1, 20);

      expect(result).toEqual([]);
    });
  });

  describe('updateMyAvatar', () => {
    it('should store new avatar url for user', async () => {
      const userWithPassword = { ...mockUser } as User;
      jest
        .spyOn<any, any>(service as any, 'findOneWithPassword')
        .mockResolvedValue(userWithPassword);
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue({
        ...userWithPassword,
        avatarUrl: '/uploads/user-avatars/avatar.png',
      } as User);

      const result = await service.updateMyAvatar('1', '/uploads/user-avatars/avatar.png');

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: '/uploads/user-avatars/avatar.png' }),
      );
      expect(result.avatarUrl).toBe('/uploads/user-avatars/avatar.png');
    });
  });
});

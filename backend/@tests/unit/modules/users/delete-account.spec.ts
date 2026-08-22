import { AuthSession } from '@/entities/auth-session.entity';
import { User } from '@/entities/user.entity';
import { WorkspaceMember } from '@/entities/workspace-member.entity';
import { Workspace } from '@/entities/workspace.entity';
import { UsersService } from '@/modules/users/users.service';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed_${value}`),
  compare: jest.fn(async (plain: string) => plain === 'correct-password'),
}));

describe('UsersService.deleteMyAccount', () => {
  let service: UsersService;
  let userRepository: {
    findOne: jest.Mock;
    softDelete: jest.Mock;
    increment: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let workspaceRepository: { find: jest.Mock };
  let workspaceMemberRepository: { count: jest.Mock };
  let authSessionRepository: { update: jest.Mock };

  const user = { id: 'u1', email: 'a@b.c', passwordHash: 'hashed_correct-password' } as User;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(async () => user),
      softDelete: jest.fn(async () => ({ affected: 1 })),
      increment: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => user),
      })),
    };
    workspaceRepository = { find: jest.fn(async () => []) };
    workspaceMemberRepository = { count: jest.fn(async () => 0) };
    authSessionRepository = { update: jest.fn(async () => ({ affected: 2 })) };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepository },
        { provide: getRepositoryToken(WorkspaceMember), useValue: workspaceMemberRepository },
        { provide: getRepositoryToken(AuthSession), useValue: authSessionRepository },
        { provide: WorkspacesService, useValue: { ensureUserWorkspace: jest.fn() } },
      ],
    }).compile();

    service = testingModule.get(UsersService);
  });

  it('refuses a wrong password and deletes nothing', async () => {
    await expect(service.deleteMyAccount('u1', 'nope')).rejects.toBeInstanceOf(ForbiddenException);

    expect(userRepository.softDelete).not.toHaveBeenCalled();
    expect(authSessionRepository.update).not.toHaveBeenCalled();
  });

  it('refuses while the user owns a workspace shared with others', async () => {
    workspaceRepository.find.mockResolvedValue([{ id: 'w1', name: 'Team books' }]);
    workspaceMemberRepository.count.mockResolvedValue(2);

    // The message has to name the workspace, otherwise the user cannot act on it.
    await expect(service.deleteMyAccount('u1', 'correct-password')).rejects.toMatchObject({
      constructor: ConflictException,
      message: expect.stringContaining('Team books'),
    });
    expect(userRepository.softDelete).not.toHaveBeenCalled();
  });

  it('allows deletion when the owned workspace has no other members', async () => {
    workspaceRepository.find.mockResolvedValueOnce([{ id: 'w1', name: 'Personal' }]);
    workspaceMemberRepository.count.mockResolvedValueOnce(0);

    await expect(service.deleteMyAccount('u1', 'correct-password')).resolves.toBeUndefined();
    expect(userRepository.softDelete).toHaveBeenCalledWith('u1');
  });

  it('revokes sessions and bumps the token version before deleting', async () => {
    await service.deleteMyAccount('u1', 'correct-password');

    // Any token that outlived the row would still authenticate.
    expect(authSessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(userRepository.increment).toHaveBeenCalledWith({ id: 'u1' }, 'tokenVersion', 1);
    expect(userRepository.softDelete).toHaveBeenCalledWith('u1');
  });
});

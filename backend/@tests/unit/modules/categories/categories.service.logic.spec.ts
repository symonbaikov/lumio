import {
  type Category,
  CategoryType,
  type User,
  type WorkspaceMember,
  WorkspaceRole,
} from '@/entities';
import { CategoriesService } from '@/modules/categories/categories.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

function createRepoMock<T extends object>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => data as T),
    remove: jest.fn(async () => undefined),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('CategoriesService', () => {
  const categoryRepository = createRepoMock<Category>();
  const userRepository = createRepoMock<User>();
  const workspaceMemberRepository = createRepoMock<WorkspaceMember>();
  const cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const auditService = { createEvent: jest.fn() } as unknown as AuditService;

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(
      categoryRepository as any,
      userRepository as any,
      workspaceMemberRepository as any,
      cacheManager as any,
      auditService as any,
    );
  });

  it('create throws ConflictException for duplicate name in workspace', async () => {
    categoryRepository.findOne = jest.fn(async () => ({ id: 'c1' }) as any);

    await expect(
      service.create('w1', 'u1', { name: 'Food', type: CategoryType.EXPENSE } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('update throws ConflictException when changing name to existing one', async () => {
    categoryRepository.findOne = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'c1',
        workspaceId: 'w1',
        userId: 'u1',
        name: 'Old',
        type: CategoryType.EXPENSE,
        isSystem: false,
      } as any)
      .mockResolvedValueOnce({
        id: 'c2',
        workspaceId: 'w1',
        userId: 'u1',
        name: 'New',
        type: CategoryType.EXPENSE,
      } as any);

    await expect(service.update('c1', 'w1', 'u1', { name: 'New' } as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('remove throws NotFoundException when category does not exist', async () => {
    categoryRepository.findOne = jest.fn(async () => null);

    await expect(service.remove('missing', 'w1', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('createSystemCategories skips existing entries from new defaults', async () => {
    categoryRepository.findOne = jest.fn(async ({ where }: any) =>
      where?.name === 'Sales' ? ({ id: 'exists' } as any) : null,
    );

    await service.createSystemCategories('w1');

    expect(categoryRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'w1', name: 'Sales' } }),
    );
    expect(categoryRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'w1', name: 'Utilities' } }),
    );
    expect(categoryRepository.save).toHaveBeenCalled();
    expect(categoryRepository.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sales' }),
    );
  });

  it('allows toggling isEnabled for system categories', async () => {
    categoryRepository.findOne = jest.fn(async () => ({
      id: 'c1',
      workspaceId: 'w1',
      userId: 'u1',
      name: 'Advertising',
      type: CategoryType.EXPENSE,
      isSystem: true,
      isEnabled: true,
    }));
    categoryRepository.save = jest.fn(async (category: any) => category);

    const result = await service.update('c1', 'w1', 'u1', { isEnabled: false } as any);

    expect(result.isEnabled).toBe(false);
    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false }),
    );
  });

  it('denies non-toggle updates for system categories', async () => {
    categoryRepository.findOne = jest.fn(async () => ({
      id: 'c1',
      workspaceId: 'w1',
      userId: 'u1',
      name: 'Advertising',
      type: CategoryType.EXPENSE,
      isSystem: true,
      isEnabled: true,
    }));

    await expect(service.update('c1', 'w1', 'u1', { name: 'Changed' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies create when member has canEditCategories=false', async () => {
    workspaceMemberRepository.findOne = jest.fn(async () => ({
      role: WorkspaceRole.MEMBER,
      permissions: { canEditCategories: false },
    }));

    await expect(
      service.create('w1', 'u1', { name: 'Food', type: CategoryType.EXPENSE } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});

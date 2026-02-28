import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { type Permission, Permission as PermissionEnum } from '@/common/enums/permissions.enum';
import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserRole } from '@/entities/user.entity';
import { WorkspaceRole } from '@/entities/workspace-member.entity';

describe('PermissionsGuard', () => {
  let testingModule: TestingModule;
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = testingModule.get<PermissionsGuard>(PermissionsGuard);
    reflector = testingModule.get<Reflector>(Reflector);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('allows workspace owner to upload statements', () => {
    const context = createMockExecutionContext({
      user: { id: 'user-1', role: UserRole.USER, permissions: null },
      workspaceRole: WorkspaceRole.OWNER,
      workspaceMemberPermissions: null,
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionEnum.STATEMENT_UPLOAD] as Permission[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows member with edit statements permission to upload statements', () => {
    const context = createMockExecutionContext({
      user: { id: 'user-2', role: UserRole.USER, permissions: null },
      workspaceRole: WorkspaceRole.MEMBER,
      workspaceMemberPermissions: { canEditStatements: true },
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionEnum.STATEMENT_UPLOAD] as Permission[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows workspace owner to view audit log', () => {
    const context = createMockExecutionContext({
      user: { id: 'user-3', role: UserRole.USER, permissions: null },
      workspaceRole: WorkspaceRole.OWNER,
      workspaceMemberPermissions: null,
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionEnum.AUDIT_VIEW] as Permission[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows workspace admin to view audit log', () => {
    const context = createMockExecutionContext({
      user: { id: 'user-4', role: UserRole.USER, permissions: null },
      workspaceRole: WorkspaceRole.ADMIN,
      workspaceMemberPermissions: null,
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionEnum.AUDIT_VIEW] as Permission[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});

function createMockExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        user: null,
        workspaceRole: undefined,
        workspaceMemberPermissions: undefined,
        ...request,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

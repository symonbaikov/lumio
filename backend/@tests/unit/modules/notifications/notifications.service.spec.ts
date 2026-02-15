import {
  Notification,
  NotificationCategory,
  NotificationPreference,
  NotificationSeverity,
  NotificationType,
  WorkspaceMember,
} from '../../../../src/entities';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => data as T),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(),
  } as any;
}

describe('NotificationsService', () => {
  const notificationRepository = createRepoMock<Notification>();
  const preferenceRepository = createRepoMock<NotificationPreference>();
  const workspaceMemberRepository = createRepoMock<WorkspaceMember>();
  const eventEmitter = { emit: jest.fn() };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      notificationRepository,
      preferenceRepository,
      workspaceMemberRepository,
      eventEmitter as any,
    );
  });

  it('creates notification when preference is enabled', async () => {
    preferenceRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      statementUploaded: true,
    } as NotificationPreference);

    notificationRepository.save.mockResolvedValue({
      id: 'notification-1',
      recipientId: 'user-1',
      type: NotificationType.STATEMENT_UPLOADED,
    } as Notification);

    const result = await service.create({
      recipientId: 'user-1',
      workspaceId: 'workspace-1',
      type: NotificationType.STATEMENT_UPLOADED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      title: 'Uploaded',
      message: 'Statement uploaded',
    });

    expect(result?.id).toBe('notification-1');
    expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ id: 'notification-1' }),
    );
  });

  it('does not create notification when preference is disabled', async () => {
    preferenceRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      statementUploaded: false,
    } as NotificationPreference);

    const result = await service.create({
      recipientId: 'user-1',
      type: NotificationType.STATEMENT_UPLOADED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      title: 'Uploaded',
      message: 'Statement uploaded',
    });

    expect(result).toBeNull();
    expect(notificationRepository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('creates default preferences when user has none', async () => {
    preferenceRepository.findOne.mockResolvedValue(null);
    preferenceRepository.save.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      statementUploaded: true,
      importCommitted: true,
      categoryChanges: true,
      memberActivity: true,
      dataDeleted: true,
      workspaceUpdated: true,
      parsingErrors: true,
      importFailures: true,
      uncategorizedItems: true,
    } as NotificationPreference);

    const prefs = await service.getPreferences('user-1');

    expect(preferenceRepository.create).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(preferenceRepository.save).toHaveBeenCalledTimes(1);
    expect(prefs.id).toBe('pref-1');
  });

  it('creates notifications for workspace members except actor', async () => {
    workspaceMemberRepository.find.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ] as WorkspaceMember[]);

    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({ id: 'n' } as Notification);

    const count = await service.createForWorkspaceMembers({
      workspaceId: 'workspace-1',
      actorId: 'user-1',
      actorName: 'Alice',
      type: NotificationType.CATEGORY_UPDATED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      title: 'Category updated',
      message: 'A category was updated',
    });

    expect(count).toBe(2);
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ recipientId: 'user-2' }),
    );
    expect(createSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ recipientId: 'user-3' }),
    );
  });
});

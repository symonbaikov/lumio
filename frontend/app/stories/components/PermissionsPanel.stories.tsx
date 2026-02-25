import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';

/**
 * PermissionsPanelContent - Pure presentational component for permissions management
 * For Storybook testing without API dependencies
 */
interface Permission {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  accessLevel: 'viewer' | 'downloader' | 'editor';
  canReshare: boolean;
  expiresAt: string | null;
  grantedBy: string;
  createdAt: string;
}

interface PermissionsPanelContentProps {
  permissions: Permission[];
  onGrantAccess?: () => void;
  onEditPermission?: (permission: Permission) => void;
  onRevokePermission?: (permissionId: string) => void;
}

function PermissionsPanelContent({
  permissions,
  onGrantAccess,
  onEditPermission,
  onRevokePermission,
}: PermissionsPanelContentProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case 'viewer':
        return 'Просмотр';
      case 'downloader':
        return 'Скачивание';
      case 'editor':
        return 'Редактор';
      default:
        return level;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      case 'downloader':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Права доступа</h3>
        {onGrantAccess && (
          <Button onClick={onGrantAccess} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Предоставить доступ
          </Button>
        )}
      </div>

      {/* Empty state */}
      {permissions.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Нет предоставленных прав</h4>
          <p className="text-sm text-gray-500 mb-4">
            Предоставьте доступ пользователям для совместной работы
          </p>
          {onGrantAccess && (
            <Button onClick={onGrantAccess} variant="outline" size="sm">
              Предоставить доступ
            </Button>
          )}
        </div>
      ) : (
        /* Permissions table */
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Права
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Может делиться
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Истекает
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Предоставил
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {permissions.map(perm => (
                <tr key={perm.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {perm.userName || perm.userEmail}
                      </div>
                      {perm.userName && (
                        <div className="text-xs text-gray-500">{perm.userEmail}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(perm.accessLevel)}`}
                    >
                      {getAccessLevelLabel(perm.accessLevel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {perm.canReshare ? 'Да' : 'Нет'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {perm.expiresAt ? formatDate(perm.expiresAt) : 'Бессрочно'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{perm.grantedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEditPermission && (
                        <button
                          onClick={() => onEditPermission(perm)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onRevokePermission && (
                        <button
                          onClick={() => onRevokePermission(perm.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Отозвать"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * GrantPermissionDialog - Dialog for granting new permission
 */
interface GrantPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGrant?: (data: {
    userIdOrEmail: string;
    accessLevel: string;
    expiresAt?: string;
    canReshare: boolean;
  }) => void;
}

function GrantPermissionDialog({ isOpen, onClose, onGrant }: GrantPermissionDialogProps) {
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('viewer');
  const [expiresAt, setExpiresAt] = useState('');
  const [canReshare, setCanReshare] = useState(false);

  const handleGrant = () => {
    onGrant?.({
      userIdOrEmail,
      accessLevel,
      expiresAt: expiresAt || undefined,
      canReshare,
    });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Предоставить доступ"
      size="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleGrant}
          cancelText="Отмена"
          confirmText="Предоставить"
          isConfirmDisabled={!userIdOrEmail}
        />
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID пользователя или Email
          </label>
          <input
            type="text"
            value={userIdOrEmail}
            onChange={e => setUserIdOrEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Уровень доступа</label>
          <select
            value={accessLevel}
            onChange={e => setAccessLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="viewer">Просмотр</option>
            <option value="downloader">Просмотр и скачивание</option>
            <option value="editor">Полный доступ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Срок действия (опционально)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Оставьте пустым для бессрочного доступа</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="canReshare"
            checked={canReshare}
            onCheckedChange={setCanReshare}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="canReshare" className="text-sm text-gray-700">
            Разрешить делиться с другими
          </label>
        </div>
      </div>
    </ModalShell>
  );
}

// Story meta
const meta: Meta<typeof PermissionsPanelContent> = {
  title: 'Components/PermissionsPanel',
  component: PermissionsPanelContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockPermissions: Permission[] = [
  {
    id: 'perm-1',
    userId: 'user-1',
    userEmail: 'ivan@example.com',
    userName: 'Иван Петров',
    accessLevel: 'editor',
    canReshare: true,
    expiresAt: null,
    grantedBy: 'Владелец',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'perm-2',
    userId: 'user-2',
    userEmail: 'maria@example.com',
    userName: 'Мария Иванова',
    accessLevel: 'downloader',
    canReshare: false,
    expiresAt: '2024-03-01T00:00:00Z',
    grantedBy: 'Иван Петров',
    createdAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'perm-3',
    userId: 'user-3',
    userEmail: 'alex@example.com',
    accessLevel: 'viewer',
    canReshare: false,
    expiresAt: null,
    grantedBy: 'Владелец',
    createdAt: '2024-01-20T09:15:00Z',
  },
];

// Default with permissions
export const Default: Story = {
  args: {
    permissions: mockPermissions,
    onGrantAccess: () => alert('Grant access clicked'),
    onEditPermission: (perm: Permission) => alert(`Edit permission: ${perm.userEmail}`),
    onRevokePermission: (id: string) => alert(`Revoke permission: ${id}`),
  },
};

// Empty state
export const Empty: Story = {
  args: {
    permissions: [],
    onGrantAccess: () => alert('Grant access clicked'),
  },
};

// Many permissions (scroll)
export const ManyPermissions: Story = {
  args: {
    permissions: [
      ...mockPermissions,
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `perm-gen-${i}`,
        userId: `user-${i + 10}`,
        userEmail: `user${i + 10}@example.com`,
        userName: `Пользователь ${i + 10}`,
        accessLevel: (['viewer', 'downloader', 'editor'] as const)[i % 3],
        canReshare: i % 2 === 0,
        expiresAt: i % 3 === 0 ? '2024-06-01T00:00:00Z' : null,
        grantedBy: 'Владелец',
        createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      })),
    ],
    onGrantAccess: () => alert('Grant access'),
    onEditPermission: (perm: Permission) => alert(`Edit: ${perm.userEmail}`),
    onRevokePermission: (id: string) => alert(`Revoke: ${id}`),
  },
};

// With grant dialog
export const WithGrantDialog: Story = {
  render: () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    return (
      <div>
        <PermissionsPanelContent
          permissions={mockPermissions}
          onGrantAccess={() => setIsDialogOpen(true)}
          onEditPermission={(perm: Permission) => alert(`Edit: ${perm.userEmail}`)}
          onRevokePermission={(id: string) => alert(`Revoke: ${id}`)}
        />
        <GrantPermissionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onGrant={data => alert(`Grant: ${JSON.stringify(data)}`)}
        />
      </div>
    );
  },
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  args: {
    permissions: mockPermissions.slice(0, 2),
    onGrantAccess: () => alert('Grant access'),
    onEditPermission: (perm: Permission) => alert(`Edit: ${perm.userEmail}`),
    onRevokePermission: (id: string) => alert(`Revoke: ${id}`),
  },
};

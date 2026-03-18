// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/components/dashboard/test-setup';

const apiGet = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({ id: 'user-1' }));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
  },
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    title: 'Categories',
    subtitle: 'Subtitle',
    add: 'Add',
    enabled: 'Enabled',
    more: 'More',
    searchPlaceholder: 'Find category',
    type: {
      label: { value: 'Type' },
      income: 'Income',
      expense: 'Expense',
    },
    toasts: {
      loadFailed: { value: 'Failed to load categories' },
      updated: { value: 'Updated' },
      created: { value: 'Created' },
      saveFailed: { value: 'Failed to save category' },
      iconUploaded: { value: 'Icon uploaded' },
      iconUploadFailed: { value: 'Icon upload failed' },
    },
    dialog: {
      editTitle: 'Edit category',
      createTitle: 'Create category',
      nameLabel: { value: 'Name' },
      placeholderName: { value: 'Category name' },
      chooseIcon: 'Choose icon',
      uploadedIcon: 'Uploaded icon',
      uploadIcon: 'Upload icon',
      chooseColor: 'Choose color',
      preview: 'Preview',
      cancel: 'Cancel',
      save: 'Save',
      uploading: 'Uploading',
    },
    sourceBadges: {
      parsing: { value: 'Parsing data' },
      system: { value: 'System' },
    },
  }),
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('WorkspaceCategoriesView', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockImplementation((url: string) => {
      if (url === '/categories') {
        return Promise.resolve({
          data: [
            {
              id: 'cat-parsing',
              name: 'Kaspi Delivery',
              type: 'expense',
              isSystem: false,
              isEnabled: true,
              source: 'parsing',
            },
            {
              id: 'cat-system',
              name: 'Taxes',
              type: 'expense',
              isSystem: true,
              isEnabled: true,
              source: 'system',
            },
          ],
        });
      }

      if (url === '/categories/usage/counts') {
        return Promise.resolve({ data: {} });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('renders parsing categories with parsing badge instead of system', async () => {
    const { default: WorkspaceCategoriesView } = await import('./WorkspaceCategoriesView');

    render(<WorkspaceCategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Kaspi Delivery')).toBeInTheDocument();
    });

    expect(screen.getByText('Parsing data')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.queryAllByText('System')).toHaveLength(1);
  });

  it('localizes system categories but keeps parsing category names raw', async () => {
    const { default: WorkspaceCategoriesView } = await import('./WorkspaceCategoriesView');

    apiGet.mockImplementation((url: string) => {
      if (url === '/categories') {
        return Promise.resolve({
          data: [
            {
              id: 'cat-system',
              name: 'Аренда',
              type: 'expense',
              isSystem: true,
              isEnabled: true,
              source: 'system',
            },
            {
              id: 'cat-parsing',
              name: 'Зарплаты сотрудникам',
              type: 'expense',
              isSystem: false,
              isEnabled: true,
              source: 'parsing',
            },
          ],
        });
      }

      if (url === '/categories/usage/counts') {
        return Promise.resolve({ data: {} });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<WorkspaceCategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    expect(screen.getByText('Зарплаты сотрудникам')).toBeInTheDocument();
    expect(screen.queryByText('Аренда')).not.toBeInTheDocument();
    expect(screen.queryByText('Payroll expenses')).not.toBeInTheDocument();
  });
});

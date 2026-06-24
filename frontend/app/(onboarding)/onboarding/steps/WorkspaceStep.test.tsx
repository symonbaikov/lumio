// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceStep } from './WorkspaceStep';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    navigation: {
      back: {
        value: {
          ru: 'Back',
          en: 'Back',
          kk: 'Back',
        },
      },
    },
    workspace: {
      title: {
        value: {
          ru: 'Set up your first workspace (RU)',
          en: 'Set up your first workspace',
          kk: 'Set up your first workspace (KK)',
        },
      },
      subtitle: {
        value: {
          ru: 'RU subtitle',
          en: 'EN subtitle',
          kk: 'KK subtitle',
        },
      },
      nameLabel: {
        value: {
          ru: 'Workspace name',
          en: 'Workspace name',
          kk: 'Workspace name',
        },
      },
      namePlaceholder: {
        value: {
          ru: 'For example: My Company workspace',
          en: 'For example: My Company workspace',
          kk: 'For example: My Company workspace',
        },
      },
      currencyHint: {
        value: {
          ru: 'RU currency hint',
          en: 'EN currency hint',
          kk: 'KK currency hint',
        },
      },
      backgroundLabel: {
        value: {
          ru: 'Workspace background',
          en: 'Workspace background',
          kk: 'Workspace background',
        },
      },
      customBackgroundLabel: {
        value: {
          ru: 'Custom image (URL)',
          en: 'Custom image (URL)',
          kk: 'Custom image (URL)',
        },
      },
      customBackgroundPlaceholder: {
        value: {
          ru: 'https://example.com/ru.jpg',
          en: 'https://example.com/en.jpg',
          kk: 'https://example.com/kk.jpg',
        },
      },
      customBackgroundHint: {
        value: {
          ru: 'English background hint',
          en: 'EN background hint',
          kk: 'English background hint',
        },
      },
    },
  }),
}));

vi.mock('@/app/(main)/workspaces/components/CurrencySelector', () => ({
  CurrencySelector: () => <div>Currency selector</div>,
}));

vi.mock('@/app/(main)/workspaces/components/BackgroundSelector', () => ({
  BackgroundSelector: () => <div>Background selector</div>,
}));

describe('WorkspaceStep localization', () => {
  it('renders labels using the selected onboarding locale instead of the active app locale', () => {
    render(
      <WorkspaceStep
        locale="en"
        workspaceName=""
        workspaceCurrency="USD"
        workspaceBackgroundImage={null}
        onWorkspaceNameChange={vi.fn()}
        onWorkspaceCurrencyChange={vi.fn()}
        onWorkspaceBackgroundImageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Set up your first workspace')).toBeTruthy();
    expect(screen.getByText('English background hint')).toBeTruthy();
    expect(screen.getByText('Workspace background')).toBeTruthy();
    expect(screen.getByText('Custom image (URL)')).toBeTruthy();
    expect(screen.getByPlaceholderText('https://example.com/en.jpg')).toBeTruthy();
    expect(screen.queryByText('Set up your first workspace (RU)')).toBeNull();
  });
});

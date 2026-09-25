import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserMenuTriggerAndDropdown } from './UserMenu';

describe('UserMenuTriggerAndDropdown', () => {
  it('focuses the first item when opened, so the keyboard can reach the menu', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);

    render(
      <UserMenuTriggerAndDropdown
        user={{ name: 'Demo User' }}
        normalizedAvatarUrl={null}
        avatarError={false}
        setAvatarError={vi.fn()}
        anchorEl={anchor}
        open
        trashLabel="Trash"
        languageLabel="English"
        userMenu={{ userActions: 'User Actions', settings: 'Settings', language: 'Language' }}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Settings' }));
    anchor.remove();
  });
});

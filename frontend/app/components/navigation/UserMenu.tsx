'use client';

import { BookOpen, Globe, LogOut, Settings, Trash2, User } from '@/app/components/icons';
import { getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { Divider, ListItemIcon, ListItemText, MenuItem, Menu as MuiMenu } from '@mui/material';
import React from 'react';
import type { NavItem } from './helpers/navigation-config';

type UserMenuProps = {
  user: { name?: string | null; email?: string | null; avatarUrl?: string | null };
  normalizedAvatarUrl: string | null;
  avatarError: boolean;
  setAvatarError: (v: boolean) => void;
  anchorEl: HTMLElement | null;
  open: boolean;
  mobile?: boolean;
  trashLabel: string;
  languageLabel: string;
  userMenu: Record<string, unknown>;
  extraNavItems?: NavItem[];
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
  onAction: (key: string) => void;
  onNavigate?: (path: string) => void;
};

// eslint-disable-next-line max-lines-per-function, complexity
export function UserMenuTriggerAndDropdown({
  user,
  normalizedAvatarUrl,
  avatarError,
  setAvatarError,
  anchorEl,
  open,
  mobile = false,
  trashLabel,
  languageLabel,
  userMenu,
  extraNavItems = [],
  onOpen,
  onClose,
  onAction,
  onNavigate,
}: UserMenuProps): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="lumio-navigation__user-menu-trigger"
        data-tour-id={mobile ? undefined : 'user-menu-trigger'}
      >
        <div className="lumio-navigation__trigger-avatar">
          {normalizedAvatarUrl && !avatarError ? (
            <img
              src={normalizedAvatarUrl}
              alt={user.name || 'User avatar'}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <User size={14} />
          )}
        </div>
        <span className="lumio-navigation__user-menu-label">{user.name}</span>
      </button>

      <MuiMenu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: mobile ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: mobile ? 'left' : 'right' }}
        PaperProps={{ sx: { width: 320, mt: 0.5 } }}
      >
        <div className="lumio-navigation__menu-title">
          {resolveLabel(getRecord(userMenu)?.userActions, 'User Actions')}
        </div>

        <Divider />

        {extraNavItems.map(item => (
          <MenuItem
            key={item.path}
            onClick={() => {
              onNavigate?.(item.path);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}

        <MenuItem
          onClick={() => {
            onAction('settings');
          }}
        >
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          <ListItemText>{userMenu.settings as React.ReactNode}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onAction('trash');
          }}
        >
          <ListItemIcon>
            <Trash2 size={18} />
          </ListItemIcon>
          <ListItemText>{trashLabel}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onAction('language');
          }}
        >
          <ListItemIcon>
            <Globe size={18} />
          </ListItemIcon>
          <ListItemText>{userMenu.language as React.ReactNode}</ListItemText>
          <span
            style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground, #64748b)',
              marginLeft: 8,
            }}
          >
            {languageLabel}
          </span>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onAction('knowledgeBase');
          }}
        >
          <ListItemIcon>
            <BookOpen size={18} />
          </ListItemIcon>
          <ListItemText>{userMenu.knowledgeBase as React.ReactNode}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            onAction('logout');
          }}
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon>
            <LogOut size={18} />
          </ListItemIcon>
          <ListItemText>{userMenu.logout as React.ReactNode}</ListItemText>
        </MenuItem>
      </MuiMenu>
    </>
  );
}

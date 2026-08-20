'use client';

import { useKeyboardShortcuts } from '@/app/hooks/use-keyboard-shortcuts';
import {
  SHORTCUT_EXPORT,
  SHORTCUT_FOCUS_SEARCH,
  SHORTCUT_OPEN_FILTERS,
} from '@/app/lib/keyboard-shortcuts';
import { STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT } from '@/app/lib/statement-expense-drawer';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';

export function KeyboardShortcutsProvider({
  children,
}: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    'Shift+d': e => {
      e.preventDefault();
      router.push('/dashboard');
    },
    'Shift+s': e => {
      e.preventDefault();
      router.push('/statements/submit');
    },
    'Shift+t': e => {
      e.preventDefault();
      router.push('/custom-tables');
    },
    'Shift+r': e => {
      e.preventDefault();
      router.push('/reports');
    },
    'Shift+w': e => {
      e.preventDefault();
      router.push('/workspaces/overview');
    },
    'Shift+/': e => {
      e.preventDefault();
      setHelpOpen(true);
    },
    'Shift+a': e => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, { detail: { mode: 'scan' } }),
      );
    },
    'Shift+f': e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(SHORTCUT_OPEN_FILTERS));
    },
    'Shift+e': e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(SHORTCUT_EXPORT));
    },
    '/': e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(SHORTCUT_FOCUS_SEARCH));
    },
  });

  return (
    <>
      {children}
      <KeyboardShortcutsModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import {
  GLOBAL_SHORTCUTS,
  STATEMENTS_SHORTCUTS,
  type ShortcutEntry,
} from '@/app/lib/keyboard-shortcuts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Kbd({ children }: { children: string }): React.JSX.Element {
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        fontWeight: 600,
        minWidth: 24,
        textAlign: 'center',
      }}
    >
      {children}
    </Box>
  );
}

function ShortcutRow({ entry }: { entry: ShortcutEntry }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2">{entry.label}</Typography>
      <Kbd>{entry.keys}</Kbd>
    </Box>
  );
}

function ShortcutGroup({
  title,
  entries,
}: { title: string; entries: ShortcutEntry[] }): React.JSX.Element {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      {entries.map(entry => (
        <ShortcutRow key={entry.keys} entry={entry} />
      ))}
    </Box>
  );
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.JSX.Element {
  const navigation = GLOBAL_SHORTCUTS.filter(s => s.category === 'navigation');
  const globalActions = GLOBAL_SHORTCUTS.filter(s => s.category === 'action');

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <Box sx={{ p: 1 }}>
        <ShortcutGroup title="Navigation" entries={navigation} />
        <ShortcutGroup title="Actions" entries={globalActions} />
        <ShortcutGroup title="Statements Page" entries={STATEMENTS_SHORTCUTS} />
      </Box>
    </ModalShell>
  );
}

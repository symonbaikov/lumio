'use client';

import { Box, Typography } from '@mui/material';
import React from 'react';
import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import type { AuditEvent } from '@/lib/api/audit';

interface RowDrawerHistoryProps {
  historyLoading: boolean;
  historyEvents: AuditEvent[];
  selectedHistoryEvent: AuditEvent | null;
  historyDrawerOpen: boolean;
  onSelectEvent: (event: AuditEvent) => void;
  onHistoryDrawerClose: () => void;
}

export function RowDrawerHistory({
  historyLoading,
  historyEvents,
  selectedHistoryEvent,
  historyDrawerOpen,
  onSelectEvent,
  onHistoryDrawerClose,
}: RowDrawerHistoryProps): React.JSX.Element {
  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {historyLoading ? (
          <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }}>
            <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              Loading history...
            </Typography>
          </Box>
        ) : (
          <EntityHistoryTimeline events={historyEvents} onSelect={onSelectEvent} />
        )}
      </Box>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={onHistoryDrawerClose}
      />
    </>
  );
}

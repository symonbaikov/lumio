'use client';

import { Box, Typography } from '@mui/material';
import { Checkbox } from '@/app/components/ui/checkbox';
import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface ColumnsVisibilityPanelProps {
  t: unknown;
  columnOrder: string[];
  orderedColumns: CustomTablePageColumn[];
  hiddenColumnKeys: string[];
  isColumnsDefault: boolean;
  toggleColumnHidden: (key: string) => void;
  resetColumns: () => void;
}

export function ColumnsVisibilityPanel({
  t,
  columnOrder,
  orderedColumns,
  hiddenColumnKeys,
  isColumnsDefault,
  toggleColumnHidden,
  resetColumns,
}: ColumnsVisibilityPanelProps) {
  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2 }, py: 2 }}>
      <Box
        sx={{
          mx: 'auto',
          width: '100%',
          maxWidth: 768,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            bgcolor: 'background.paper',
          }}
        >
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {(columnOrder.length ? columnOrder : orderedColumns.map(c => c.key)).map(key => {
              const col = orderedColumns.find(c => c.key === key);
              if (!col) {
                return null;
              }
              const isHidden = hiddenColumnKeys.includes(col.key);
              return (
                <Box
                  component="li"
                  key={col.key}
                  sx={{
                    borderBottom: '1px solid var(--border-color)',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box
                    onClick={() => toggleColumnHidden(col.key)}
                    sx={{
                      display: 'flex',
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.5, sm: 1.75 },
                      color: isHidden ? 'var(--muted-foreground)' : 'var(--foreground)',
                      '&:hover': { bgcolor: isHidden ? 'transparent' : 'var(--muted)' },
                    }}
                  >
                    <Typography
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.title || col.key}
                    </Typography>
                    <Checkbox
                      checked={!isHidden}
                      onCheckedChange={() => toggleColumnHidden(col.key)}
                      className="h-4 w-4"
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={resetColumns}
          disabled={isColumnsDefault}
          sx={{
            width: '100%',
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: 'rgba(22,129,24,0.1)',
            px: 2.5,
            py: 1.75,
            fontSize: 14,
            fontWeight: 600,
            color: 'primary.main',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(22,129,24,0.15)' },
            '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
          }}
        >
          {tx(t, ['actions', 'columnsReset'], 'Reset columns')}
        </Box>
      </Box>
    </Box>
  );
}

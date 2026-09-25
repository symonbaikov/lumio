'use client';

import { Box, Typography } from '@mui/material';
import { tokens } from '@/lib/theme-tokens';

export interface TemplateCard {
  id: string | null;
  name: string;
  description: string;
  columnCount: number;
}

interface TableTemplatePickerProps {
  cards: TemplateCard[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  columnsLabel: (count: number) => string;
}

/** Ряд карточек шаблонов в диалоге создания; первая — пустая таблица. */
export function TableTemplatePicker({
  cards,
  selectedId,
  onSelect,
  columnsLabel,
}: TableTemplatePickerProps): React.JSX.Element {
  return (
    <Box
      role="radiogroup"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 1.5,
        mb: 2,
      }}
    >
      {cards.map(card => {
        const selected = card.id === selectedId;
        return (
          <Box
            key={card.id ?? 'blank'}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(card.id)}
            sx={{
              textAlign: 'left',
              border: '1px solid',
              borderColor: selected ? 'primary.main' : 'var(--border-color)',
              bgcolor: selected ? 'rgba(22,129,24,0.08)' : 'background.paper',
              borderRadius: tokens.radius.md,
              p: 1.5,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Typography style={{ fontSize: 14, fontWeight: 600 }}>{card.name}</Typography>
            <Typography style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {card.description}
            </Typography>
            {card.columnCount > 0 && (
              <Typography style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {columnsLabel(card.columnCount)}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

'use client';

import type React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle2 } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

interface PluginCardProps {
  icon: React.ReactNode;
  name: React.ReactNode;
  description: React.ReactNode;
  enabled: boolean;
  enableLabel: React.ReactNode;
  disableLabel: React.ReactNode;
  onToggle: () => void;
  onConfigure?: () => void;
}

export function PluginCard({ icon, name, description, enabled, enableLabel, disableLabel, onToggle, onConfigure }: PluginCardProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: enabled ? 'rgba(5,150,105,0.4)' : 'var(--border-color, #e5e7eb)',
        borderRadius: tokens.radius.lg,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        backgroundColor: 'var(--card-bg, #fff)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: tokens.radius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)',
            color: '#7c3aed',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {name}
          </Typography>
        </Box>
        {enabled && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: tokens.radius.sm,
              backgroundColor: 'rgba(5,150,105,0.1)',
              color: '#059669',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={12} />
            Active
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {description}
      </Typography>

      {enabled && onConfigure ? (
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
          <button type="button" onClick={onConfigure} style={{
            padding: '8px 12px',
            borderRadius: tokens.radius.md,
            border: '1px solid var(--border-color, #e5e7eb)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Configure
          </button>
          <button type="button" onClick={onToggle} style={{
            padding: '8px 16px',
            borderRadius: tokens.radius.md,
            border: '1px solid #dc2626',
            background: 'transparent',
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            {disableLabel}
          </button>
        </Box>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          style={{
            marginTop: 'auto',
            padding: '8px 16px',
            borderRadius: tokens.radius.md,
            border: enabled ? '1px solid #dc2626' : '1px solid var(--primary, #059669)',
            background: enabled ? 'transparent' : 'var(--primary, #059669)',
            color: enabled ? '#dc2626' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            alignSelf: 'flex-start',
          }}
        >
          {enabled ? disableLabel : enableLabel}
        </button>
      )}
    </Box>
  );
}

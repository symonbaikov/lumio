'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, X } from '@/app/components/icons';
import { insightHref } from '@/app/components/insights/insight-href';
import { type Insight, useInsights } from '@/app/hooks/useInsights';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';

const bodySx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  flexGrow: 1,
  minWidth: 0,
} as const;

type AlertBannerItemProps = {
  item: Insight;
  openLabel: string;
  dismissLabel: string;
  onDismiss: () => void;
};

function AlertBannerItem({
  item,
  openLabel,
  dismissLabel,
  onDismiss,
}: AlertBannerItemProps): React.JSX.Element {
  const isCritical = item.severity === 'critical';
  const href = insightHref(item);
  const body = (
    <>
      <AlertTriangle
        size={16}
        color={isCritical ? tokens.color.danger : tokens.color.warning}
        style={{ flexShrink: 0 }}
      />
      {/* Title and message on one line: a slim strip that doesn't outshout the page heading. */}
      <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box component="span" sx={{ fontWeight: 600 }}>
          {item.title}
        </Box>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {' · '}
          {item.message}
        </Box>
      </Typography>
      {href === null ? null : <ArrowRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />}
    </>
  );

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pl: 1.5,
        pr: 0.5,
        py: 0.5,
        // Quiet by design: the soft tint of the severity colour and a hairline
        // of it, instead of a saturated fill and border.
        border: '1px solid',
        borderColor: alpha(isCritical ? tokens.color.danger : tokens.color.warning, 0.25),
        borderRadius: tokens.radius.sm,
        bgcolor: theme =>
          theme.palette.mode === 'dark'
            ? isCritical
              ? tokens.dark.color.dangerSoft
              : tokens.dark.color.warningSoft
            : isCritical
              ? tokens.color.dangerSoft
              : tokens.color.warningSoft,
      }}
    >
      {/* The body is a link and the dismiss button its sibling, never its
          child: nesting them would be invalid markup and would swallow the
          dismiss click on the way to the route. */}
      {href === null ? (
        <Box sx={bodySx}>{body}</Box>
      ) : (
        // A plain link, not ButtonBase: the light theme gives every ButtonBase
        // an !important muted hover fill (_globals.scss), which covered the
        // banner's own tint. The keyboard ring comes from _focus.scss.
        <Box
          component={Link}
          href={href}
          aria-label={`${item.title}. ${openLabel}`}
          sx={{
            ...bodySx,
            color: 'inherit',
            textDecoration: 'none',
            borderRadius: tokens.radius.sm,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {body}
        </Box>
      )}
      <IconButton size="small" aria-label={dismissLabel} onClick={onDismiss}>
        <X size={16} />
      </IconButton>
    </Box>
  );
}

/**
 * Urgent insights, shown above the page content wherever the user happens to
 * be. Advisory ones are deliberately not here — they live on the Advice page,
 * so a banner appearing always means something actually needs attention.
 */
export function AlertBanner(): React.JSX.Element | null {
  const t = useIntlayer('insights');
  const { items, dismiss } = useInsights({ severities: ['warn', 'critical'] });

  if (items.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 3, pt: 2 }}>
      {items.map(item => (
        <AlertBannerItem
          key={item.id}
          item={item}
          openLabel={t.openLabel.value}
          dismissLabel={t.dismiss.value}
          onDismiss={() => dismiss(item.id)}
        />
      ))}
    </Box>
  );
}

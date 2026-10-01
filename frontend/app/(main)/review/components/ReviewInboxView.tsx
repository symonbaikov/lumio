'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { formatAmount, formatDate } from '@/app/components/transactions/helpers/transactionFormatters';
import { Alert } from '@/app/components/ui/alert';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Select } from '@/app/components/ui/select';
import { useKeyboardShortcuts } from '@/app/hooks/use-keyboard-shortcuts';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useIntlayer, useLocale } from '@/app/i18n';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import { tokens } from '@/lib/theme-tokens';
import type { UseReviewInboxResult } from '../hooks/useReviewInbox';
import {
  groupByPayee,
  REVIEW_INBOX_KINDS,
  type ReviewInboxItem,
  type ReviewInboxKind,
} from '../lib/review-inbox-model';

const SWIPE_THRESHOLD_PX = 80;

function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''));
}

type Props = { state: UseReviewInboxResult };

// eslint-disable-next-line max-lines-per-function, complexity
export function ReviewInboxView({ state }: Props) {
  const t = useIntlayer('reviewInbox');
  const drawer = useIntlayer('transactionsDrawer');
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const [grouped, setGrouped] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const categorySelectRef = useRef<HTMLDivElement | null>(null);

  const {
    kind,
    setKind,
    items,
    page,
    categories,
    selected,
    toggle,
    selectIds,
    clearSelection,
    cursor,
    setCursor,
    move,
    busy,
    approve,
  } = state;

  const sourceLabels: Record<string, string> = {
    manual: drawer.categorySource.manual.value,
    rule: drawer.categorySource.rule.value,
    keyword: drawer.categorySource.keyword.value,
    learned: drawer.categorySource.learned.value,
    history: drawer.categorySource.history.value,
    ai: drawer.categorySource.ai.value,
    default: drawer.categorySource.default.value,
  };
  const issueLabels: Record<string, string> = {
    missing_amount: t.issueMissingAmount.value,
    missing_date: t.issueMissingDate.value,
    potential_duplicate: t.issuePotentialDuplicate.value,
  };
  const tabLabels: Record<ReviewInboxKind, string> = {
    transaction: t.tabTransactions.value,
    receipt: t.tabReceipts.value,
    duplicate: t.tabDuplicates.value,
    subscription: t.tabSubscriptions.value,
  };

  const categoryOptions = useMemo(
    () => [
      { value: '', label: t.categoryPlaceholder.value },
      ...categories
        .filter(category => category.isEnabled !== false)
        .map(category => ({ value: category.id, label: getCategoryDisplayName(category, locale) })),
    ],
    [categories, locale, t.categoryPlaceholder.value],
  );

  const groups = useMemo(() => (grouped ? groupByPayee(items) : null), [grouped, items]);
  const orderedItems = useMemo(
    () => (groups ? groups.flatMap(group => group.items) : items),
    [groups, items],
  );

  const approveWithCategory = useCallback(
    (ids?: string[]) => {
      void approve(categoryId || undefined, ids);
    },
    [approve, categoryId],
  );

  useKeyboardShortcuts(
    {
      j: () => move(1),
      k: () => move(-1),
      x: () => {
        const current = orderedItems[cursor];
        if (current) toggle(current.id);
      },
      a: () => {
        if (kind === 'transaction') approveWithCategory();
      },
      c: () => {
        categorySelectRef.current?.querySelector<HTMLElement>('[role="combobox"], select')?.focus();
      },
      Escape: () => clearSelection(),
    },
    !busy,
  );

  const renderTransaction = (item: Extract<ReviewInboxItem, { kind: 'transaction' }>) => (
    <>
      <Typography variant="body2" fontWeight={600} noWrap title={item.counterpartyName}>
        {item.counterpartyName}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap title={item.paymentPurpose}>
        {formatDate(item.date, locale)} · {item.paymentPurpose}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
        {item.categoryName ? (
          <Chip size="small" label={item.categoryName} />
        ) : (
          <Chip size="small" variant="outlined" label={sourceLabels.default} />
        )}
        {item.categorySource && (
          <Chip
            size="small"
            variant="outlined"
            label={`${sourceLabels[item.categorySource] ?? item.categorySource}${
              item.categoryReason ? ` · ${item.categoryReason}` : ''
            }`}
          />
        )}
      </Box>
    </>
  );

  const renderRow = (item: ReviewInboxItem, index: number) => {
    const isCursor = index === cursor;
    const isSelected = selected.has(item.id);
    const amount =
      'amount' in item && item.amount !== null
        ? formatAmount(item.amount, ('currency' in item && item.currency) || 'KZT', locale)
        : '—';

    let body: React.ReactNode;
    let actions: React.ReactNode;
    if (item.kind === 'transaction') {
      body = renderTransaction(item);
      actions = (
        <Button size="small" variant="outlined" disabled={busy} onClick={() => approveWithCategory([item.id])}>
          {categoryId ? t.approveWithCategory.value : t.approveAsIs.value}
        </Button>
      );
    } else if (item.kind === 'duplicate') {
      body = (
        <>
          <Typography variant="body2" fontWeight={600} noWrap>
            {item.counterpartyName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(item.date, locale)} · {t.duplicateOf.value}{' '}
            {item.duplicateOfId ? item.duplicateOfId.slice(0, 8) : '—'}
            {item.confidence !== null
              ? ` · ${fill(t.confidence.value, { value: Math.round(item.confidence * 100) })}`
              : ''}
          </Typography>
        </>
      );
      actions = (
        <>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => void state.resolveDuplicate(item.id, 'keep')}>
            {t.keep.value}
          </Button>
          <Button size="small" disabled={busy} onClick={() => void state.resolveDuplicate(item.id, 'confirm')}>
            {t.confirmDuplicate.value}
          </Button>
        </>
      );
    } else if (item.kind === 'receipt') {
      body = (
        <>
          <Typography variant="body2" fontWeight={600} noWrap>
            {item.vendor ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.date ? formatDate(item.date, locale) : '—'} ·{' '}
            {item.issues.map(issue => issueLabels[issue] ?? issue).join(', ')}
          </Typography>
        </>
      );
      actions = (
        <>
          <Button size="small" variant="outlined" component={Link} href={`/storage/receipts/${item.id}`}>
            {t.openReceipt.value}
          </Button>
          <Button size="small" disabled={busy || item.amount === null} onClick={() => void state.approveReceipt(item.id)}>
            {t.approveReceipt.value}
          </Button>
        </>
      );
    } else {
      body = (
        <>
          <Typography variant="body2" fontWeight={600} noWrap>
            {item.vendorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.frequency}
            {item.nextChargeDate ? ` · ${formatDate(item.nextChargeDate, locale)}` : ''}
            {item.confidence !== null
              ? ` · ${fill(t.confidence.value, { value: Math.round(item.confidence * 100) })}`
              : ''}
          </Typography>
        </>
      );
      actions = (
        <>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => void state.decideSubscription(item.id, 'dismiss')}>
            {t.dismissSubscription.value}
          </Button>
          <Button size="small" disabled={busy} onClick={() => void state.decideSubscription(item.id, 'confirm')}>
            {t.confirmSubscription.value}
          </Button>
        </>
      );
    }

    const row = (
      <Box
        key={item.id}
        data-testid="review-row"
        data-cursor={isCursor ? 'true' : undefined}
        onClick={() => setCursor(index)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isCursor ? 'action.hover' : 'transparent',
          outline: isCursor ? '2px solid var(--color-primary, currentColor)' : 'none',
          outlineOffset: -2,
        }}
      >
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={() => toggle(item.id)}
          onClick={event => event.stopPropagation()}
          inputProps={{ 'aria-label': item.id }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>{body}</Box>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {amount}
        </Typography>
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }} onClick={event => event.stopPropagation()}>
            {actions}
          </Box>
        )}
      </Box>
    );

    if (!isMobile) return row;
    return (
      <SwipeableRow
        key={item.id}
        disabled={busy || item.kind !== 'transaction'}
        onApprove={() => approveWithCategory([item.id])}
        onSkip={() => move(1)}
      >
        {row}
        {item.kind !== 'transaction' && (
          <Box sx={{ display: 'flex', gap: 1, px: 1.5, pb: 1, justifyContent: 'flex-end' }}>
            {actions}
          </Box>
        )}
      </SwipeableRow>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" fontWeight={700}>
        {t.title.value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {t.subtitle.value}
      </Typography>

      <Tabs
        value={kind}
        onChange={(_event, next: ReviewInboxKind) => setKind(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {REVIEW_INBOX_KINDS.map(entry => (
          <Tab
            key={entry}
            value={entry}
            label={`${tabLabels[entry]}${page ? ` · ${page.counts[entry]}` : ''}`}
          />
        ))}
      </Tabs>

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        {kind !== 'subscription' && (
          <>
            <CustomDatePicker value={state.from} onChange={state.setFrom} label={t.dateFrom.value} />
            <CustomDatePicker value={state.to} onChange={state.setTo} label={t.dateTo.value} />
          </>
        )}
        <FormControlLabel
          control={<Switch size="small" checked={grouped} onChange={event => setGrouped(event.target.checked)} />}
          label={t.groupByPayee.value}
        />
        {!isMobile && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {t.shortcuts.value}
          </Typography>
        )}
        {isMobile && kind === 'transaction' && (
          <Typography variant="caption" color="text.secondary">
            {t.swipeHint.value}
          </Typography>
        )}
      </Box>

      {kind === 'transaction' && (
        <Box
          data-testid="review-bulk-bar"
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
            p: 1.5,
            mb: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: tokens.radius.md,
            bgcolor: 'background.paper',
          }}
        >
          <Button size="small" variant="text" onClick={() => selectIds(items.map(item => item.id))}>
            {t.selectAll.value}
          </Button>
          <Typography variant="body2" sx={{ minWidth: 100 }}>
            {fill(t.selected.value, { count: selected.size })}
          </Typography>
          <Box ref={categorySelectRef} sx={{ minWidth: 220 }}>
            <Select id="review-category" value={categoryId} onChange={setCategoryId} options={categoryOptions} />
          </Box>
          <Button
            size="small"
            variant="contained"
            disabled={busy || !categoryId || (selected.size === 0 && cursor < 0)}
            onClick={() => approveWithCategory()}
          >
            {t.approveWithCategory.value}
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={busy || (selected.size === 0 && cursor < 0)}
            onClick={() => void approve(undefined)}
          >
            {t.approveAsIs.value}
          </Button>
        </Box>
      )}

      {state.isPending ? (
        <Box sx={{ display: 'grid', gap: 1 }}>
          {['a', 'b', 'c'].map(key => (
            <Skeleton key={key} variant="rounded" height={56} />
          ))}
        </Box>
      ) : orderedItems.length === 0 ? (
        <EmptyState illustration="notifications" title={t.empty.value} compact />
      ) : groups ? (
        groups.map(group => {
          const start = orderedItems.indexOf(group.items[0]);
          return (
            <Box key={group.payee} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5 }}>
                <Typography variant="subtitle2">
                  {group.payee} · {group.items.length}
                </Typography>
                <Button size="small" variant="text" onClick={() => selectIds(group.items.map(item => item.id))}>
                  {t.selectGroup.value}
                </Button>
              </Box>
              {group.items.map((item, offset) => renderRow(item, start + offset))}
            </Box>
          );
        })
      ) : (
        orderedItems.map((item, index) => renderRow(item, index))
      )}
    </Box>
  );
}

/** Right past the threshold approves, left skips; anything shorter snaps back. */
function SwipeableRow({
  children,
  disabled,
  onApprove,
  onSkip,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onApprove: () => void;
  onSkip: () => void;
}) {
  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);

  return (
    <Box
      data-testid="swipe-row"
      onTouchStart={event => {
        if (disabled) return;
        startX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchMove={event => {
        if (startX.current === null) return;
        setDx((event.touches[0]?.clientX ?? startX.current) - startX.current);
      }}
      onTouchEnd={() => {
        if (startX.current === null) return;
        if (dx > SWIPE_THRESHOLD_PX) onApprove();
        else if (dx < -SWIPE_THRESHOLD_PX) onSkip();
        startX.current = null;
        setDx(0);
      }}
      sx={{
        transform: `translateX(${dx}px)`,
        transition: dx === 0 ? 'transform 150ms ease-out' : 'none',
        bgcolor:
          dx > SWIPE_THRESHOLD_PX
            ? 'var(--color-success-soft-bg, transparent)'
            : dx < -SWIPE_THRESHOLD_PX
              ? 'action.hover'
              : 'transparent',
      }}
    >
      {children}
    </Box>
  );
}

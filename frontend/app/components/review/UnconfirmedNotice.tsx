'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type React from 'react';
import { Alert } from '@/app/components/ui/alert';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import { useIntlayer } from '@/app/i18n';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import { resolveLabel } from '@/app/lib/side-panel-utils';

type ReviewInboxCounts = { total: number };

/**
 * Only confirmed rows count in Lumio's numbers. Where numbers are shown, say
 * how much is still waiting in Review, so a total is never silently partial.
 * Shares the `review-inbox` key prefix: a decision in Review refreshes it.
 */
export function UnconfirmedNotice({
  style,
}: {
  style?: React.CSSProperties;
}): React.JSX.Element | null {
  const t = useIntlayer('unconfirmedNotice');
  const workspaceId = useWorkspaceId();
  const { data } = useQuery({
    queryKey: queryKeys.reviewInboxCounts(workspaceId),
    queryFn: ({ signal }) => apiQuery<ReviewInboxCounts>({ url: '/review-inbox/counts', signal }),
    enabled: Boolean(workspaceId),
  });

  const total = data?.total ?? 0;
  if (total <= 0) {
    return null;
  }
  const message = resolveLabel(
    t?.message,
    "{{count}} items aren't confirmed yet and aren't counted here.",
  ).replace('{{count}}', String(total));

  return (
    <Alert role="status" data-testid="unconfirmed-notice" style={style}>
      {message} <Link href="/review">{resolveLabel(t?.action, 'Review')}</Link>
    </Alert>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

type ReviewInboxCounts = { total: number };

/**
 * How many items wait in Review. Shares the `review-inbox` key prefix, so a
 * decision in Review refreshes every place that shows it.
 */
export function useReviewInboxTotal(enabled = true): number {
  const workspaceId = useWorkspaceId();
  const { data } = useQuery({
    queryKey: queryKeys.reviewInboxCounts(workspaceId),
    queryFn: ({ signal }) => apiQuery<ReviewInboxCounts>({ url: '/review-inbox/counts', signal }),
    enabled: enabled && Boolean(workspaceId),
  });
  return data?.total ?? 0;
}

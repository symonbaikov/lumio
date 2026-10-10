import { getQueryClient } from './query-client';

/**
 * Marks every list of documents stale after one of them changed on its own
 * page: the statements list, the scanned/emailed receipts merged into it, and
 * the Review queue. Without it a list visited again within the 30 s staleTime
 * shows the old category or the deleted row until its next poll.
 */
export function invalidateDocumentLists(): void {
  const queryClient = getQueryClient();
  void queryClient.invalidateQueries({ queryKey: ['statements'] });
  void queryClient.invalidateQueries({ queryKey: ['gmail-receipts'] });
  void queryClient.invalidateQueries({ queryKey: ['review-inbox'] });
}

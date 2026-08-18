type FilterableSubscription = {
  vendorName: string;
  ownerId?: string | null;
  category?: { name: string } | null;
  riskStatus?: string | null;
};

export function filterSubscriptions<T extends FilterableSubscription>(
  subscriptions: T[],
  filters: { search: string; ownerId: string; categoryId: string; riskStatus: string },
): T[] {
  const search = filters.search.trim().toLowerCase();
  return subscriptions.filter(subscription => {
    if (search && !subscription.vendorName.toLowerCase().includes(search)) return false;
    if (filters.ownerId && subscription.ownerId !== filters.ownerId) return false;
    if (filters.categoryId && subscription.category?.name !== filters.categoryId) return false;
    if (filters.riskStatus && subscription.riskStatus !== filters.riskStatus) return false;
    return true;
  });
}

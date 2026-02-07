export function toggleStatementSelection(selectedIds: string[], statementId: string): string[] {
  if (selectedIds.includes(statementId)) {
    return selectedIds.filter(id => id !== statementId);
  }

  return [...selectedIds, statementId];
}

export function areAllVisibleSelected(selectedIds: string[], visibleIds: string[]): boolean {
  if (visibleIds.length === 0) return false;
  const selectedSet = new Set(selectedIds);
  return visibleIds.every(id => selectedSet.has(id));
}

export function toggleSelectAllVisible(
  selectedIds: string[],
  visibleIds: string[],
  checked: boolean,
): string[] {
  if (checked) {
    return Array.from(new Set([...selectedIds, ...visibleIds]));
  }

  const visibleSet = new Set(visibleIds);
  return selectedIds.filter(id => !visibleSet.has(id));
}

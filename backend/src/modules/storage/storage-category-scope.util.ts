type CategoryWhere = {
  id: string;
  userId?: string | null;
  workspaceId?: string | null;
};

export function buildStorageCategoryWhere(
  categoryId: string,
  statementUserId: string,
  statementWorkspaceId: string | null,
): CategoryWhere[] {
  if (statementWorkspaceId) {
    return [
      {
        id: categoryId,
        workspaceId: statementWorkspaceId,
      },
    ];
  }

  return [
    {
      id: categoryId,
      userId: statementUserId,
    },
    {
      id: categoryId,
      userId: null,
      workspaceId: null,
    },
  ];
}

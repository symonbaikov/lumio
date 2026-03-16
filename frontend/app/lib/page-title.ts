const PRODUCT_TITLE = 'Lumio — Bank statement processing';

const TITLES_BY_PREFIX: Array<[string, string]> = [
  ['/dashboard', 'Lumio — Dashboard'],
  ['/statements/spend-over-time', 'Lumio — Spend over time'],
  ['/statements/top-spenders', 'Lumio — Top spenders'],
  ['/statements/top-merchants', 'Lumio — Top merchants'],
  ['/statements/top-categories', 'Lumio — Top categories'],
  ['/statements/unapproved-cash', 'Lumio — Unapproved cash'],
  ['/statements', 'Lumio — Statements'],
  ['/tables', 'Lumio — Tables'],
  ['/workspaces/members', 'Lumio — Workspace members'],
  ['/workspaces/categories', 'Lumio — Workspace categories'],
  ['/workspaces/overview', 'Lumio — Workspace overview'],
  ['/workspaces/list', 'Lumio — Workspaces'],
  ['/workspaces', 'Lumio — Workspaces'],
  ['/reports', 'Lumio — Reports'],
  ['/audit', 'Lumio — Audit log'],
  ['/settings', 'Lumio — Settings'],
];

export const resolvePageTitle = (pathname: string) => {
  const normalized = pathname.trim();
  if (!normalized || normalized === '/') return PRODUCT_TITLE;

  const exactMatch = TITLES_BY_PREFIX.find(([prefix]) => normalized === prefix);
  if (exactMatch) return exactMatch[1];

  const prefixMatch = TITLES_BY_PREFIX.find(([prefix]) =>
    normalized.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
  );

  return prefixMatch?.[1] ?? PRODUCT_TITLE;
};

export { PRODUCT_TITLE };

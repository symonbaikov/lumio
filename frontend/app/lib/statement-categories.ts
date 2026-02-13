export interface StatementCategoryNode {
  id: string;
  name: string;
  children?: StatementCategoryNode[];
}

export interface StatementCategoryOption {
  id: string;
  name: string;
}

export const flattenStatementCategories = (
  categories: StatementCategoryNode[],
  prefix = '',
): StatementCategoryOption[] => {
  return categories.flatMap(category => {
    const currentName = prefix ? `${prefix} / ${category.name}` : category.name;
    return [
      { id: category.id, name: currentName },
      ...(category.children ? flattenStatementCategories(category.children, currentName) : []),
    ];
  });
};

export const filterStatementCategories = (
  categories: StatementCategoryNode[],
  query: string,
): StatementCategoryOption[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const flattened = flattenStatementCategories(categories);

  if (!normalizedQuery) {
    return flattened;
  }

  return flattened.filter(category => category.name.toLowerCase().includes(normalizedQuery));
};

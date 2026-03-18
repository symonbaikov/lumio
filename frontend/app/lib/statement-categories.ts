export type StatementCategorySource = 'system' | 'user' | 'parsing';

export interface StatementCategoryNode {
  id: string;
  name: string;
  source?: StatementCategorySource;
  isSystem?: boolean;
  children?: StatementCategoryNode[];
}

export interface StatementCategoryOption {
  id: string;
  name: string;
  source?: StatementCategorySource;
  isSystem?: boolean;
}

type SupportedLocale = 'ru' | 'en' | 'kk';

type CategoryLabels = {
  ru: string;
  en: string;
  kk: string;
};

const SYSTEM_CATEGORY_TRANSLATIONS: Record<string, CategoryLabels> = {
  Продажи: { ru: 'Продажи', en: 'Sales', kk: 'Сатылымдар' },
  Услуги: { ru: 'Услуги', en: 'Services', kk: 'Қызметтер' },
  'Процентный доход': { ru: 'Процентный доход', en: 'Interest income', kk: 'Пайыздық табыс' },
  'Прочий доход': { ru: 'Прочий доход', en: 'Other income', kk: 'Өзге табыс' },
  Реклама: { ru: 'Реклама', en: 'Advertising', kk: 'Жарнама' },
  'Льготы и компенсации': {
    ru: 'Льготы и компенсации',
    en: 'Benefits and compensation',
    kk: 'Жеңілдіктер мен өтемақылар',
  },
  'Автомобильные расходы': {
    ru: 'Автомобильные расходы',
    en: 'Vehicle expenses',
    kk: 'Көлік шығындары',
  },
  Оборудование: { ru: 'Оборудование', en: 'Equipment', kk: 'Жабдық' },
  'Комиссии и сборы': {
    ru: 'Комиссии и сборы',
    en: 'Fees and charges',
    kk: 'Комиссиялар мен алымдар',
  },
  'Домашний офис': { ru: 'Домашний офис', en: 'Home office', kk: 'Үй кеңсесі' },
  Страхование: { ru: 'Страхование', en: 'Insurance', kk: 'Сақтандыру' },
  Проценты: { ru: 'Проценты', en: 'Interest', kk: 'Пайыздар' },
  'Оплата труда': { ru: 'Оплата труда', en: 'Payroll', kk: 'Еңбекақы' },
  'Обслуживание и ремонт': {
    ru: 'Обслуживание и ремонт',
    en: 'Maintenance and repairs',
    kk: 'Қызмет көрсету және жөндеу',
  },
  Материалы: { ru: 'Материалы', en: 'Materials', kk: 'Материалдар' },
  'Питание и представительские расходы': {
    ru: 'Питание и представительские расходы',
    en: 'Meals and entertainment',
    kk: 'Тамақтану және өкілдік шығыстар',
  },
  'Канцелярские товары': {
    ru: 'Канцелярские товары',
    en: 'Office supplies',
    kk: 'Кеңсе тауарлары',
  },
  'Прочие расходы': { ru: 'Прочие расходы', en: 'Other expenses', kk: 'Өзге шығыстар' },
  'Профессиональные услуги': {
    ru: 'Профессиональные услуги',
    en: 'Professional services',
    kk: 'Кәсіби қызметтер',
  },
  Аренда: { ru: 'Аренда', en: 'Rent', kk: 'Жалға алу' },
  Налоги: { ru: 'Налоги', en: 'Taxes', kk: 'Салықтар' },
  Командировки: { ru: 'Командировки', en: 'Travel', kk: 'Іссапарлар' },
  'Коммунальные услуги': {
    ru: 'Коммунальные услуги',
    en: 'Utilities',
    kk: 'Коммуналдық қызметтер',
  },
  'Логистика и доставка': {
    ru: 'Логистика и доставка',
    en: 'Logistics and delivery',
    kk: 'Логистика және жеткізу',
  },
  'Маркетинг и реклама': {
    ru: 'Маркетинг и реклама',
    en: 'Marketing and advertising',
    kk: 'Маркетинг және жарнама',
  },
  'IT услуги': { ru: 'IT услуги', en: 'IT services', kk: 'IT қызметтері' },
  'Комиссии банка': {
    ru: 'Комиссии банка',
    en: 'Bank fees',
    kk: 'Банк комиссиялары',
  },
  'Комиссии Kaspi': { ru: 'Комиссии Kaspi', en: 'Kaspi fees', kk: 'Kaspi комиссиялары' },
  'Продажи Kaspi': { ru: 'Продажи Kaspi', en: 'Kaspi sales', kk: 'Kaspi сатылымдары' },
  'Платежи Kaspi Red': {
    ru: 'Платежи Kaspi Red',
    en: 'Kaspi Red payments',
    kk: 'Kaspi Red төлемдері',
  },
  'Зарплаты сотрудникам': {
    ru: 'Зарплаты сотрудникам',
    en: 'Payroll expenses',
    kk: 'Қызметкерлердің жалақысы',
  },
  'Оплата услуг': { ru: 'Оплата услуг', en: 'Service payments', kk: 'Қызмет ақылары' },
  'Закупки товаров': {
    ru: 'Закупки товаров',
    en: 'Inventory purchases',
    kk: 'Тауар сатып алу',
  },
  'Кредиты и займы': {
    ru: 'Кредиты и займы',
    en: 'Loans and borrowings',
    kk: 'Несиелер мен қарыздар',
  },
  'Внутренние переводы': {
    ru: 'Внутренние переводы',
    en: 'Internal transfers',
    kk: 'Ішкі аударымдар',
  },
  Приход: { ru: 'Приход', en: 'Income', kk: 'Кіріс' },
  'Без категории': { ru: 'Без категории', en: 'Uncategorized', kk: 'Санатсыз' },
  Uncategorized: { ru: 'Без категории', en: 'Uncategorized', kk: 'Санатсыз' },
};

const TRANSLATION_LOOKUP = new Map(
  Object.values(SYSTEM_CATEGORY_TRANSLATIONS).flatMap(labels => [
    [labels.ru.toLowerCase(), labels] as const,
    [labels.en.toLowerCase(), labels] as const,
    [labels.kk.toLowerCase(), labels] as const,
  ]),
);

const resolveSupportedLocale = (locale: string): SupportedLocale => {
  const normalized = locale.trim().toLowerCase();
  if (normalized.startsWith('kk')) return 'kk';
  if (normalized.startsWith('en')) return 'en';
  return 'ru';
};

const shouldLocalizeCategory = (category: Pick<StatementCategoryNode, 'source' | 'isSystem'>) =>
  category.isSystem === true || category.source === 'system';

export const localizeStatementCategoryName = (name: string, locale: string): string => {
  const normalized = name.trim().toLowerCase();
  const labels = TRANSLATION_LOOKUP.get(normalized);
  if (!labels) {
    return name;
  }

  return labels[resolveSupportedLocale(locale)];
};

export const getCategoryDisplayName = (
  category: Pick<StatementCategoryNode, 'name' | 'source' | 'isSystem'>,
  locale: string,
): string => {
  if (!shouldLocalizeCategory(category)) {
    return category.name;
  }

  return localizeStatementCategoryName(category.name, locale);
};

export const flattenStatementCategories = (
  categories: StatementCategoryNode[],
  prefix = '',
  locale = 'ru',
): StatementCategoryOption[] => {
  return categories.flatMap(category => {
    const localizedName = getCategoryDisplayName(category, locale);
    const currentName = prefix ? `${prefix} / ${localizedName}` : localizedName;
    return [
      {
        id: category.id,
        name: currentName,
        source: category.source,
        isSystem: category.isSystem,
      },
      ...(category.children
        ? flattenStatementCategories(category.children, currentName, locale)
        : []),
    ];
  });
};

export const filterStatementCategories = (
  categories: StatementCategoryNode[],
  query: string,
  locale = 'ru',
): StatementCategoryOption[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const flattened = flattenStatementCategories(categories, '', locale);

  if (!normalizedQuery) {
    return flattened;
  }

  return flattened.filter(category => category.name.toLowerCase().includes(normalizedQuery));
};

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTablesPage',
  content: {
    header: {
      title: t({ ru: 'Таблицы', en: 'Tables', kk: 'Кестелер' }),
      subtitle: t({
        ru: 'Пользовательские таблицы внутри Lumio (в т.ч. импорт из Google Sheets).',
        en: 'Custom tables inside Lumio (including Google Sheets import).',
        kk: 'Lumio ішіндегі пайдаланушы кестелері (Google Sheets импортын қоса).',
      }),
    },
    searchPlaceholder: t({
      ru: 'Поиск таблиц...',
      en: 'Search tables...',
      kk: 'Кестелерді іздеу...',
    }),
    auth: {
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      loginRequired: t({
        ru: 'Войдите в систему, чтобы просматривать таблицы.',
        en: 'Log in to view tables.',
        kk: 'Кестелерді көру үшін жүйеге кіріңіз.',
      }),
    },
    actions: {
      create: t({ ru: 'Создать', en: 'Create', kk: 'Құру' }),
      open: t({ ru: 'Открыть', en: 'Open', kk: 'Ашу' }),
      importTable: t({
        ru: 'Импорт таблицы',
        en: 'Import table',
        kk: 'Кестені импорттау',
      }),
      fromStatement: t({
        ru: 'Из выписки',
        en: 'From statement',
        kk: 'Үзіндіден',
      }),
      importGoogleSheets: t({
        ru: 'Импорт из Google Sheets',
        en: 'Import from Google Sheets',
        kk: 'Google Sheets-тен импорт',
      }),
      close: t({ ru: 'Закрыть', en: 'Close', kk: 'Жабу' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      previous: t({ ru: 'Предыдущая', en: 'Previous', kk: 'Алдыңғы' }),
      next: t({ ru: 'Следующая', en: 'Next', kk: 'Келесі' }),
    },
    sources: {
      label: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
      googleSheets: t({
        ru: 'Google Sheets',
        en: 'Google Sheets',
        kk: 'Google Sheets',
      }),
      manual: t({ ru: 'Вручную', en: 'Manual', kk: 'Қолмен' }),
    },
    filters: {
      all: t({ ru: 'Все', en: 'All', kk: 'Барлығы' }),
      fromStatement: t({ ru: 'Из выписки', en: 'From statement', kk: 'Үзіндіден' }),
      sortUpdated: t({ ru: 'Последние изменения', en: 'Recent updates', kk: 'Соңғы өзгерістер' }),
      sortName: t({ ru: 'По названию', en: 'By name', kk: 'Атауы бойынша' }),
      sort: t({ ru: 'Сортировка', en: 'Sort', kk: 'Сұрыптау' }),
      filters: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      apply: t({ ru: 'Применить', en: 'Apply', kk: 'Қолдану' }),
      reset: t({ ru: 'Сбросить', en: 'Reset', kk: 'Қалпына келтіру' }),
      resetFilters: t({
        ru: 'Сбросить фильтры',
        en: 'Reset filters',
        kk: 'Сүзгілерді қалпына келтіру',
      }),
      viewResults: t({ ru: 'Показать', en: 'View results', kk: 'Нәтижені көру' }),
      saveSearch: t({ ru: 'Сохранить поиск', en: 'Save search', kk: 'Іздеуді сақтау' }),
      any: t({ ru: 'Любой', en: 'Any', kk: 'Кез келген' }),
      drawerTitle: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      drawerGeneral: t({ ru: 'Основное', en: 'General', kk: 'Негізгі' }),
    },
    sidePanel: {
      subtitle: t({ ru: 'Обзор', en: 'Overview', kk: 'Шолу' }),
      todoTitle: t({ ru: 'К выполнению', en: 'To-do', kk: 'Аяқтау керек' }),
      accountingTitle: t({ ru: 'Бухгалтерия', en: 'Accounting', kk: 'Бухгалтерия' }),
      insightsTitle: t({ ru: 'Инсайты', en: 'Insights', kk: 'Инсайттар' }),
      allTables: t({ ru: 'Все таблицы', en: 'All tables', kk: 'Барлық кестелер' }),
      sourceOverview: t({
        ru: 'Обзор источников',
        en: 'Sources overview',
        kk: 'Дереккөздер шолуы',
      }),
      noData: t({ ru: 'Нет данных', en: 'No data', kk: 'Дерек жоқ' }),
      createTable: t({ ru: 'Создать таблицу', en: 'Create table', kk: 'Кесте құру' }),
      openMenu: t({
        ru: 'Открыть действия таблиц',
        en: 'Open table actions',
        kk: 'Кесте әрекеттерін ашу',
      }),
    },
    columns: {
      name: t({ ru: 'Название таблицы', en: 'Table name', kk: 'Кесте атауы' }),
      source: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
      updatedAt: t({ ru: 'Обновлено', en: 'Updated', kk: 'Жаңартылды' }),
      actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    },
    pagination: {
      shown: t({
        ru: 'Показано {from}–{to} из {count}',
        en: 'Showing {from}–{to} of {count}',
        kk: '{from}–{to} / {count} көрсетілді',
      }),
      previous: t({ ru: 'Предыдущая', en: 'Previous', kk: 'Алдыңғы' }),
      next: t({ ru: 'Следующая', en: 'Next', kk: 'Келесі' }),
      pageOf: t({
        ru: 'Страница {page} из {count}',
        en: 'Page {page} of {count}',
        kk: '{page} / {count} бет',
      }),
    },
    empty: t({
      ru: 'Таблиц пока нет. Создайте первую таблицу или импортируйте из Google Sheets.',
      en: 'No tables yet. Create your first table or import from Google Sheets.',
      kk: 'Әзірше кестелер жоқ. Бірінші кестені құрыңыз немесе Google Sheets-тен импорттаңыз.',
    }),
    loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
    toasts: {
      loadTablesFailed: t({
        ru: 'Не удалось загрузить таблицы',
        en: 'Failed to load tables',
        kk: 'Кестелерді жүктеу мүмкін болмады',
      }),
      loadStatementsFailed: t({
        ru: 'Не удалось загрузить выписки',
        en: 'Failed to load statements',
        kk: 'Үзінділерді жүктеу мүмкін болмады',
      }),
      created: t({
        ru: 'Таблица создана',
        en: 'Table created',
        kk: 'Кесте құрылды',
      }),
      createFailed: t({
        ru: 'Не удалось создать таблицу',
        en: 'Failed to create table',
        kk: 'Кесте құру мүмкін болмады',
      }),
      selectAtLeastOneStatement: t({
        ru: 'Выберите хотя бы одну выписку',
        en: 'Select at least one statement',
        kk: 'Кемінде бір үзіндіні таңдаңыз',
      }),
      createdFromStatement: t({
        ru: 'Таблица создана из выписки',
        en: 'Table created from statements',
        kk: 'Кесте үзіндіден құрылды',
      }),
      createFromStatementFailed: t({
        ru: 'Не удалось создать таблицу из выписки',
        en: 'Failed to create table from statements',
        kk: 'Үзіндіден кесте құру мүмкін болмады',
      }),
      deleting: t({ ru: 'Удаление...', en: 'Deleting...', kk: 'Жойылуда...' }),
      deleted: t({
        ru: 'Таблица удалена',
        en: 'Table deleted',
        kk: 'Кесте жойылды',
      }),
      deleteFailed: t({
        ru: 'Не удалось удалить таблицу',
        en: 'Failed to delete table',
        kk: 'Кестені жою мүмкін болмады',
      }),
    },
    create: {
      title: t({ ru: 'Новая таблица', en: 'New table', kk: 'Жаңа кесте' }),
      name: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
      namePlaceholder: t({
        ru: 'Например: Реестр платежей',
        en: 'e.g. Payments registry',
        kk: 'Мысалы: Төлемдер тізілімі',
      }),
      description: t({ ru: 'Описание', en: 'Description', kk: 'Сипаттама' }),
      descriptionPlaceholder: t({
        ru: 'Опционально',
        en: 'Optional',
        kk: 'Міндетті емес',
      }),
      category: t({
        ru: 'Категория (иконка/цвет)',
        en: 'Category (icon/color)',
        kk: 'Санат (иконка/түс)',
      }),
      noCategory: t({ ru: 'Без категории', en: 'No category', kk: 'Санатсыз' }),
      categoryHint: t({
        ru: 'Иконка/цвет будут взяты из категории',
        en: 'Icon/color will be taken from category',
        kk: 'Иконка/түс санаттан алынады',
      }),
      creating: t({ ru: 'Создание...', en: 'Creating...', kk: 'Құрылуда...' }),
    },
    createFromStatements: {
      title: t({
        ru: 'Создать таблицу из выписки',
        en: 'Create table from statements',
        kk: 'Үзіндіден кесте құру',
      }),
      nameOptional: t({
        ru: 'Название (опционально)',
        en: 'Name (optional)',
        kk: 'Атауы (міндетті емес)',
      }),
      namePlaceholder: t({
        ru: 'Например: Платежи из выписки',
        en: 'e.g. Payments from statement',
        kk: 'Мысалы: Үзіндідегі төлемдер',
      }),
      descriptionOptional: t({
        ru: 'Описание (опционально)',
        en: 'Description (optional)',
        kk: 'Сипаттама (міндетті емес)',
      }),
      descriptionPlaceholder: t({
        ru: 'Опционально',
        en: 'Optional',
        kk: 'Міндетті емес',
      }),
      statements: t({ ru: 'Выписки', en: 'Statements', kk: 'Үзінділер' }),
      statementsLoading: t({
        ru: 'Загрузка...',
        en: 'Loading...',
        kk: 'Жүктелуде...',
      }),
      statementsEmpty: t({
        ru: 'Нет выписок',
        en: 'No statements',
        kk: 'Үзінділер жоқ',
      }),
      hint: t({
        ru: 'Доступны только обработанные выписки с транзакциями',
        en: 'Only processed statements with transactions are available',
        kk: 'Тек транзакциялары бар өңделген үзінділер қолжетімді',
      }),
      creating: t({ ru: 'Создание...', en: 'Creating...', kk: 'Құрылуда...' }),
    },
    confirmDelete: {
      title: t({
        ru: 'Удалить таблицу?',
        en: 'Delete table?',
        kk: 'Кестені жою керек пе?',
      }),
      messageWithNamePrefix: t({
        ru: 'Таблица “',
        en: 'Table “',
        kk: 'Кесте “',
      }),
      messageWithNameSuffix: t({
        ru: '” будет удалена вместе со всеми строками и колонками.',
        en: '” will be deleted along with all rows and columns.',
        kk: '” барлық жолдармен және бағандармен бірге жойылады.',
      }),
      messageNoName: t({
        ru: 'Таблица будет удалена вместе со всеми строками и колонками.',
        en: 'The table will be deleted along with all rows and columns.',
        kk: 'Кесте барлық жолдармен және бағандармен бірге жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
  },
} satisfies Dictionary;

export default content;

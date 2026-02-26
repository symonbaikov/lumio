import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTablesPage',
  content: {
    header: {
      title: t({ ru: 'Таблицы', en: 'Tables', kk: 'Кестелер' }),
      subtitle: t({
        ru: 'Создавайте и управляйте структурированными таблицами из выписок и чеков для бухгалтерии и отчетности.',
        en: 'Export and manage structured tables created from statements and receipts for accounting and reporting.',
        kk: 'Бухгалтерия және есеп беру үшін үзінділер мен чектерден жасалған құрылымдалған кестелерді басқарыңыз.',
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
      createExportTable: t({
        ru: 'Создать экспортную таблицу',
        en: 'Create export table',
        kk: 'Экспорт кестесін құру',
      }),
      createFirstExportTable: t({
        ru: 'Создать первую экспортную таблицу',
        en: 'Create your first export table',
        kk: 'Бірінші экспорт кестесін құру',
      }),
      open: t({ ru: 'Открыть', en: 'Open', kk: 'Ашу' }),
      export: t({ ru: 'Экспорт', en: 'Export', kk: 'Экспорт' }),
      exportCsv: t({ ru: 'CSV', en: 'CSV', kk: 'CSV' }),
      exportXlsx: t({ ru: 'XLSX', en: 'XLSX', kk: 'XLSX' }),
      updateData: t({ ru: 'Обновить данные', en: 'Update data', kk: 'Деректерді жаңарту' }),
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
    fromLabel: t({ ru: 'Источник', en: 'From', kk: 'Көзі' }),
    growthHint: t({
      ru: 'Вы можете создать несколько экспортных таблиц для разных отчетов или периодов.',
      en: 'You can create multiple export tables for different reports or periods.',
      kk: 'Әртүрлі есептер мен кезеңдер үшін бірнеше экспорт кестесін жасай аласыз.',
    }),
    namingHint: t({
      ru: 'Используйте понятные имена: Расходы экспорт - Feb 2026, VAT reconciliation - Q1, Bank statements export.',
      en: 'Try clear names: Expenses export - Feb 2026, VAT reconciliation - Q1, Bank statements export.',
      kk: 'Түсінікті атауларды қолданыңыз: Expenses export - Feb 2026, VAT reconciliation - Q1, Bank statements export.',
    }),
    columns: {
      name: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
      purpose: t({ ru: 'Назначение / тип', en: 'Purpose / Type', kk: 'Мақсаты / түрі' }),
      source: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
      rows: t({ ru: 'Строки', en: 'Rows', kk: 'Жолдар' }),
      updatedAt: t({ ru: 'Обновлено', en: 'Last updated', kk: 'Соңғы жаңарту' }),
      actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    },
    ctaDescription: t({
      ru: 'Создайте таблицу, сопоставив поля из выписок или чеков для экспорта в Excel или бухгалтерские системы.',
      en: 'Create a table by mapping fields from statements or receipts for export to Excel or accounting systems.',
      kk: 'Excel немесе бухгалтерлік жүйелерге экспорттау үшін үзінділер мен чектер өрістерін сәйкестендіріп кесте құрыңыз.',
    }),
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
    empty: {
      title: t({
        ru: 'Пока нет экспортных таблиц',
        en: 'No export tables yet',
        kk: 'Экспорт кестелері әлі жоқ',
      }),
      description: t({
        ru: 'Создайте таблицу для бухгалтерского экспорта из выписок и чеков.',
        en: 'Create a table for accounting exports from statements and receipts.',
        kk: 'Үзінділер мен чектерден бухгалтерлік экспортқа арналған кесте жасаңыз.',
      }),
      step1: t({
        ru: '1. Выберите выписки или чеки для включения',
        en: '1. Select statements or receipts to include',
        kk: '1. Қосу үшін үзінділерді немесе чектерді таңдаңыз',
      }),
      step2: t({
        ru: '2. Выберите поля: дата, сумма, контрагент, категория, НДС',
        en: '2. Pick fields: date, amount, merchant, category, VAT',
        kk: '2. Өрістерді таңдаңыз: күні, сома, мерчант, санат, ҚҚС',
      }),
      step3: t({
        ru: '3. Сформируйте структуру таблицы',
        en: '3. Create the table structure',
        kk: '3. Кесте құрылымын жасаңыз',
      }),
      step4: t({
        ru: '4. Экспортируйте в Excel и обновляйте данные в любой момент',
        en: '4. Export to Excel or refresh anytime',
        kk: '4. Excel-ге экспорттаңыз немесе кез келген уақытта жаңартыңыз',
      }),
    },
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
      step1: t({
        ru: 'Шаг 1 - Выбор выписок',
        en: 'Step 1 - Select statements',
        kk: '1-қадам - Үзінділерді таңдау',
      }),
      step2: t({
        ru: 'Шаг 2 - Параметры таблицы',
        en: 'Step 2 - Table details',
        kk: '2-қадам - Кесте параметрлері',
      }),
      stepCounter: t({
        ru: 'Шаг {current} из {total}',
        en: 'Step {current} of {total}',
        kk: '{total} қадамның {current}-қадамы',
      }),
      step1Description: t({
        ru: 'Выберите выписки для таблицы: используйте поиск, фильтр и группировку.',
        en: 'Choose statements for the table using search, filters, and grouping.',
        kk: 'Кестеге үзінділерді таңдаңыз: іздеу, сүзгі және топтауды қолданыңыз.',
      }),
      step2Description: t({
        ru: 'Укажите детали таблицы и проверьте предварительный результат перед созданием.',
        en: 'Set table details and review the result before creating the table.',
        kk: 'Кесте деректерін толтырып, құру алдында нәтижені тексеріңіз.',
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
      searchPlaceholder: t({
        ru: 'Поиск по файлу, источнику или периоду',
        en: 'Search by file, source, or period',
        kk: 'Файл, дереккөз немесе кезең бойынша іздеу',
      }),
      sourceFilter: t({
        ru: 'Источник',
        en: 'Source',
        kk: 'Дереккөз',
      }),
      sourceAll: t({
        ru: 'Все источники',
        en: 'All sources',
        kk: 'Барлық дереккөздер',
      }),
      groupBy: t({
        ru: 'Группировать по',
        en: 'Group by',
        kk: 'Топтау',
      }),
      groupBySource: t({
        ru: 'Источнику',
        en: 'Source',
        kk: 'Дереккөз',
      }),
      groupByPeriod: t({
        ru: 'Периоду',
        en: 'Period',
        kk: 'Кезең',
      }),
      sourceLabel: t({
        ru: 'Источник',
        en: 'Source',
        kk: 'Дереккөз',
      }),
      periodLabel: t({
        ru: 'Период',
        en: 'Period',
        kk: 'Кезең',
      }),
      fileLabel: t({
        ru: 'Файл',
        en: 'File',
        kk: 'Файл',
      }),
      rowsLabel: t({
        ru: 'Строки',
        en: 'Rows',
        kk: 'Жолдар',
      }),
      selectedLabel: t({
        ru: 'Выбрано: {count}',
        en: 'Selected: {count}',
        kk: 'Таңдалды: {count}',
      }),
      duplicateUploads: t({
        ru: 'Дубли загрузок: {count} (используется последняя)',
        en: 'Duplicate uploads: {count} (latest is used)',
        kk: 'Қайталанған жүктеулер: {count} (соңғысы қолданылады)',
      }),
      noSearchResults: t({
        ru: 'По текущему фильтру выписки не найдены',
        en: 'No statements match the current filters',
        kk: 'Ағымдағы сүзгі бойынша үзінділер табылмады',
      }),
      previewTitle: t({
        ru: 'Предпросмотр',
        en: 'Preview',
        kk: 'Алдын ала қарау',
      }),
      previewSummary: t({
        ru: 'Вы создаете таблицу из {statements} выписок',
        en: 'You are creating a table from {statements} statements',
        kk: '{statements} үзіндіден кесте құрып жатырсыз',
      }),
      previewRows: t({
        ru: 'Итого строк: {rows}',
        en: 'Total rows: {rows}',
        kk: 'Жалпы жол саны: {rows}',
      }),
      previewEditable: t({
        ru: 'Вы можете изменить выбор выписок на шаге 1.',
        en: 'You can still change statement selection on Step 1.',
        kk: 'Үзінді таңдауын 1-қадамда өзгерте аласыз.',
      }),
      next: t({
        ru: 'Далее',
        en: 'Next',
        kk: 'Келесі',
      }),
      back: t({
        ru: 'Назад',
        en: 'Back',
        kk: 'Артқа',
      }),
      createWithRows: t({
        ru: 'Создать ({rows} строк)',
        en: 'Create ({rows} rows)',
        kk: 'Құру ({rows} жол)',
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

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'dashboardPage',
  content: {
    title: t({
      ru: 'Дашборд',
      en: 'Dashboard',
      kk: 'Дашборд',
    }),
    subtitle: t({
      ru: 'Последние 30 дней',
      en: 'Last 30 days',
      kk: 'Соңғы 30 күн',
    }),
    workspaceFallback: t({
      ru: 'Рабочее пространство',
      en: 'Workspace',
      kk: 'Жұмыс кеңістігі',
    }),
    snapshot: {
      totalBalance: t({ ru: 'Баланс', en: 'Total balance', kk: 'Баланс' }),
      income: t({ ru: 'Доход (30д)', en: 'Income (30d)', kk: 'Түсім (30к)' }),
      expense: t({ ru: 'Расход (30д)', en: 'Expense (30d)', kk: 'Шығыс (30к)' }),
      netFlow: t({ ru: 'Net flow', en: 'Net flow', kk: 'Net flow' }),
      toPay: t({ ru: 'К оплате', en: 'To pay', kk: 'Төлеу керек' }),
      overdue: t({ ru: 'Просрочено', en: 'Overdue', kk: 'Мерзімі өтті' }),
    },
    actions: {
      title: t({ ru: 'Требуют действия', en: 'Action required', kk: 'Әрекет қажет' }),
      empty: t({
        ru: 'Нет срочных действий',
        en: 'All clear — no actions required',
        kk: 'Шұғыл әрекеттер жоқ',
      }),
    },
    cashFlow: {
      title: t({ ru: 'Cash flow', en: 'Cash flow', kk: 'Cash flow' }),
      empty: t({
        ru: 'Нет данных по cash flow за 30 дней',
        en: 'No cash flow data for the last 30 days',
        kk: 'Соңғы 30 күнде cash flow деректері жоқ',
      }),
    },
    categories: {
      title: t({
        ru: 'Статьи расходов',
        en: 'Expense categories',
        kk: 'Шығыс санаттары',
      }),
      empty: t({
        ru: 'Нет данных по категориям расходов',
        en: 'No expense category data',
        kk: 'Шығыс санаттары бойынша дерек жоқ',
      }),
    },
    activity: {
      title: t({ ru: 'Последние действия', en: 'Recent activity', kk: 'Соңғы әрекеттер' }),
      empty: t({ ru: 'Нет активности', en: 'No recent activity', kk: 'Белсенділік жоқ' }),
    },
    notifications: {
      title: t({
        ru: 'Важные уведомления',
        en: 'Important notifications',
        kk: 'Маңызды хабарламалар',
      }),
      empty: t({
        ru: 'Нет новых уведомлений',
        en: 'No new notifications',
        kk: 'Жаңа хабарламалар жоқ',
      }),
      settings: t({
        ru: 'Настройки уведомлений',
        en: 'Notification settings',
        kk: 'Хабарлама баптаулары',
      }),
    },
    latestStatements: {
      title: t({
        ru: 'Последние выписки',
        en: 'Latest statements',
        kk: 'Соңғы үзінділер',
      }),
      empty: t({
        ru: 'Выписок пока нет',
        en: 'No statements yet',
        kk: 'Үзінділер әлі жоқ',
      }),
    },
    latestReceipts: {
      title: t({
        ru: 'Последние чеки',
        en: 'Latest receipts',
        kk: 'Соңғы чектер',
      }),
      empty: t({
        ru: 'Чеков пока нет',
        en: 'No receipts yet',
        kk: 'Чектер әлі жоқ',
      }),
    },
    refresh: {
      idle: t({
        ru: 'Потяните, чтобы обновить',
        en: 'Pull to refresh',
        kk: 'Жаңарту үшін тартыңыз',
      }),
      ready: t({
        ru: 'Отпустите для обновления',
        en: 'Release to refresh',
        kk: 'Жаңарту үшін жіберіңіз',
      }),
      loading: t({ ru: 'Обновляем...', en: 'Refreshing...', kk: 'Жаңартылуда...' }),
    },
    error: {
      load: t({
        ru: 'Не удалось загрузить дашборд',
        en: 'Failed to load dashboard',
        kk: 'Дашборд жүктелмеді',
      }),
    },
    range: {
      '7d': t({ ru: '7 дней', en: '7d', kk: '7 күн' }),
      '30d': t({ ru: '30 дней', en: '30d', kk: '30 күн' }),
      '90d': t({ ru: '90 дней', en: '90d', kk: '90 күн' }),
    },
    tabs: {
      overview: t({ ru: 'Обзор', en: 'Overview', kk: 'Шолу' }),
      trends: t({ ru: 'Тренды', en: 'Trends', kk: 'Трендтер' }),
      dataHealth: t({ ru: 'Качество данных', en: 'Data Health', kk: 'Деректер сапасы' }),
    },
    quickActions: {
      upload: t({ ru: 'Загрузить / Распарсить', en: 'Upload / Parse', kk: 'Жүктеу / Талдау' }),
      review: t({ ru: 'Очередь на проверку', en: 'Review queue', kk: 'Тексеру кезегі' }),
      export: t({ ru: 'Экспорт', en: 'Export', kk: 'Экспорт' }),
    },
    greeting: {
      fallbackName: t({ ru: 'Пользователь', en: 'User', kk: 'Қолданушы' }),
      empty: {
        title: t({
          ru: 'Добро пожаловать, {name}',
          en: 'Welcome, {name}',
          kk: 'Қош келдіңіз, {name}',
        }),
        subtitle: t({
          ru: 'Загрузите первую выписку, чтобы начать финансовый обзор',
          en: 'Upload your first statement to start building your financial overview',
          kk: 'Қаржылық шолуды бастау үшін алғашқы үзіндіні жүктеңіз',
        }),
      },
      pendingReview: {
        title: t({
          ru: 'С возвращением, {name}',
          en: 'Welcome back, {name}',
          kk: 'Қайта оралдыңыз, {name}',
        }),
        subtitle: t({
          ru: 'У вас {count} транзакций ждут проверки',
          en: 'You have {count} transactions waiting for review',
          kk: '{count} транзакция тексеруді күтеді',
        }),
      },
      stale: {
        title: t({
          ru: 'Добрый вечер, {name}',
          en: 'Good evening, {name}',
          kk: 'Қайырлы кеш, {name}',
        }),
        subtitle: t({
          ru: 'За последние {days} дней не было новых импортов',
          en: 'No new statements have been imported in the last {days} days',
          kk: 'Соңғы {days} күнде жаңа импорт болмады',
        }),
      },
      upToDate: {
        title: t({
          ru: 'С возвращением, {name}',
          en: 'Welcome back, {name}',
          kk: 'Қайта оралдыңыз, {name}',
        }),
        subtitle: t({
          ru: 'Последние импорты обработаны и актуальны',
          en: 'Your latest imports are processed and up to date',
          kk: 'Соңғы импорттар өңделіп, актуалды',
        }),
      },
    },
    statusHeading: {
      error: t({ ru: 'Данные недоступны', en: 'Data unavailable', kk: 'Деректер қолжетімсіз' }),
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      empty: t({ ru: 'Данных пока нет', en: 'No data yet', kk: 'Деректер әлі жоқ' }),
      overdue: t({ ru: 'Просрочки', en: 'Overdue payments', kk: 'Мерзімі өткен' }),
      needsReview: t({ ru: 'Ждёт проверки', en: 'Needs review', kk: 'Тексеру керек' }),
      parsingIssues: t({
        ru: 'Ошибки парсинга',
        en: 'Parsing issues',
        kk: 'Талдау қателері',
      }),
      uncategorized: t({
        ru: 'Без категорий',
        en: 'Uncategorized items',
        kk: 'Санатталмаған',
      }),
      stale: t({ ru: 'Данные устарели', en: 'Data is stale', kk: 'Деректер ескірді' }),
      negativeFlow: t({
        ru: 'Отрицательный поток',
        en: 'Negative cash flow',
        kk: 'Теріс ағын',
      }),
      positiveFlow: t({
        ru: 'Положительный поток',
        en: 'Positive cash flow',
        kk: 'Оң ақша ағыны',
      }),
      breakEven: t({
        ru: 'Период баланса',
        en: 'Break-even period',
        kk: 'Тепе-теңдік кезеңі',
      }),
      allClear: t({ ru: 'Всё хорошо', en: 'All good', kk: 'Бәрі жақсы' }),
    },
    dataHealth: {
      uncategorized: t({ ru: 'Без категории', en: 'Uncategorized', kk: 'Санатсыз' }),
      errors: t({ ru: 'Ошибки', en: 'Errors', kk: 'Қателер' }),
      pendingReview: t({ ru: 'На проверке', en: 'Pending review', kk: 'Тексеруде' }),
      parsingWarnings: t({ ru: 'Предупреждения', en: 'Parsing warnings', kk: 'Ескертулер' }),
      balanceOk: t({ ru: 'Баланс сведён', en: 'Balance is balanced', kk: 'Баланс теңестірілген' }),
      balanceWarning: t({
        ru: 'Баланс не сведён',
        en: 'Balance mismatch',
        kk: 'Баланс сәйкес емес',
      }),
      noBalance: t({ ru: 'Баланс не настроен', en: 'No balance sheet', kk: 'Баланс жоқ' }),
      lastUpload: t({ ru: 'Последняя загрузка', en: 'Last upload', kk: 'Соңғы жүктеу' }),
      unapprovedCash: t({ ru: 'Неподтверждённые', en: 'Unapproved cash', kk: 'Расталмаған' }),
    },
    trends: {
      dailyTrend: t({ ru: 'Ежедневный тренд', en: 'Daily trend', kk: 'Күнделікті тренд' }),
      categories: t({ ru: 'Категории расходов', en: 'Expense categories', kk: 'Шығыс санаттары' }),
      counterparties: t({
        ru: 'Доход по контрагентам',
        en: 'Income by counterparty',
        kk: 'Контрагент бойынша түсім',
      }),
      sources: t({ ru: 'Источники данных', en: 'Data sources', kk: 'Деректер көздері' }),
    },
    topMerchants: {
      title: t({ ru: 'Топ поставщиков', en: 'Top merchants', kk: 'Топ жеткізушілер' }),
      empty: t({
        ru: 'Нет данных по поставщикам',
        en: 'No merchant data',
        kk: 'Жеткізушілер деректері жоқ',
      }),
    },
    topCategories: {
      title: t({ ru: 'Топ категорий', en: 'Top categories', kk: 'Топ санаттар' }),
      empty: t({
        ru: 'Нет данных по категориям',
        en: 'No category data',
        kk: 'Санаттар деректері жоқ',
      }),
    },
    emptyState: {
      title: t({
        ru: 'Добро пожаловать в ваш дашборд',
        en: 'Welcome to your dashboard',
        kk: 'Дашбордыңызға қош келдіңіз',
      }),
      description: t({
        ru: 'Начните с первых документов или расходов, чтобы увидеть живую картину финансов.',
        en: 'Add your first documents or expenses to see real financial activity here.',
        kk: 'Қаржылық белсенділікті көру үшін алғашқы құжаттарды немесе шығындарды қосыңыз.',
      }),
      upload: t({
        ru: 'Загрузить первую выписку',
        en: 'Upload your first statement',
        kk: 'Алғашқы үзіндіні жүктеу',
      }),
      gmail: t({
        ru: 'Подключить Gmail',
        en: 'Connect Gmail',
        kk: 'Gmail қосу',
      }),
      manual: t({
        ru: 'Добавить расход вручную',
        en: 'Add manual expense',
        kk: 'Қолмен шығын қосу',
      }),
      step1Label: t({
        ru: 'Загрузите выписку или добавьте расход',
        en: 'Upload a statement or add an expense',
        kk: 'Үзінді жүктеп немесе шығын қосыңыз',
      }),
      step2Label: t({
        ru: 'Мы автоматически распарсим и категоризируем',
        en: 'We auto-parse and categorize your data',
        kk: 'Деректеріңізді автоматты талдаймыз',
      }),
      step3Label: t({
        ru: 'Анализируйте финансы в реальном времени',
        en: 'Analyze your finances in real time',
        kk: 'Қаржыны нақты уақытта талдаңыз',
      }),
    },
  },
} satisfies Dictionary;

export default content;

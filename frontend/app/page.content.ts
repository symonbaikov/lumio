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
    quickActions: {
      upload: t({ ru: 'Загрузить документ', en: 'Upload document', kk: 'Құжат жүктеу' }),
      payment: t({ ru: 'Создать платеж', en: 'Create payment', kk: 'Төлем жасау' }),
      expense: t({ ru: 'Добавить расход', en: 'Add manual expense', kk: 'Шығын қосу' }),
    },
    refresh: {
      idle: t({ ru: 'Потяните, чтобы обновить', en: 'Pull to refresh', kk: 'Жаңарту үшін тартыңыз' }),
      ready: t({ ru: 'Отпустите для обновления', en: 'Release to refresh', kk: 'Жаңарту үшін жіберіңіз' }),
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

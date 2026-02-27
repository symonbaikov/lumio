import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'adminPage',
  content: {
    title: t({
      ru: 'Административная панель',
      en: 'Admin panel',
      kk: 'Әкімшілік панелі',
    }),
    tabs: {
      statementsLog: t({
        ru: 'Журнал выписок',
        en: 'Statements log',
        kk: 'Үзінділер журналы',
      }),
      users: t({
        ru: 'Управление пользователями',
        en: 'User management',
        kk: 'Пайдаланушыларды басқару',
      }),
      audit: t({
        ru: 'Аудит-лог',
        en: 'Audit log',
        kk: 'Аудит журналы',
      }),
    },
    errors: {
      loadStatements: t({
        ru: 'Ошибка загрузки выписок',
        en: 'Failed to load statements',
        kk: 'Үзінділерді жүктеу қатесі',
      }),
      loadAudit: t({
        ru: 'Ошибка загрузки аудит-лога',
        en: 'Failed to load audit log',
        kk: 'Аудит журналын жүктеу қатесі',
      }),
      reprocess: t({
        ru: 'Ошибка повторной обработки',
        en: 'Failed to reprocess',
        kk: 'Қайта өңдеу қатесі',
      }),
      delete: t({
        ru: 'Ошибка удаления выписки',
        en: 'Failed to delete statement',
        kk: 'Үзіндіні жою қатесі',
      }),
    },
    confirmDelete: t({
      ru: 'Вы уверены, что хотите удалить эту выписку?',
      en: 'Are you sure you want to delete this statement?',
      kk: 'Осы үзіндіні жойғыңыз келетініне сенімдісіз бе?',
    }),
    status: {
      completed: t({ ru: 'Завершено', en: 'Completed', kk: 'Аяқталды' }),
      processing: t({ ru: 'Обрабатывается', en: 'Processing', kk: 'Өңделуде' }),
      error: t({ ru: 'Ошибка', en: 'Error', kk: 'Қате' }),
    },
    search: t({
      ru: 'Поиск',
      en: 'Search',
      kk: 'Іздеу',
    }),
    refresh: t({
      ru: 'Обновить',
      en: 'Refresh',
      kk: 'Жаңарту',
    }),
    table: {
      file: t({ ru: 'Файл', en: 'File', kk: 'Файл' }),
      type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      bank: t({ ru: 'Банк', en: 'Bank', kk: 'Банк' }),
      status: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      transactions: t({ ru: 'Операций', en: 'Transactions', kk: 'Операциялар' }),
      uploadedAt: t({ ru: 'Дата загрузки', en: 'Upload date', kk: 'Жүктеу күні' }),
      processedAt: t({ ru: 'Дата обработки', en: 'Processed at', kk: 'Өңделген күні' }),
      actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    },
    usersTab: {
      hint: t({
        ru: 'Перейдите на страницу управления пользователями для настройки прав доступа.',
        en: 'Go to the user management page to configure access permissions.',
        kk: 'Қол жеткізу құқықтарын баптау үшін пайдаланушыларды басқару бетіне өтіңіз.',
      }),
      button: t({
        ru: 'Управление пользователями',
        en: 'Manage users',
        kk: 'Пайдаланушыларды басқару',
      }),
    },
    auditTab: {
      empty: t({
        ru: 'Пока записей нет',
        en: 'No entries yet',
        kk: 'Әзірге жазбалар жоқ',
      }),
      title: t({
        ru: 'Аудит-лог',
        en: 'Audit log',
        kk: 'Аудит журналы',
      }),
      helper: t({
        ru: 'Отслеживайте действия в рабочем пространстве и откаты.',
        en: 'Track workspace activity and rollbacks.',
        kk: 'Жұмыс кеңістігіндегі әрекеттер мен қайтаруларды бақылаңыз.',
      }),
      action: t({ ru: 'Действие', en: 'Action', kk: 'Әрекет' }),
      description: t({ ru: 'Описание', en: 'Description', kk: 'Сипаттама' }),
      user: t({ ru: 'Пользователь', en: 'User', kk: 'Пайдаланушы' }),
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      loading: t({
        ru: 'Загрузка событий аудита...',
        en: 'Loading audit events...',
        kk: 'Аудит оқиғалары жүктелуде...',
      }),
      filters: {
        title: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
        all: t({ ru: 'Все', en: 'All', kk: 'Барлығы' }),
        entityType: t({
          ru: 'Тип сущности',
          en: 'Entity Type',
          kk: 'Мән түрі',
        }),
        user: t({ ru: 'Пользователь', en: 'User', kk: 'Пайдаланушы' }),
        action: t({ ru: 'Действие', en: 'Action', kk: 'Әрекет' }),
        entityId: t({
          ru: 'ID сущности',
          en: 'Entity ID',
          kk: 'Мән ID',
        }),
        severity: t({
          ru: 'Серьезность',
          en: 'Severity',
          kk: 'Маңыздылық',
        }),
        dateFrom: t({
          ru: 'Дата от',
          en: 'Date From',
          kk: 'Күні бастап',
        }),
        dateTo: t({
          ru: 'Дата до',
          en: 'Date To',
          kk: 'Күні дейін',
        }),
      },
    },
    errorDialog: {
      title: t({ ru: 'Детали ошибки', en: 'Error details', kk: 'Қате мәліметтері' }),
      close: t({ ru: 'Закрыть', en: 'Close', kk: 'Жабу' }),
    },
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'breadcrumbs',
  content: {
    labels: {
      '': t({
        ru: 'Главная',
        en: 'Home',
        kk: 'Басты бет',
      }),
      statements: t({
        ru: 'Выписки',
        en: 'Statements',
        kk: 'Үзінділер',
      }),
      receipts: t({
        ru: 'Чеки',
        en: 'Receipts',
        kk: 'Чектер',
      }),
      upload: t({
        ru: 'Загрузка',
        en: 'Upload',
        kk: 'Жүктеу',
      }),
      'data-entry': t({
        ru: 'Ввод данных',
        en: 'Data entry',
        kk: 'Деректерді енгізу',
      }),
      storage: t({
        ru: 'Хранилище',
        en: 'Storage',
        kk: 'Қойма',
      }),
      reports: t({
        ru: 'Отчёты',
        en: 'Reports',
        kk: 'Есептер',
      }),
      categories: t({
        ru: 'Категории',
        en: 'Categories',
        kk: 'Санаттар',
      }),
      integrations: t({
        ru: 'Интеграции',
        en: 'Integrations',
        kk: 'Интеграциялар',
      }),
      'integrations/google-sheets': t({
        ru: 'Google Sheets',
        en: 'Google Sheets',
        kk: 'Google Sheets',
      }),
      'custom-tables': t({
        ru: 'Таблицы',
        en: 'Tables',
        kk: 'Кестелер',
      }),
      'custom-tables/import': t({
        ru: 'Импорт',
        en: 'Import',
        kk: 'Импорт',
      }),
      'custom-tables/import/google-sheets': t({
        ru: 'Google Sheets',
        en: 'Google Sheets',
        kk: 'Google Sheets',
      }),
      settings: t({
        ru: 'Настройки',
        en: 'Settings',
        kk: 'Баптаулар',
      }),
      'settings/profile': t({
        ru: 'Профиль',
        en: 'Profile',
        kk: 'Профиль',
      }),
      'settings/workspace': t({
        ru: 'Рабочее пространство',
        en: 'Workspace',
        kk: 'Жұмыс кеңістігі',
      }),
      'settings/telegram': t({
        ru: 'Telegram',
        en: 'Telegram',
        kk: 'Telegram',
      }),
      'google-sheets': t({
        ru: 'Google Sheets',
        en: 'Google Sheets',
        kk: 'Google Sheets',
      }),
      'google-sheets/callback': t({
        ru: 'Callback',
        en: 'Callback',
        kk: 'Callback',
      }),
      admin: t({
        ru: 'Админка',
        en: 'Admin',
        kk: 'Админка',
      }),
    },
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'integrationsPage',
  content: {
    title: t({ ru: 'Интеграции', en: 'Integrations', kk: 'Интеграциялар' }),
    subtitle: t({
      ru: 'Подключайте внешние сервисы и автоматизируйте обмен данными.',
      en: 'Connect external services and automate data exchange.',
      kk: 'Сыртқы сервистерді қосып, деректер алмасуын автоматтандырыңыз.',
    }),
    sections: {
      connected: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
      available: t({
        ru: 'Доступно к подключению',
        en: 'Available',
        kk: 'Қолжетімді',
      }),
    },
    banner: t({
      ru: 'Начните отсюда: подключите Gmail или Google Диск для автоматического импорта чеков и выписок.',
      en: 'Start here: Connect Gmail or Google Drive to automatically import receipts and statements.',
      kk: 'Осыдан бастаңыз: түбіртектер мен үзінділерді автоматты түрде импорттау үшін Gmail немесе Google Drive қосыңыз.',
    }),
    recommendedBadge: t({
      ru: 'Рекомендуется',
      en: 'Recommended',
      kk: 'Ұсынылады',
    }),
    empty: {
      connected: t({
        ru: 'Пока нет активных интеграций.',
        en: 'No active integrations yet.',
        kk: 'Әзірше белсенді интеграциялар жоқ.',
      }),
      available: t({
        ru: 'Нет доступных интеграций.',
        en: 'No integrations available.',
        kk: 'Қолжетімді интеграциялар жоқ.',
      }),
    },
    categories: {
      storage: t({ ru: 'Файловые хранилища', en: 'Storage', kk: 'Файл қоймалары' }),
      email: t({ ru: 'Почта', en: 'Email', kk: 'Пошта' }),
      spreadsheets: t({ ru: 'Таблицы', en: 'Spreadsheets', kk: 'Кестелер' }),
      messaging: t({ ru: 'Мессенджеры', en: 'Messaging', kk: 'Мессенджерлер' }),
    },
    cards: {
      dropbox: {
        description: t({
          ru: 'Синхронизируйте выписки с Dropbox и импортируйте файлы за пару кликов.',
          en: 'Sync statements with Dropbox and import files in a few clicks.',
          kk: 'Үзінділерді Dropbox-пен синхрондап, файлдарды оңай импорттаңыз.',
        }),
        badge: t({ ru: 'Доступно', en: 'Available', kk: 'Қолжетімді' }),
        actions: {
          connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
          docs: t({ ru: 'Документация', en: 'Documentation', kk: 'Құжаттама' }),
        },
      },
      googleDrive: {
        description: t({
          ru: 'Синхронизируйте выписки с Google Drive и импортируйте файлы за пару кликов.',
          en: 'Sync statements with Google Drive and import files in a few clicks.',
          kk: 'Үзінділерді Google Drive-пен синхрондап, файлдарды оңай импорттаңыз.',
        }),
        badge: t({ ru: 'Доступно', en: 'Available', kk: 'Қолжетімді' }),
        actions: {
          connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
          docs: t({ ru: 'Документация', en: 'Documentation', kk: 'Құжаттама' }),
        },
      },
      googleSheets: {
        description: t({
          ru: 'Отправляйте распарсенные транзакции в выбранную таблицу.',
          en: 'Send parsed transactions to a selected spreadsheet.',
          kk: 'Өңделген транзакцияларды таңдалған кестеге жіберіңіз.',
        }),
        badge: t({ ru: 'Доступно', en: 'Available', kk: 'Қолжетімді' }),
        actions: {
          connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
          docs: t({ ru: 'Документация', en: 'Documentation', kk: 'Құжаттама' }),
        },
      },
      telegram: {
        description: t({
          ru: 'Получайте уведомления и отправляйте выписки через бота.',
          en: 'Receive notifications and send statements via a bot.',
          kk: 'Хабарламалар алып, үзінділерді бот арқылы жіберіңіз.',
        }),
        badge: t({ ru: 'Скоро', en: 'Coming soon', kk: 'Жақында' }),
        actions: {
          setup: t({
            ru: 'Настроить бота',
            en: 'Set up bot',
            kk: 'Ботты баптау',
          }),
          guide: t({ ru: 'Руководство', en: 'Guide', kk: 'Нұсқаулық' }),
        },
      },
    },
  },
} satisfies Dictionary;

export default content;

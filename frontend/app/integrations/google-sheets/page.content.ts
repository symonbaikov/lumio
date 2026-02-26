import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'googleSheetsIntegrationPage',
  content: {
    errors: {
      loadConnections: t({
        ru: 'Не удалось загрузить подключённые таблицы',
        en: 'Failed to load connected sheets',
        kk: 'Қосылған кестелерді жүктеу мүмкін болмады',
      }),
      missingAuthUrl: t({
        ru: 'Не удалось получить ссылку для авторизации Google',
        en: 'Failed to get Google authorization URL',
        kk: 'Google авторизация сілтемесін алу мүмкін болмады',
      }),
      sheetIdMissing: t({
        ru: 'Укажите ID или ссылку на таблицу',
        en: 'Provide a spreadsheet ID or URL',
        kk: 'Кестенің ID немесе сілтемесін көрсетіңіз',
      }),
      connectFailed: t({
        ru: 'Не удалось подключить таблицу',
        en: 'Failed to connect spreadsheet',
        kk: 'Кестені қосу мүмкін болмады',
      }),
      syncFailed: t({
        ru: 'Не удалось синхронизировать',
        en: 'Failed to sync',
        kk: 'Синхрондау мүмкін болмады',
      }),
      removeFailed: t({
        ru: 'Не удалось отключить таблицу',
        en: 'Failed to disconnect sheet',
        kk: 'Кестені ажырату мүмкін болмады',
      }),
    },
    toasts: {
      openingAuth: t({
        ru: 'Открываем Google авторизацию…',
        en: 'Opening Google authorization…',
        kk: 'Google авторизациясы ашылуда…',
      }),
      syncStarted: t({
        ru: 'Синхронизация запущена',
        en: 'Sync started',
        kk: 'Синхрондау басталды',
      }),
      removed: t({
        ru: 'Подключение отключено',
        en: 'Connection removed',
        kk: 'Қосылым ажыратылды',
      }),
    },
    loginRequired: {
      title: t({
        ru: 'Войдите, чтобы подключить Google Sheets',
        en: 'Log in to connect Google Sheets',
        kk: 'Google Sheets қосу үшін кіріңіз',
      }),
      subtitle: t({
        ru: 'Авторизация нужна для создания привязки таблицы к вашему аккаунту.',
        en: 'Authorization is required to link a sheet to your account.',
        kk: 'Кестені аккаунтыңызға байланыстыру үшін авторизация қажет.',
      }),
    },
    header: {
      title: t({
        ru: 'Подключение Google Sheets',
        en: 'Google Sheets connection',
        kk: 'Google Sheets қосу',
      }),
      subtitle: t({
        ru: 'Укажите таблицу и лист, куда будут отправляться данные. После подключения вставьте Apps Script из документации для отправки вебхуков.',
        en: 'Specify the spreadsheet and sheet tab for sending data. After connecting, paste the Apps Script from the docs to send webhooks.',
        kk: 'Деректер жіберілетін кесте мен парақты көрсетіңіз. Қосылғаннан кейін вебхук жіберу үшін құжаттамадағы Apps Script-ті қойыңыз.',
      }),
    },
    step1: {
      label: t({ ru: 'Шаг 1', en: 'Step 1', kk: '1-қадам' }),
      title: t({
        ru: 'Подключить Google Sheets',
        en: 'Connect Google Sheets',
        kk: 'Google Sheets қосу',
      }),
      sheetUrlLabel: t({
        ru: 'Ссылка или ID таблицы',
        en: 'Spreadsheet URL or ID',
        kk: 'Кестенің сілтемесі немесе ID',
      }),
      sheetUrlPlaceholder: t({
        ru: 'https://docs.google.com/spreadsheets/d/… или 1A2B3C…',
        en: 'https://docs.google.com/spreadsheets/d/… or 1A2B3C…',
        kk: 'https://docs.google.com/spreadsheets/d/… немесе 1A2B3C…',
      }),
      nameLabel: t({ ru: 'Название в системе', en: 'Name in system', kk: 'Жүйедегі атауы' }),
      namePlaceholder: t({
        ru: 'Например: Выписки Казахстан',
        en: 'e.g. KZ statements',
        kk: 'Мысалы: Қазақстан үзінділері',
      }),
      nameHelp: t({
        ru: 'Если оставить пустым — используем название из Google Sheets.',
        en: 'If empty, we will use the name from Google Sheets.',
        kk: 'Бос қалдырсаңыз — Google Sheets атауы қолданылады.',
      }),
      worksheetLabel: t({
        ru: 'Имя листа (опционально, если не Sheet1)',
        en: 'Worksheet name (optional, if not Sheet1)',
        kk: 'Парақ атауы (міндетті емес, Sheet1 болмаса)',
      }),
      worksheetPlaceholder: t({
        ru: 'Например: Отгрузки',
        en: 'e.g. Shipments',
        kk: 'Мысалы: Жөнелтулер',
      }),
      connectButton: t({
        ru: 'Подключить',
        en: 'Connect',
        kk: 'Қосу',
      }),
      successText: t({
        ru: 'После подключения новые транзакции будут автоматически появляться в этой таблице.',
        en: 'After connecting, new transactions will appear in this sheet automatically.',
        kk: 'Қосылғаннан кейін жаңа транзакциялар осы кестеде автоматты түрде пайда болады.',
      }),
    },
    step2: {
      label: t({
        ru: 'Шаг 2 (Advanced setup)',
        en: 'Step 2 (Advanced setup)',
        kk: '2-қадам (Қосымша баптау)',
      }),
      title: t({
        ru: 'Автообновление из Google Sheets (опционально)',
        en: 'Enable automatic updates from Google Sheets (optional)',
        kk: 'Google Sheets-тен авто жаңарту (міндетті емес)',
      }),
      description: t({
        ru: 'Скопируйте скрипт из нашей инструкции и поставьте триггер onEdit, чтобы отправлять изменения по вебхуку.',
        en: 'Copy the script from our guide and set an onEdit trigger to send changes via webhook.',
        kk: 'Нұсқаулықтағы скриптті көшіріп, өзгерістерді вебхук арқылы жіберу үшін onEdit триггерін орнатыңыз.',
      }),
      appsScriptDoc: t({
        ru: 'Инструкция по Apps Script',
        en: 'Apps Script guide',
        kk: 'Apps Script нұсқаулығы',
      }),
      openSheets: t({
        ru: 'Открыть Google Sheets',
        en: 'Open Google Sheets',
        kk: 'Google Sheets ашу',
      }),
      webhookEndpointLabel: t({
        ru: 'Эндпоинт вебхука',
        en: 'Webhook endpoint',
        kk: 'Вебхук эндпоинты',
      }),
      webhookHeaderLabel: t({ ru: 'Заголовок', en: 'Header', kk: 'Тақырыпша' }),
      webhookTokenHint: t({ ru: 'ваш токен', en: 'your token', kk: 'сіздің токеніңіз' }),
      showTechnicalDetails: t({
        ru: 'Показать технические детали',
        en: 'Show technical details',
        kk: 'Техникалық бөлшектерді көрсету',
      }),
    },
    list: {
      title: t({ ru: 'Подключённые таблицы', en: 'Connected sheets', kk: 'Қосылған кестелер' }),
      subtitle: t({
        ru: 'Автообновление по вебхуку',
        en: 'Auto updates via webhook',
        kk: 'Вебхук арқылы авто жаңарту',
      }),
      empty: t({
        ru: 'Пока нет подключений. Добавьте первую таблицу через форму слева.',
        en: 'No connections yet. Add your first sheet using the form on the left.',
        kk: 'Әзірше қосылымдар жоқ. Сол жақтағы форма арқылы бірінші кестені қосыңыз.',
      }),
      badges: {
        oauthNeeded: t({ ru: 'Нужен OAuth', en: 'OAuth needed', kk: 'OAuth қажет' }),
        active: t({ ru: 'Активно', en: 'Active', kk: 'Белсенді' }),
      },
      fields: {
        idPrefix: t({ ru: 'ID', en: 'ID', kk: 'ID' }),
        worksheetPrefix: t({ ru: 'Лист', en: 'Sheet', kk: 'Парақ' }),
        lastSyncPrefix: t({
          ru: 'Последняя синхронизация',
          en: 'Last sync',
          kk: 'Соңғы синхрондау',
        }),
      },
      actions: {
        authorize: t({ ru: 'Авторизовать', en: 'Authorize', kk: 'Авторизация' }),
        sync: t({ ru: 'Синхронизировать', en: 'Sync', kk: 'Синхрондау' }),
        disconnect: t({ ru: 'Отключить', en: 'Disconnect', kk: 'Ажырату' }),
      },
      dash: t({ ru: '—', en: '—', kk: '—' }),
    },
  },
} satisfies Dictionary;

export default content;

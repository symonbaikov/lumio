import { type DeclarationContent, t } from 'intlayer';

/**
 * Контент для тура по интеграциям
 */
export const integrationsTourContent = {
  key: 'integrations-tour-content',
  content: {
    name: t({
      ru: 'Тур по интеграциям',
      en: 'Integrations Tour',
      kk: 'Интеграциялар туры',
    }),
    description: t({
      ru: 'Подключение внешних сервисов',
      en: 'Connect external services',
      kk: 'Сыртқы сервистерді қосу',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в интеграции',
          en: 'Welcome to Integrations',
          kk: 'Интеграцияларға қош келдіңіз',
        }),
        description: t({
          ru: 'Интеграции позволяют подключить Lumio к внешним сервисам: Google Sheets для синхронизации данных, API для автоматизации и другие инструменты. Давайте настроим подключения!',
          en: "Integrations allow you to connect Lumio to external services: Google Sheets for data sync, API for automation and other tools. Let's set up connections!",
          kk: 'Интеграциялар Lumio-ды сыртқы қызметтерге қосуға мүмкіндік береді: деректерді синхрондау үшін Google Sheets, автоматтандыру үшін API және басқа құралдар. Қосылымдарды орнатайық!',
        }),
      },
      googleSheets: {
        title: t({
          ru: 'Google Sheets интеграция',
          en: 'Google Sheets Integration',
          kk: 'Google Sheets интеграциясы',
        }),
        description: t({
          ru: 'Подключите Google Sheets для автоматической выгрузки транзакций в таблицы. Настройте формат данных, выберите листы и частоту синхронизации. Все данные обновляются в реальном времени.',
          en: 'Connect Google Sheets to automatically export transactions to spreadsheets. Configure data format, select sheets and sync frequency. All data updates in real-time.',
          kk: 'Транзакцияларды кестелерге автоматты түрде экспорттау үшін Google Sheets-ті қосыңыз. Деректер форматын теңшеңіз, парақтар мен синхрондау жиілігін таңдаңыз. Барлық деректер нақты уақытта жаңартылады.',
        }),
      },
      apiKeys: {
        title: t({
          ru: 'API ключи',
          en: 'API Keys',
          kk: 'API кілттері',
        }),
        description: t({
          ru: 'Создайте API ключи для интеграции с внешними системами. Управляйте правами доступа, отслеживайте использование и отзывайте ключи при необходимости.',
          en: 'Create API keys to integrate with external systems. Manage access rights, track usage and revoke keys when needed.',
          kk: 'Сыртқы жүйелермен біріктіру үшін API кілттерін жасаңыз. Қол жеткізу құқықтарын басқарыңыз, пайдалануды бақылаңыз және қажет болса кілттерді қайтарып алыңыз.',
        }),
      },
      webhooks: {
        title: t({
          ru: 'Вебхуки',
          en: 'Webhooks',
          kk: 'Вебхуктар',
        }),
        description: t({
          ru: 'Настройте вебхуки для получения уведомлений о событиях: новая транзакция, загружен файл, изменён статус. Используйте их для автоматизации бизнес-процессов.',
          en: 'Configure webhooks to receive notifications about events: new transaction, file uploaded, status changed. Use them to automate business processes.',
          kk: 'Оқиғалар туралы хабарламаларды алу үшін вебхуктарды теңшеңіз: жаңа транзакция, жүктелген файл, өзгерген күй. Іскерлік процестерді автоматтандыру үшін оларды пайдаланыңыз.',
        }),
      },
      connectionStatus: {
        title: t({
          ru: 'Статус подключений',
          en: 'Connection Status',
          kk: 'Қосылым күйі',
        }),
        description: t({
          ru: 'Отслеживайте статус всех интеграций: активные, с ошибками или отключённые. Проверяйте логи для диагностики проблем и настройки подключений.',
          en: 'Track the status of all integrations: active, with errors or disconnected. Check logs to diagnose issues and configure connections.',
          kk: 'Барлық интеграциялардың күйін бақылаңыз: белсенді, қателері бар немесе ажыратылған. Мәселелерді диагностикалау және қосылымдарды теңшеу үшін журналдарды тексеріңіз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично!',
          en: 'Great!',
          kk: 'Тамаша!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как настраивать интеграции. Подключайте внешние сервисы и автоматизируйте работу с данными!',
          en: 'Now you know how to configure integrations. Connect external services and automate your data workflows!',
          kk: 'Енді сіз интеграцияларды қалай теңшеуді білесіз. Сыртқы қызметтерді қосыңыз және деректермен жұмысты автоматтандырыңыз!',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default integrationsTourContent;

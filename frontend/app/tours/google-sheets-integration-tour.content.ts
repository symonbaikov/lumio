import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'google-sheets-integration-tour-content',
  content: {
    name: t({
      ru: 'Тур по подключению Google Sheets',
      en: 'Google Sheets Connection Tour',
      kk: 'Google Sheets қосу туры',
    }),
    description: t({
      ru: 'Пошаговый гайд по подключению таблицы и настройке синхронизации.',
      en: 'Step-by-step guide to connect a sheet and configure sync.',
      kk: 'Кестені қосу және синхрондауды баптау бойынша қадамдық нұсқаулық.',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Подключение Google Sheets',
          en: 'Google Sheets connection',
          kk: 'Google Sheets қосылуы',
        }),
        description: t({
          ru: 'Этот тур объяснит, как подключить таблицу, настроить Apps Script и управлять синхронизацией.',
          en: 'This tour explains how to connect a sheet, set up Apps Script, and manage sync.',
          kk: 'Бұл тур кестені қосу, Apps Script баптау және синхрондауды басқаруды түсіндіреді.',
        }),
      },
      step1Card: {
        title: t({
          ru: 'Шаг 1: Добавить таблицу',
          en: 'Step 1: Add a sheet',
          kk: '1-қадам: Кесте қосу',
        }),
        description: t({
          ru: 'Введите ссылку или ID таблицы, задайте имя и лист при необходимости.',
          en: 'Enter the sheet URL/ID, set a name and worksheet if needed.',
          kk: 'Кесте сілтемесін/ID енгізіп, атауы мен парағын көрсетіңіз.',
        }),
      },
      sheetUrl: {
        title: t({
          ru: 'Ссылка или ID',
          en: 'URL or ID',
          kk: 'Сілтеме немесе ID',
        }),
        description: t({
          ru: 'Поддерживается полная ссылка Google Sheets или чистый ID.',
          en: 'You can paste the full Google Sheets URL or just the ID.',
          kk: 'Толық Google Sheets сілтемесін немесе тек ID енгізе аласыз.',
        }),
      },
      sheetName: {
        title: t({
          ru: 'Название в системе',
          en: 'Name in Lumio',
          kk: 'Lumio атауы',
        }),
        description: t({
          ru: 'Это имя будет отображаться в списке подключений.',
          en: 'This name will appear in the connections list.',
          kk: 'Бұл атау қосылымдар тізімінде көрсетіледі.',
        }),
      },
      worksheet: {
        title: t({
          ru: 'Имя листа',
          en: 'Worksheet name',
          kk: 'Парақ атауы',
        }),
        description: t({
          ru: 'Укажите конкретный лист, если данных несколько.',
          en: 'Specify a worksheet if the spreadsheet has multiple tabs.',
          kk: 'Кестеде бірнеше парақ болса, қажеттісін көрсетіңіз.',
        }),
      },
      connectButton: {
        title: t({
          ru: 'Авторизация и подключение',
          en: 'Authorize and connect',
          kk: 'Авторизация және қосу',
        }),
        description: t({
          ru: 'Запускает OAuth для доступа к Google Sheets.',
          en: 'Starts OAuth to grant Google Sheets access.',
          kk: 'Google Sheets қолжетімділігін беру үшін OAuth іске қосады.',
        }),
      },
      step2Card: {
        title: t({
          ru: 'Шаг 2: Apps Script',
          en: 'Step 2: Apps Script',
          kk: '2-қадам: Apps Script',
        }),
        description: t({
          ru: 'Добавьте Apps Script, чтобы отправлять вебхуки при изменениях.',
          en: 'Add Apps Script to send webhooks on changes.',
          kk: 'Өзгерістерде вебхук жіберу үшін Apps Script қосыңыз.',
        }),
      },
      appsScript: {
        title: t({
          ru: 'Инструкция Apps Script',
          en: 'Apps Script guide',
          kk: 'Apps Script нұсқаулығы',
        }),
        description: t({
          ru: 'Откройте документацию и следуйте шагам настройки.',
          en: 'Open the documentation and follow the setup steps.',
          kk: 'Құжаттаманы ашып, баптау қадамдарын орындаңыз.',
        }),
      },
      listCard: {
        title: t({
          ru: 'Подключённые таблицы',
          en: 'Connected sheets',
          kk: 'Қосылған кестелер',
        }),
        description: t({
          ru: 'Здесь отображаются все активные подключения.',
          en: 'All active connections are listed here.',
          kk: 'Барлық белсенді қосылымдар осында көрсетіледі.',
        }),
      },
      connectionCard: {
        title: t({
          ru: 'Карточка подключения',
          en: 'Connection card',
          kk: 'Қосылым карточкасы',
        }),
        description: t({
          ru: 'Показывает статус OAuth, ID таблицы и дату синхронизации.',
          en: 'Shows OAuth status, sheet ID, and last sync.',
          kk: 'OAuth күйі, кесте ID және соңғы синхрон уақыты көрсетіледі.',
        }),
      },
      authorize: {
        title: t({
          ru: 'Повторная авторизация',
          en: 'Re-authorize',
          kk: 'Қайта авторизациялау',
        }),
        description: t({
          ru: 'Появляется, если OAuth требуется повторно.',
          en: 'Appears when OAuth needs to be refreshed.',
          kk: 'OAuth қайта қажет болғанда шығады.',
        }),
      },
      sync: {
        title: t({
          ru: 'Синхронизация',
          en: 'Sync',
          kk: 'Синхрондау',
        }),
        description: t({
          ru: 'Запускает принудительную синхронизацию данных.',
          en: 'Triggers a manual sync of data.',
          kk: 'Деректерді қолмен синхрондауды іске қосады.',
        }),
      },
      disconnect: {
        title: t({
          ru: 'Отключить',
          en: 'Disconnect',
          kk: 'Ажырату',
        }),
        description: t({
          ru: 'Удаляет подключение и останавливает синхронизацию.',
          en: 'Removes the connection and stops syncing.',
          kk: 'Қосылымды жояды және синхрондауды тоқтатады.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'Done',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы можете подключать и управлять Google Sheets.',
          en: 'You can now connect and manage Google Sheets.',
          kk: 'Енді Google Sheets-ті қосып, басқара аласыз.',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;

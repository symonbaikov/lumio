import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'dropboxIntegrationPage',
  content: {
    header: {
      title: t({ ru: 'Dropbox', en: 'Dropbox', kk: 'Dropbox' }),
      subtitle: t({
        ru: 'Подключите Dropbox, чтобы синхронизировать выписки и импортировать файлы.',
        en: 'Connect Dropbox to sync statements and import files.',
        kk: 'Үзінділерді синхрондау және файлдарды импорттау үшін Dropbox қосыңыз.',
      }),
    },
    status: {
      connected: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
      disconnected: t({ ru: 'Не подключено', en: 'Not connected', kk: 'Қосылмаған' }),
      needsReauth: t({
        ru: 'Требуется повторная авторизация',
        en: 'Reauthorization required',
        kk: 'Қайта авторизация қажет',
      }),
    },
    actions: {
      connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
      reconnect: t({ ru: 'Переподключить', en: 'Reconnect', kk: 'Қайта қосу' }),
      disconnect: t({ ru: 'Отключить', en: 'Disconnect', kk: 'Ажырату' }),
      syncNow: t({ ru: 'Синхронизировать сейчас', en: 'Sync now', kk: 'Қазір синхрондау' }),
      pickFolder: t({ ru: 'Выбрать папку', en: 'Choose folder', kk: 'Қалта таңдау' }),
    },
    settings: {
      title: t({ ru: 'Настройки синхронизации', en: 'Sync settings', kk: 'Синхрондау баптаулары' }),
      syncEnabled: t({
        ru: 'Ежедневная синхронизация',
        en: 'Daily sync',
        kk: 'Күнделікті синхрондау',
      }),
      syncTime: t({ ru: 'Время синхронизации', en: 'Sync time', kk: 'Синхрондау уақыты' }),
      timeZone: t({ ru: 'Часовой пояс', en: 'Time zone', kk: 'Уақыт белдеуі' }),
      folder: t({ ru: 'Папка в Dropbox', en: 'Dropbox folder', kk: 'Dropbox қалтасы' }),
      folderPlaceholder: t({
        ru: 'Не выбрана (будет создана Lumio)',
        en: 'Not selected (Lumio will create one)',
        kk: 'Таңдалмаған (Lumio құрады)',
      }),
      lastSync: t({ ru: 'Последняя синхронизация', en: 'Last sync', kk: 'Соңғы синхрондау' }),
    },
    toasts: {
      connecting: t({
        ru: 'Открываем авторизацию Dropbox…',
        en: 'Opening Dropbox authorization…',
        kk: 'Dropbox авторизациясы ашылуда…',
      }),
      connected: t({ ru: 'Dropbox подключен', en: 'Dropbox connected', kk: 'Dropbox қосылды' }),
      disconnected: t({
        ru: 'Интеграция отключена',
        en: 'Integration disconnected',
        kk: 'Интеграция ажыратылды',
      }),
      syncStarted: t({
        ru: 'Синхронизация запущена',
        en: 'Sync started',
        kk: 'Синхрондау басталды',
      }),
      settingsSaved: t({
        ru: 'Настройки сохранены',
        en: 'Settings saved',
        kk: 'Баптаулар сақталды',
      }),
    },
    errors: {
      loadStatus: t({
        ru: 'Не удалось загрузить статус интеграции',
        en: 'Failed to load integration status',
        kk: 'Интеграция статусын жүктеу мүмкін болмады',
      }),
      connectFailed: t({
        ru: 'Не удалось начать подключение',
        en: 'Failed to start connection',
        kk: 'Қосылымды бастау мүмкін болмады',
      }),
      disconnectFailed: t({
        ru: 'Не удалось отключить интеграцию',
        en: 'Failed to disconnect integration',
        kk: 'Интеграцияны ажырату мүмкін болмады',
      }),
      pickerUnavailable: t({
        ru: 'Dropbox Chooser недоступен',
        en: 'Dropbox Chooser is unavailable',
        kk: 'Dropbox Chooser қолжетімсіз',
      }),
    },
  },
} satisfies Dictionary;

export default content;

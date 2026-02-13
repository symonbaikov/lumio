import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'googleDriveIntegrationPage',
  content: {
    header: {
      title: t({ ru: 'Google Drive', en: 'Google Drive', kk: 'Google Drive' }),
      subtitle: t({
        ru: 'Подключите Google Drive, чтобы синхронизировать выписки и импортировать файлы.',
        en: 'Connect Google Drive to sync statements and import files.',
        kk: 'Үзінділерді синхрондау және файлдарды импорттау үшін Google Drive қосыңыз.',
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
      folder: t({ ru: 'Папка в Drive', en: 'Drive folder', kk: 'Drive қалтасы' }),
      folderPlaceholder: t({
        ru: 'Не выбрана (будет создана Lumio)',
        en: 'Not selected (Lumio will create one)',
        kk: 'Таңдалмаған (Lumio құрады)',
      }),
      lastSync: t({ ru: 'Последняя синхронизация', en: 'Last sync', kk: 'Соңғы синхрондау' }),
    },
    toasts: {
      connecting: t({
        ru: 'Открываем авторизацию Google…',
        en: 'Opening Google authorization…',
        kk: 'Google авторизациясы ашылуда…',
      }),
      connected: t({
        ru: 'Google Drive подключен',
        en: 'Google Drive connected',
        kk: 'Google Drive қосылды',
      }),
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
        ru: 'Google Picker недоступен',
        en: 'Google Picker is unavailable',
        kk: 'Google Picker қолжетімсіз',
      }),
    },
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'gmailIntegrationPage',
  content: {
    header: {
      title: t({ ru: 'Gmail', en: 'Gmail', kk: 'Gmail' }),
      subtitle: t({
        ru: 'Подключите Gmail, чтобы автоматически импортировать чеки и счета',
        en: 'Connect Gmail to automatically import receipts and invoices',
        kk: 'Чек пен шоттарды автоматты импорттау үшін Gmail қосыңыз',
      }),
    },
    status: {
      connected: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
      disconnected: t({ ru: 'Не подключено', en: 'Disconnected', kk: 'Қосылмаған' }),
      needsReauth: t({
        ru: 'Требуется повторная авторизация',
        en: 'Needs re-authentication',
        kk: 'Қайта авторизация қажет',
      }),
      active: t({ ru: 'Активно', en: 'Active', kk: 'Белсенді' }),
      inactive: t({ ru: 'Неактивно', en: 'Inactive', kk: 'Белсенді емес' }),
      enabled: t({ ru: 'Включено', en: 'Enabled', kk: 'Қосулы' }),
      disabled: t({ ru: 'Выключено', en: 'Disabled', kk: 'Өшірулі' }),
    },
    actions: {
      connect: t({ ru: 'Подключить Gmail', en: 'Connect Gmail', kk: 'Gmail қосу' }),
      reconnect: t({ ru: 'Переподключить', en: 'Reconnect', kk: 'Қайта қосу' }),
      disconnect: t({ ru: 'Отключить', en: 'Disconnect', kk: 'Ажырату' }),
      sync: t({ ru: 'Синхронизировать Gmail', en: 'Sync Gmail', kk: 'Gmail синхрондау' }),
    },
    settings: {
      title: t({ ru: 'Настройки', en: 'Settings', kk: 'Баптаулар' }),
      labelName: t({ ru: 'Название ярлыка', en: 'Label name', kk: 'Белгі атауы' }),
      lastSync: t({ ru: 'Последняя синхронизация', en: 'Last sync', kk: 'Соңғы синхрондау' }),
      filterEnabled: t({
        ru: 'Включить автоматическую фильтрацию',
        en: 'Enable automatic filtering',
        kk: 'Автоматты сүзуді қосу',
      }),
      watchStatus: t({ ru: 'Статус отслеживания', en: 'Watch status', kk: 'Бақылау статусы' }),
      expires: t({ ru: 'Истекает', en: 'Expires', kk: 'Аяқталады' }),
      keywords: t({ ru: 'Ключевые слова', en: 'Filter keywords', kk: 'Сүзгі сөздері' }),
      keywordsPlaceholder: t({
        ru: 'чек, счет, подтверждение заказа',
        en: 'receipt, invoice, order confirmation',
        kk: 'чек, шот, тапсырыс растауы',
      }),
      keywordsHelp: t({
        ru: 'Ключевые слова через запятую для фильтрации писем',
        en: 'Comma-separated keywords for filtering emails',
        kk: 'Электрондық хаттарды сүзуге арналған үтірмен бөлінген сөздер',
      }),
      hasAttachment: t({
        ru: 'Только письма с вложениями',
        en: 'Only emails with attachments',
        kk: 'Тек тіркемесі бар хаттар',
      }),
    },
    toasts: {
      connecting: t({
        ru: 'Подключение к Gmail...',
        en: 'Connecting to Gmail...',
        kk: 'Gmail қосылуда...',
      }),
      connected: t({
        ru: 'Gmail подключен',
        en: 'Gmail connected successfully!',
        kk: 'Gmail сәтті қосылды!',
      }),
      disconnected: t({ ru: 'Gmail отключен', en: 'Gmail disconnected', kk: 'Gmail ажыратылды' }),
      settingsSaved: t({
        ru: 'Настройки сохранены',
        en: 'Settings saved',
        kk: 'Баптаулар сақталды',
      }),
      syncStarted: t({
        ru: 'Синхронизация запущена',
        en: 'Gmail sync started',
        kk: 'Синхрондау басталды',
      }),
    },
    errors: {
      loadStatus: t({
        ru: 'Не удалось загрузить статус Gmail',
        en: 'Failed to load Gmail integration status',
        kk: 'Gmail статусын жүктеу мүмкін болмады',
      }),
      connectFailed: t({
        ru: 'Не удалось подключить Gmail',
        en: 'Failed to connect Gmail',
        kk: 'Gmail қосу мүмкін болмады',
      }),
      missingOauthUrl: t({
        ru: 'Не удалось получить OAuth ссылку Gmail',
        en: 'Failed to get Gmail OAuth URL',
        kk: 'Gmail OAuth сілтемесін алу мүмкін болмады',
      }),
      disconnectFailed: t({
        ru: 'Не удалось отключить Gmail',
        en: 'Failed to disconnect Gmail',
        kk: 'Gmail ажырату мүмкін болмады',
      }),
      saveFailed: t({
        ru: 'Не удалось сохранить настройки',
        en: 'Failed to save settings',
        kk: 'Баптауларды сақтау мүмкін болмады',
      }),
      syncFailed: t({
        ru: 'Не удалось синхронизировать Gmail',
        en: 'Failed to sync Gmail',
        kk: 'Gmail синхрондау мүмкін болмады',
      }),
      noMatches: t({
        ru: 'Подходящие письма не найдены',
        en: 'No matching emails found in Gmail',
        kk: 'Сәйкес хаттар табылмады',
      }),
      allSynced: t({
        ru: 'Все доступные чеки уже синхронизированы',
        en: 'All receipts available in Gmail are already synced',
        kk: 'Барлық чек синхрондалған',
      }),
      syncNoNew: t({
        ru: 'Синхронизация завершена без новых чеков',
        en: 'Gmail sync finished with no new receipts',
        kk: 'Жаңа чек табылмады',
      }),
      loginRequired: t({
        ru: 'Войдите, чтобы подключить Gmail',
        en: 'Please sign in to connect Gmail',
        kk: 'Gmail қосу үшін кіріңіз',
      }),
      authFailed: t({
        ru: 'Не удалось подключить Gmail',
        en: 'Failed to connect Gmail',
        kk: 'Gmail қосу мүмкін болмады',
      }),
    },
    info: {
      title: t({ ru: 'Как это работает', en: 'How it works', kk: 'Бұл қалай жұмыс істейді' }),
      step1: t({
        ru: '1. Подключите Gmail с доступом только на чтение',
        en: '1. Connect your Gmail account with read-only access',
        kk: '1. Gmail аккаунтын тек оқу рұқсатымен қосыңыз',
      }),
      step2: t({
        ru: '2. Мы автоматически создадим ярлык "Lumio/Receipts"',
        en: '2. We automatically create a "Lumio/Receipts" label',
        kk: '2. Біз "Lumio/Receipts" белгісін автоматты жасаймыз',
      }),
      step3: t({
        ru: '3. Письма по фильтрам будут импортироваться автоматически',
        en: '3. Emails matching your filters are automatically imported',
        kk: '3. Сүзгіге сай хаттар автоматты импортталады',
      }),
      step4: t({
        ru: '4. Проверяйте и подтверждайте чеки на странице Receipts',
        en: '4. Review and approve receipts in the Receipts page',
        kk: '4. Receipts бетінде чектерді тексеріп растаңыз',
      }),
    },
    common: {
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      notConnected: t({ ru: 'Не подключено', en: 'Not connected', kk: 'Қосылмаған' }),
      unknownDate: t({ ru: '—', en: '—', kk: '—' }),
    },
  },
} satisfies Dictionary;

export default content;

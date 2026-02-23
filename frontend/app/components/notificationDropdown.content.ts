import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'notificationDropdown',
  content: {
    title: t({ ru: 'Уведомления', en: 'Notifications', kk: 'Хабарландырулар' }),
    markAllRead: t({
      ru: 'Прочитать все',
      en: 'Mark all as read',
      kk: 'Барлығын оқылған ету',
    }),
    loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
    empty: t({
      ru: 'Нет новых уведомлений',
      en: 'No new notifications',
      kk: 'Жаңа хабарландыру жоқ',
    }),
    settingsLink: t({
      ru: 'Настройки уведомлений',
      en: 'Notification settings',
      kk: 'Хабарландыру баптаулары',
    }),
    justNow: t({ ru: 'только что', en: 'just now', kk: 'дәл қазір' }),
    aria: {
      notifications: t({ ru: 'Уведомления', en: 'Notifications', kk: 'Хабарландырулар' }),
    },
  },
} satisfies Dictionary;

export default content;

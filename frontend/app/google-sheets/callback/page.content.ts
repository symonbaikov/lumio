import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'googleSheetsCallbackPage',
  content: {
    errors: {
      missingCode: t({
        ru: 'Не удалось получить код авторизации Google.',
        en: 'Failed to get Google authorization code.',
        kk: 'Google авторизация коды алынбады.',
      }),
      oauthErrorPrefix: t({
        ru: 'Google OAuth ошибка',
        en: 'Google OAuth error',
        kk: 'Google OAuth қатесі',
      }),
      connectFailed: t({
        ru: 'Не удалось подключить Google Sheet',
        en: 'Failed to connect Google Sheet',
        kk: 'Google Sheet қосу мүмкін болмады',
      }),
    },
    title: t({
      ru: 'Подключение Google Sheets',
      en: 'Google Sheets connection',
      kk: 'Google Sheets қосу',
    }),
    subtitle: t({
      ru: 'Завершаем подключение Google аккаунта и возвращаем вас к выбору таблицы.',
      en: 'Finishing Google account connection and returning you to spreadsheet selection.',
      kk: 'Google аккаунтын қосуды аяқтап, кесте таңдау бетіне қайтарамыз.',
    }),
    success: t({
      ru: 'Google аккаунт подключен. Перенаправляем…',
      en: 'Google account connected. Redirecting…',
      kk: 'Google аккаунты қосылды. Бағытталуда…',
    }),
  },
} satisfies Dictionary;

export default content;

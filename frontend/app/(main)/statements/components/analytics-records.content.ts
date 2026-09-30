import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statementsAnalyticsRecords',
  content: {
    userFallback: t({
      ru: 'Пользователь',
      en: 'User',
      kk: 'Пайдаланушы',
      de: 'Benutzer',
      fr: 'Utilisateur',
      es: 'Usuario',
      pt: 'Usuário',
      tr: 'Kullanıcı',
      uk: 'Користувач',
      zh: '用户',
      ar: 'مستخدم',
      pl: 'Użytkownik',
      it: 'Utente',
      sk: 'Používateľ',
      ja: 'ユーザー',
      ko: '사용자',
      hi: 'उपयोगकर्ता',
      nl: 'Gebruiker',
      sv: 'Användare',
      vi: 'Người dùng',
      id: 'Pengguna',
    }),
  },
} satisfies Dictionary;

export default content;

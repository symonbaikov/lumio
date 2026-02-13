import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'loginPage',
  content: {
    title: t({
      ru: 'С возвращением',
      en: 'Welcome back',
      kk: 'Қайта келдіңіз',
    }),
    subtitle: t({
      ru: 'Войдите, чтобы продолжить работу в Lumio',
      en: 'Log in to continue using Lumio',
      kk: 'Lumio қолдануды жалғастыру үшін кіріңіз',
    }),
    passwordLabel: t({
      ru: 'Пароль',
      en: 'Password',
      kk: 'Құпиясөз',
    }),
    submit: t({
      ru: 'Войти',
      en: 'Log in',
      kk: 'Кіру',
    }),
    noAccount: t({
      ru: 'Нет аккаунта? Зарегистрируйтесь',
      en: "Don't have an account? Sign up",
      kk: 'Аккаунт жоқ па? Тіркеліңіз',
    }),
    rightTagline: t({
      ru: 'Платформа для обработки банковских выписок',
      en: 'A platform for bank statement processing',
      kk: 'Банк үзінділерін өңдеуге арналған платформа',
    }),
    loginFailed: t({
      ru: 'Не удалось выполнить вход. Попробуйте ещё раз.',
      en: 'Failed to log in. Please try again.',
      kk: 'Кіру мүмкін болмады. Қайтадан көріңіз.',
    }),
    googleLoginFailed: t({
      ru: 'Не удалось войти через Google. Попробуйте ещё раз.',
      en: 'Failed to sign in with Google. Please try again.',
      kk: 'Google арқылы кіру мүмкін болмады. Қайтадан көріңіз.',
    }),
    orLabel: t({
      ru: 'или',
      en: 'or',
      kk: 'немесе',
    }),
  },
} satisfies Dictionary;

export default content;

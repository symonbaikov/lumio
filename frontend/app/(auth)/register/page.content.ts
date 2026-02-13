import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'registerPage',
  content: {
    title: t({
      ru: 'Создайте аккаунт',
      en: 'Create an account',
      kk: 'Аккаунт жасаңыз',
    }),
    subtitle: t({
      ru: 'Присоединяйтесь к Lumio',
      en: 'Join Lumio',
      kk: 'Lumio-қа қосылыңыз',
    }),
    fullNameLabel: t({
      ru: 'Полное имя',
      en: 'Full name',
      kk: 'Толық аты-жөні',
    }),
    passwordLabel: t({
      ru: 'Пароль',
      en: 'Password',
      kk: 'Құпиясөз',
    }),
    passwordHelper: t({
      ru: 'Минимум 8 символов',
      en: 'At least 8 characters',
      kk: 'Кемінде 8 таңба',
    }),
    companyLabel: t({
      ru: 'Компания (опционально)',
      en: 'Company (optional)',
      kk: 'Компания (міндетті емес)',
    }),
    submit: t({
      ru: 'Зарегистрироваться',
      en: 'Sign up',
      kk: 'Тіркелу',
    }),
    haveAccount: t({
      ru: 'Уже есть аккаунт? Войти',
      en: 'Already have an account? Log in',
      kk: 'Аккаунтыңыз бар ма? Кіру',
    }),
    rightTitle: t({
      ru: 'Присоединяйтесь к Lumio',
      en: 'Join Lumio',
      kk: 'Lumio-қа қосылыңыз',
    }),
    rightTagline: t({
      ru: 'Автоматизируйте финансы уже сегодня',
      en: 'Automate your finances today',
      kk: 'Қаржыңызды бүгін автоматтандырыңыз',
    }),
    registerFailed: t({
      ru: 'Не удалось зарегистрироваться. Попробуйте ещё раз.',
      en: 'Failed to sign up. Please try again.',
      kk: 'Тіркелу мүмкін болмады. Қайтадан көріңіз.',
    }),
    googleRegisterFailed: t({
      ru: 'Не удалось зарегистрироваться через Google. Попробуйте ещё раз.',
      en: 'Failed to sign up with Google. Please try again.',
      kk: 'Google арқылы тіркелу мүмкін болмады. Қайтадан көріңіз.',
    }),
    orLabel: t({
      ru: 'или',
      en: 'or',
      kk: 'немесе',
    }),
    inviteLoadFailed: t({
      ru: 'Не удалось загрузить данные приглашения. Попробуйте ещё раз.',
      en: 'Failed to load invitation details. Please try again.',
      kk: 'Шақыру деректерін жүктеу мүмкін болмады. Қайтадан көріңіз.',
    }),
  },
} satisfies Dictionary;

export default content;

import { t, type DeclarationContent } from 'intlayer';

export default {
  key: 'workspaces-selector',
  content: {
    title: t({
      en: 'Select Workspace',
      ru: 'Выбрать рабочее пространство',
      kk: 'Жұмыс кеңістігін таңдау',
    }),
    subtitle: t({
      en: 'Choose a workspace to continue',
      ru: 'Выберите рабочее пространство для продолжения',
      kk: 'Жалғастыру үшін жұмыс кеңістігін таңдаңыз',
    }),
    createWorkspace: t({
      en: 'Create New Workspace',
      ru: 'Создать новое пространство',
      kk: 'Жаңа кеңістік құру',
    }),
    noWorkspaces: t({
      en: 'You have no workspaces yet',
      ru: 'У вас пока нет рабочих пространств',
      kk: 'Әзірге жұмыс кеңістіктері жоқ',
    }),
    loading: t({
      en: 'Loading workspaces...',
      ru: 'Загрузка пространств...',
      kk: 'Кеңістіктерді жүктеу...',
    }),
    members: t({
      en: 'members',
      ru: 'участников',
      kk: 'мүшелер',
    }),
    integrations: t({
      en: 'integrations',
      ru: 'интеграций',
      kk: 'интеграциялар',
    }),
    activeRecently: t({
      en: 'Active recently',
      ru: 'Активно недавно',
      kk: 'Жақында белсенді',
    }),
    roles: {
      owner: t({
        en: 'Owner',
        ru: 'Владелец',
        kk: 'Иесі',
      }),
      admin: t({
        en: 'Admin',
        ru: 'Администратор',
        kk: 'Әкімші',
      }),
      member: t({
        en: 'Member',
        ru: 'Участник',
        kk: 'Мүше',
      }),
      viewer: t({
        en: 'Viewer',
        ru: 'Наблюдатель',
        kk: 'Қараушы',
      }),
    },
  },
} satisfies DeclarationContent;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'navigation',
  content: {
    nav: {
      dashboard: t({
        ru: 'Дашборд',
        en: 'Dashboard',
        kk: 'Дашборд',
      }),
      statements: t({
        ru: 'Выписки',
        en: 'Statements',
        kk: 'Үзінділер',
      }),
      receipts: t({
        ru: 'Чеки',
        en: 'Receipts',
        kk: 'Чектер',
      }),
      workspaces: t({
        ru: 'Рабочие пространства',
        en: 'Workspaces',
        kk: 'Жұмыс кеңістіктері',
      }),
      storage: t({
        ru: 'Хранилище',
        en: 'Storage',
        kk: 'Қойма',
      }),
      dataEntry: t({
        ru: 'Ввод данных',
        en: 'Data entry',
        kk: 'Деректерді енгізу',
      }),
      tables: t({
        ru: 'Таблицы',
        en: 'Tables',
        kk: 'Кестелер',
      }),
      reports: t({
        ru: 'Отчёты',
        en: 'Reports',
        kk: 'Есептер',
      }),
      categories: t({
        ru: 'Категории',
        en: 'Categories',
        kk: 'Санаттар',
      }),
    },
    userMenu: {
      profile: t({
        ru: 'Профиль',
        en: 'Profile',
        kk: 'Профиль',
      }),
      settings: t({
        ru: 'Настройки',
        en: 'Settings',
        kk: 'Баптаулар',
      }),
      workspace: t({
        ru: 'Рабочее пространство',
        en: 'Workspace',
        kk: 'Жұмыс кеңістігі',
      }),
      integrations: t({
        ru: 'Интеграции',
        en: 'Integrations',
        kk: 'Интеграциялар',
      }),
      supportedBanks: t({
        ru: 'Поддерживаемые банки',
        en: 'Supported banks',
        kk: 'Қолдау көрсетілетін банктер',
      }),
      trash: t({
        ru: 'Корзина',
        en: 'Trash',
        kk: 'Себет',
      }),
      categories: t({
        ru: 'Категории',
        en: 'Categories',
        kk: 'Санаттар',
      }),
      admin: t({
        ru: 'Админка',
        en: 'Activity',
        kk: 'Админка',
      }),
      knowledgeBase: t({
        ru: 'База знаний',
        en: 'Knowledge base',
        kk: 'Білім қоры',
      }),
      logout: t({
        ru: 'Выйти',
        en: 'Log out',
        kk: 'Шығу',
      }),
      logoutSuccess: t({
        ru: 'Вы успешно вышли из системы',
        en: 'You have successfully logged out',
        kk: 'Сіз жүйеден сәтті шықтыңыз',
      }),
      language: t({
        ru: 'Язык',
        en: 'Language',
        kk: 'Тіл',
      }),
      moreActions: t({
        ru: 'Меню',
        en: 'Menu',
        kk: 'Мәзір',
      }),
    },
    languageModal: {
      sectionLabel: t({
        ru: 'Интерфейс',
        en: 'Interface',
        kk: 'Интерфейс',
      }),
      title: t({
        ru: 'Выбор языка',
        en: 'Choose language',
        kk: 'Тілді таңдау',
      }),
      back: t({
        ru: 'Назад',
        en: 'Back',
        kk: 'Артқа',
      }),
      currentLanguageLabel: t({
        ru: 'Текущий язык',
        en: 'Current language',
        kk: 'Ағымдағы тіл',
      }),
      defaultLanguageNote: t({
        ru: 'По умолчанию',
        en: 'Default',
        kk: 'Әдепкі',
      }),
      changeLanguage: t({
        ru: 'Сменить язык',
        en: 'Change language',
        kk: 'Тілді өзгерту',
      }),
      availableLanguagesLabel: t({
        ru: 'Доступные языки',
        en: 'Available languages',
        kk: 'Қолжетімді тілдер',
      }),
      chooseAction: t({
        ru: 'Выбрать',
        en: 'Select',
        kk: 'Таңдау',
      }),
      scrollHint: t({
        ru: 'Прокрутите список и выберите язык.',
        en: 'Scroll the list and choose a language.',
        kk: 'Тізімді жылжытып, тілді таңдаңыз.',
      }),
      footerHint: t({
        ru: 'Переводы будут добавлены на следующем этапе.',
        en: 'Translations will be added in the next step.',
        kk: 'Аудармалар келесі кезеңде қосылады.',
      }),
      cancel: t({
        ru: 'Отмена',
        en: 'Cancel',
        kk: 'Болдырмау',
      }),
      save: t({
        ru: 'Сохранить',
        en: 'Save',
        kk: 'Сақтау',
      }),
      savedToastPrefix: t({
        ru: 'Язык выбран',
        en: 'Language selected',
        kk: 'Тіл таңдалды',
      }),
    },
    tour: {
      start: t({
        ru: 'Показать тур',
        en: 'Start tour',
        kk: 'Турды бастау',
      }),
      menuLabel: t({
        ru: 'Туры',
        en: 'Tours',
        kk: 'Турлар',
      }),
      progressText: t({
        ru: '{{current}} из {{total}}',
        en: '{{current}} of {{total}}',
        kk: '{{current}} / {{total}}',
      }),
      buttons: {
        next: t({ ru: 'Далее', en: 'Next', kk: 'Келесі' }),
        prev: t({ ru: 'Назад', en: 'Back', kk: 'Артқа' }),
        done: t({ ru: 'Готово', en: 'Done', kk: 'Дайын' }),
        close: t({ ru: 'Закрыть', en: 'Close', kk: 'Жабу' }),
      },
      fallback: {
        noTargets: t({
          ru: 'Не удалось запустить тур: элементы недоступны на этой странице.',
          en: 'Could not start the tour: targets are not available on this page.',
          kk: 'Турды бастау мүмкін болмады: элементтер бұл бетте қолжетімсіз.',
        }),
      },
      steps: {
        brand: {
          title: t({
            ru: 'Ваше рабочее пространство',
            en: 'Your workspace',
            kk: 'Сіздің жұмыс кеңістігі',
          }),
          description: t({
            ru: 'Логотип Lumio ведет на главную страницу.',
            en: 'Lumio logo brings you back to the home dashboard.',
            kk: 'Lumio логотипі басты бетке қайтарады.',
          }),
        },
        navigation: {
          title: t({
            ru: 'Основные разделы',
            en: 'Main sections',
            kk: 'Негізгі бөлімдер',
          }),
          description: t({
            ru: 'Здесь доступ к выпискам, хранилищу, вводу данных, таблицам и отчетам.',
            en: 'Access statements, storage, data entry, custom tables, and reports here.',
            kk: 'Мұнда үзінділер, қойма, деректер енгізу, кестелер және есептерге қолжетімділік.',
          }),
        },
        theme: {
          title: t({
            ru: 'Темная и светлая темы',
            en: 'Light and dark themes',
            kk: 'Жарық және қараңғы тақырыптар',
          }),
          description: t({
            ru: 'Переключайте тему интерфейса и следуйте системным настройкам.',
            en: 'Switch the interface theme or follow your system preference.',
            kk: 'Интерфейс тақырыбын ауыстырыңыз немесе жүйелік баптауды пайдаланыңыз.',
          }),
        },
        userMenu: {
          title: t({
            ru: 'Профиль и настройки',
            en: 'Profile and settings',
            kk: 'Профиль және баптаулар',
          }),
          description: t({
            ru: 'Откройте меню, чтобы перейти в настройки, управление рабочим пространством, интеграции или выйти.',
            en: 'Open the menu to manage settings, workspace, integrations, or log out.',
            kk: 'Мәзірді ашып, баптауларды, жұмыс кеңістігін, интеграцияларды басқару немесе шығу.',
          }),
        },
        mobileMenu: {
          title: t({
            ru: 'Меню на мобильных',
            en: 'Mobile menu',
            kk: 'Мобильді мәзір',
          }),
          description: t({
            ru: 'Используйте бургер, чтобы открыть навигацию на небольших экранах.',
            en: 'Use the burger to open navigation on small screens.',
            kk: 'Кіші экрандарда навигацияны ашу үшін бургерді пайдаланыңыз.',
          }),
        },
      },
    },
    languages: {
      ru: t({ ru: 'Русский', en: 'Русский', kk: 'Русский' }),
      en: t({ ru: 'English', en: 'English', kk: 'English' }),
      kk: t({ ru: 'Қазақша', en: 'Қазақша', kk: 'Қазақша' }),
    },
  },
} satisfies Dictionary;

export default content;

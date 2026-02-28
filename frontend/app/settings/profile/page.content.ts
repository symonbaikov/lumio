import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'settingsProfilePage',
  content: {
    authRequired: t({
      ru: 'Войдите в систему, чтобы управлять профилем.',
      en: 'Log in to manage your profile.',
      kk: 'Профильді басқару үшін жүйеге кіріңіз.',
    }),
    title: t({
      ru: 'Настройки профиля',
      en: 'Profile settings',
      kk: 'Профиль баптаулары',
    }),
    subtitle: t({
      ru: 'Обновите контактный email и пароль. Изменения вступают в силу сразу после сохранения.',
      en: 'Update your contact email and password. Changes take effect immediately after saving.',
      kk: 'Байланыс email-ін және құпиясөзді жаңартыңыз. Өзгерістер сақтағаннан кейін бірден күшіне енеді.',
    }),
    navigation: {
      title: t({ ru: 'Разделы', en: 'Sections', kk: 'Бөлімдер' }),
      sectionLabel: t({ ru: 'Раздел', en: 'Section', kk: 'Бөлім' }),
    },
    changelogCard: {
      title: t({ ru: 'Changelog', en: 'Changelog', kk: 'Changelog' }),
      description: t({
        ru: 'Краткая лента обновлений продукта.',
        en: 'A compact stream of product updates.',
        kk: 'Өнім жаңартуларының қысқаша таспасы.',
      }),
      loading: t({
        ru: 'Загружаем changelog...',
        en: 'Loading changelog...',
        kk: 'Changelog жүктелуде...',
      }),
      empty: t({
        ru: 'Пока нет опубликованных обновлений.',
        en: 'No published updates yet.',
        kk: 'Жарияланған жаңартулар әлі жоқ.',
      }),
      openDetails: t({
        ru: 'Открыть детали',
        en: 'Open details',
        kk: 'Толығырақ ашу',
      }),
      releaseLabel: t({
        ru: 'Релиз',
        en: 'Release',
        kk: 'Релиз',
      }),
      closeLabel: t({
        ru: 'Закрыть changelog',
        en: 'Close changelog',
        kk: 'Changelog жабу',
      }),
    },
    validation: {
      passwordRequiredForEmail: t({
        ru: 'Введите текущий пароль для подтверждения.',
        en: 'Enter your current password to confirm.',
        kk: 'Растау үшін ағымдағы құпиясөзді енгізіңіз.',
      }),
      passwordMismatch: t({
        ru: 'Новый пароль и подтверждение не совпадают.',
        en: 'New password and confirmation do not match.',
        kk: 'Жаңа құпиясөз бен растау сәйкес келмейді.',
      }),
    },
    emailCard: {
      title: t({ ru: 'Email', en: 'Email', kk: 'Email' }),
      newEmailLabel: t({
        ru: 'Новый email',
        en: 'New email',
        kk: 'Жаңа email',
      }),
      currentPasswordLabel: t({
        ru: 'Текущий пароль',
        en: 'Current password',
        kk: 'Ағымдағы құпиясөз',
      }),
      currentPasswordHelp: t({
        ru: 'Мы запрашиваем пароль, чтобы подтвердить смену email.',
        en: 'We ask for your password to confirm the email change.',
        kk: 'Email өзгерісін растау үшін құпиясөз сұраймыз.',
      }),
      submit: t({
        ru: 'Обновить email',
        en: 'Update email',
        kk: 'Email жаңарту',
      }),
      successFallback: t({
        ru: 'Email успешно обновлён.',
        en: 'Email updated successfully.',
        kk: 'Email сәтті жаңартылды.',
      }),
      errorFallback: t({
        ru: 'Не удалось обновить email.',
        en: 'Failed to update email.',
        kk: 'Email жаңарту мүмкін болмады.',
      }),
    },
    profileCard: {
      title: t({ ru: 'Профиль', en: 'Profile', kk: 'Профиль' }),
      nameLabel: t({ ru: 'Имя', en: 'Name', kk: 'Аты' }),
      languageLabel: t({ ru: 'Язык интерфейса', en: 'Language', kk: 'Тіл' }),
      timeZoneLabel: t({
        ru: 'Часовой пояс',
        en: 'Time zone',
        kk: 'Уақыт белдеуі',
      }),
      timeZoneHelp: t({
        ru: 'Оставьте «Авто», чтобы использовать часовой пояс устройства.',
        en: 'Keep “Auto” to use your device time zone.',
        kk: 'Құрылғының уақыт белдеуін қолдану үшін «Авто» қалдырыңыз.',
      }),
      submit: t({ ru: 'Сохранить', en: 'Save', kk: 'Сақтау' }),
      unsavedChanges: t({
        ru: 'Есть несохранённые изменения.',
        en: 'Unsaved changes.',
        kk: 'Сақталмаған өзгерістер бар.',
      }),
      successFallback: t({
        ru: 'Профиль обновлён.',
        en: 'Profile updated.',
        kk: 'Профиль жаңартылды.',
      }),
      errorFallback: t({
        ru: 'Не удалось обновить профиль.',
        en: 'Failed to update profile.',
        kk: 'Профильді жаңарту мүмкін болмады.',
      }),
      languages: {
        ru: t({ ru: 'Русский', en: 'Русский', kk: 'Русский' }),
        en: t({ ru: 'English', en: 'English', kk: 'English' }),
        kk: t({ ru: 'Қазақша', en: 'Қазақша', kk: 'Қазақша' }),
        auto: t({ ru: 'Авто', en: 'Auto', kk: 'Авто' }),
      },
      timeZones: {
        auto: t({ ru: 'Авто', en: 'Auto', kk: 'Авто' }),
        utc: t({ ru: 'UTC', en: 'UTC', kk: 'UTC' }),
        europeMoscow: t({
          ru: 'Europe/Moscow',
          en: 'Europe/Moscow',
          kk: 'Europe/Moscow',
        }),
        asiaAlmaty: t({
          ru: 'Asia/Almaty',
          en: 'Asia/Almaty',
          kk: 'Asia/Almaty',
        }),
      },
      editPhotoLabel: t({
        ru: 'Изменить фото',
        en: 'Edit photo',
        kk: 'Фотоны өзгерту',
      }),
      avatarUpdated: t({
        ru: 'Аватар обновлен.',
        en: 'Avatar updated.',
        kk: 'Аватар жаңартылды.',
      }),
      avatarError: t({
        ru: 'Не удалось обновить аватар.',
        en: 'Failed to update avatar.',
        kk: 'Аватарды жаңарту мүмкін болмады.',
      }),
      avatarSizeError: t({
        ru: 'Слишком большой файл. Максимум 2 МБ.',
        en: 'File is too large. Max 2 MB.',
        kk: 'Файл тым үлкен. Ең көбі 2 МБ.',
      }),
    },
    sessionsCard: {
      title: t({ ru: 'Сеансы', en: 'Sessions', kk: 'Сеанстар' }),
      lastLoginLabel: t({
        ru: 'Последний вход',
        en: 'Last login',
        kk: 'Соңғы кіру',
      }),
      activeSessionsLabel: t({
        ru: 'Активные устройства',
        en: 'Active devices',
        kk: 'Белсенді құрылғылар',
      }),
      currentSessionBadge: t({
        ru: 'Это устройство',
        en: 'This device',
        kk: 'Бұл құрылғы',
      }),
      loadingLabel: t({
        ru: 'Загрузка сеансов...',
        en: 'Loading sessions...',
        kk: 'Сеанстар жүктелуде...',
      }),
      emptySessionsLabel: t({
        ru: 'Активные сеансы не найдены.',
        en: 'No active sessions found.',
        kk: 'Белсенді сеанстар табылмады.',
      }),
      ipLabel: t({
        ru: 'IP',
        en: 'IP',
        kk: 'IP',
      }),
      lastActiveLabel: t({
        ru: 'Последняя активность',
        en: 'Last active',
        kk: 'Соңғы белсенділік',
      }),
      logoutSessionButton: t({
        ru: 'Выйти',
        en: 'Log out',
        kk: 'Шығу',
      }),
      sessionLogoutSuccess: t({
        ru: 'Сеанс завершен.',
        en: 'Session logged out.',
        kk: 'Сеанс аяқталды.',
      }),
      sessionLogoutError: t({
        ru: 'Не удалось завершить сеанс.',
        en: 'Failed to log out session.',
        kk: 'Сеансты аяқтау мүмкін болмады.',
      }),
      sessionsLoadError: t({
        ru: 'Не удалось загрузить список сеансов.',
        en: 'Failed to load sessions list.',
        kk: 'Сеанстар тізімін жүктеу мүмкін болмады.',
      }),
      logoutAllHelp: t({
        ru: 'Завершает все активные сессии на других устройствах и в других браузерах.',
        en: 'Ends all active sessions on other devices and browsers.',
        kk: 'Басқа құрылғылар мен браузерлердегі барлық белсенді сеанстарды аяқтайды.',
      }),
      securityHint: t({
        ru: 'Завершайте только знакомые сеансы. Выход с текущего устройства завершит текущую авторизацию.',
        en: 'Sign out only sessions you recognize. Logging out on this device ends your current sign-in.',
        kk: 'Тек өзіңіз танитын сеанстардан шығыңыз. Осы құрылғыдан шығу ағымдағы кіруді тоқтатады.',
      }),
      logoutSessionConfirm: t({
        ru: 'Завершить этот сеанс?',
        en: 'Log out this session?',
        kk: 'Осы сеансты аяқтайсыз ба?',
      }),
      logoutCurrentConfirm: t({
        ru: 'Выйти на этом устройстве? Потребуется повторный вход.',
        en: 'Log out on this device? You will need to sign in again.',
        kk: 'Осы құрылғыдан шығасыз ба? Қайта кіру қажет болады.',
      }),
      logoutAllConfirm: t({
        ru: 'Выйти со всех устройств? На каждом устройстве потребуется вход заново.',
        en: 'Log out of all devices? You will need to sign in again on each device.',
        kk: 'Барлық құрылғылардан шығасыз ба? Әр құрылғыда қайта кіру қажет болады.',
      }),
      logoutAllButton: t({
        ru: 'Выйти со всех устройств',
        en: 'Log out of all devices',
        kk: 'Барлық құрылғылардан шығу',
      }),
    },
    passwordCard: {
      title: t({ ru: 'Пароль', en: 'Password', kk: 'Құпиясөз' }),
      currentPasswordLabel: t({
        ru: 'Текущий пароль',
        en: 'Current password',
        kk: 'Ағымдағы құпиясөз',
      }),
      newPasswordLabel: t({
        ru: 'Новый пароль',
        en: 'New password',
        kk: 'Жаңа құпиясөз',
      }),
      newPasswordHelp: t({
        ru: 'Минимум 8 символов.',
        en: 'At least 8 characters.',
        kk: 'Кемінде 8 таңба.',
      }),
      confirmPasswordLabel: t({
        ru: 'Подтвердите новый пароль',
        en: 'Confirm new password',
        kk: 'Жаңа құпиясөзді растаңыз',
      }),
      submit: t({
        ru: 'Обновить пароль',
        en: 'Update password',
        kk: 'Құпиясөз жаңарту',
      }),
      securityHint: t({
        ru: 'Используйте уникальный пароль и подтверждайте действие перед сохранением.',
        en: 'Use a unique password and confirm the action before saving.',
        kk: 'Бірегей құпиясөз қолданып, сақтар алдында әрекетті растаңыз.',
      }),
      confirmSubmit: t({
        ru: 'Обновить пароль сейчас? Возможно, потребуется заново войти на других устройствах.',
        en: 'Update password now? You may need to sign in again on other devices.',
        kk: 'Құпиясөзді қазір жаңартасыз ба? Басқа құрылғыларда қайта кіру қажет болуы мүмкін.',
      }),
      successFallback: t({
        ru: 'Пароль успешно обновлён.',
        en: 'Password updated successfully.',
        kk: 'Құпиясөз сәтті жаңартылды.',
      }),
      errorFallback: t({
        ru: 'Не удалось обновить пароль.',
        en: 'Failed to update password.',
        kk: 'Құпиясөзді жаңарту мүмкін болмады.',
      }),
    },
    notificationsCard: {
      title: t({ ru: 'Уведомления', en: 'Notifications', kk: 'Хабарландырулар' }),
      description: t({
        ru: 'Выберите, какие уведомления хотите получать в колокольчике.',
        en: 'Choose which notifications you want to receive in the bell.',
        kk: 'Қоңырауда қандай хабарландырулар алғыңыз келетінін таңдаңыз.',
      }),
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      workspace: {
        title: t({
          ru: 'Активность workspace',
          en: 'Workspace activity',
          kk: 'Workspace белсенділігі',
        }),
        description: t({
          ru: 'Уведомления о действиях других участников',
          en: 'Notifications about actions of other members',
          kk: 'Басқа қатысушылар әрекеттері туралы хабарландырулар',
        }),
      },
      system: {
        title: t({
          ru: 'Системные уведомления',
          en: 'System notifications',
          kk: 'Жүйелік хабарландырулар',
        }),
        description: t({
          ru: 'Критичные события и ошибки обработки данных',
          en: 'Critical events and data processing errors',
          kk: 'Маңызды оқиғалар мен деректерді өңдеу қателері',
        }),
      },
      items: {
        statementUploaded: {
          label: t({ ru: 'Загрузка выписок', en: 'Statement uploads', kk: 'Үзінді жүктеу' }),
          description: t({
            ru: 'Когда участники загружают новые выписки',
            en: 'When members upload new statements',
            kk: 'Қатысушылар жаңа үзінді жүктеген кезде',
          }),
        },
        importCommitted: {
          label: t({ ru: 'Импорт транзакций', en: 'Transaction import', kk: 'Транзакция импорты' }),
          description: t({
            ru: 'Когда участники подтверждают импорт транзакций',
            en: 'When members confirm transaction import',
            kk: 'Қатысушылар транзакция импортын растаған кезде',
          }),
        },
        categoryChanges: {
          label: t({ ru: 'Изменение категорий', en: 'Category changes', kk: 'Санат өзгерістері' }),
          description: t({
            ru: 'Создание, изменение и удаление категорий',
            en: 'Category creation, updates, and deletion',
            kk: 'Санатты құру, өзгерту және жою',
          }),
        },
        memberActivity: {
          label: t({
            ru: 'Активность участников',
            en: 'Member activity',
            kk: 'Қатысушылар белсенділігі',
          }),
          description: t({
            ru: 'Приглашения и вступление новых участников',
            en: 'Invites and new member joins',
            kk: 'Жаңа қатысушыларды шақыру және қосылу',
          }),
        },
        dataDeleted: {
          label: t({ ru: 'Удаление данных', en: 'Data deletion', kk: 'Деректерді жою' }),
          description: t({
            ru: 'Удаление транзакций, выписок и других данных',
            en: 'Deletion of transactions, statements, and other data',
            kk: 'Транзакция, үзінді және басқа деректерді жою',
          }),
        },
        workspaceUpdated: {
          label: t({
            ru: 'Настройки workspace',
            en: 'Workspace settings',
            kk: 'Workspace баптаулары',
          }),
          description: t({
            ru: 'Изменение названия, валюты и других параметров',
            en: 'Changes in name, currency, and other settings',
            kk: 'Атау, валюта және басқа параметрлер өзгерісі',
          }),
        },
        parsingErrors: {
          label: t({ ru: 'Ошибки парсинга', en: 'Parsing errors', kk: 'Талдау қателері' }),
          description: t({
            ru: 'Проблемы при обработке выписок',
            en: 'Issues while processing statements',
            kk: 'Үзіндіні өңдеу кезіндегі мәселелер',
          }),
        },
        importFailures: {
          label: t({ ru: 'Ошибки импорта', en: 'Import failures', kk: 'Импорт қателері' }),
          description: t({
            ru: 'Импорт завершился с ошибкой',
            en: 'Import finished with an error',
            kk: 'Импорт қателікпен аяқталды',
          }),
        },
        uncategorizedItems: {
          label: t({
            ru: 'Операции без категории',
            en: 'Uncategorized items',
            kk: 'Санатсыз операциялар',
          }),
          description: t({
            ru: 'Транзакции и чеки, требующие категоризации',
            en: 'Transactions and receipts that require categorization',
            kk: 'Санаттауды қажет ететін транзакциялар мен чектер',
          }),
        },
      },
      messages: {
        saved: t({ ru: 'Настройки сохранены', en: 'Settings saved', kk: 'Баптаулар сақталды' }),
      },
      errors: {
        load: t({
          ru: 'Не удалось загрузить настройки уведомлений',
          en: 'Failed to load notification settings',
          kk: 'Хабарландыру баптауларын жүктеу мүмкін болмады',
        }),
        save: t({
          ru: 'Не удалось сохранить настройки уведомлений',
          en: 'Failed to save notification settings',
          kk: 'Хабарландыру баптауларын сақтау мүмкін болмады',
        }),
      },
    },
    appearanceCard: {
      title: t({ ru: 'Внешний вид', en: 'Appearance', kk: 'Көрініс' }),
      description: t({
        ru: 'Настройте тему приложения',
        en: 'Configure application theme',
        kk: 'Қолданба тақырыбын баптаңыз',
      }),
      themeLabel: t({ ru: 'Тема', en: 'Theme', kk: 'Тақырып' }),
      themeHelp: t({
        ru: 'Выберите светлую или тёмную тему.',
        en: 'Choose light or dark theme.',
        kk: 'Ашық немесе қараңғы тақырыпты таңдаңыз.',
      }),
      light: t({ ru: 'Светлая', en: 'Light', kk: 'Жарық' }),
      dark: t({ ru: 'Тёмная', en: 'Dark', kk: 'Қараңғы' }),
      system: t({ ru: 'Системная', en: 'System', kk: 'Жүйелік' }),
      active: t({
        ru: 'Активная тема',
        en: 'Active theme',
        kk: 'Белсенді тақырып',
      }),
      followsSystem: t({
        ru: 'Следует настройкам темы вашей системы.',
        en: 'Follows your system settings.',
        kk: 'Жүйе тақырып баптауларына сәйкес келеді.',
      }),
    },
  },
} satisfies Dictionary;

export default content;

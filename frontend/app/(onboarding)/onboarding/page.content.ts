import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'onboardingPage',
  content: {
    progressLabel: t({
      ru: 'Шаг {current} из {total}',
      en: 'Step {current} of {total}',
      kk: '{total} қадамның {current}-қадамы',
    }),
    steps: {
      welcome: t({ ru: 'Старт', en: 'Start', kk: 'Бастау' }),
      language: t({ ru: 'Язык', en: 'Language', kk: 'Тіл' }),
      workspace: t({ ru: 'Воркспейс', en: 'Workspace', kk: 'Жұмыс кеңістігі' }),
      integrations: t({ ru: 'Интеграции', en: 'Integrations', kk: 'Интеграциялар' }),
      completion: t({ ru: 'Готово', en: 'Done', kk: 'Дайын' }),
    },
    welcome: {
      badge: t({ ru: 'Добро пожаловать', en: 'Welcome', kk: 'Қош келдіңіз' }),
      title: t({
        ru: 'Настроим Lumio под вас',
        en: "Let's tailor Lumio for you",
        kk: 'Lumio-ны сізге бейімдейік',
      }),
      subtitle: t({
        ru: 'Это займет пару минут: выберем язык, базовую валюту и подключим нужные интеграции.',
        en: 'This takes a couple of minutes: choose language, default currency, and integrations.',
        kk: 'Бұл бірнеше минут алады: тілді, негізгі валютаны және интеграцияларды таңдаңыз.',
      }),
      nextTitle: t({
        ru: 'Что будет дальше',
        en: 'What happens next',
        kk: 'Келесі қадамдар',
      }),
      nextSteps: {
        language: t({
          ru: 'Выберите язык интерфейса и часовой пояс',
          en: 'Pick interface language and timezone',
          kk: 'Интерфейс тілі мен уақыт белдеуін таңдаңыз',
        }),
        workspace: t({
          ru: 'Настройте название, валюту и фон воркспейса',
          en: 'Set workspace name, currency, and background',
          kk: 'Жұмыс кеңістігінің атауын, валютасын және фонын орнатыңыз',
        }),
        integrations: t({
          ru: 'Подключите интеграции, которые нужны сейчас',
          en: 'Connect integrations you need right now',
          kk: 'Қазір керек интеграцияларды қосыңыз',
        }),
      },
      points: {
        fastSetup: t({
          ru: 'Быстрая первоначальная настройка',
          en: 'Quick initial setup',
          kk: 'Жылдам бастапқы баптау',
        }),
        integrations: t({
          ru: 'Подключение сервисов в один клик',
          en: 'Connect services in one click',
          kk: 'Сервистерді бір шерту арқылы қосу',
        }),
        control: t({
          ru: 'Понятный старт и полный контроль',
          en: 'Clear start and full control',
          kk: 'Түсінікті бастау және толық бақылау',
        }),
      },
    },
    language: {
      title: t({
        ru: 'Язык и часовой пояс',
        en: 'Language and timezone',
        kk: 'Тіл және уақыт белдеуі',
      }),
      subtitle: t({
        ru: 'Выберите удобный язык интерфейса и ваш часовой пояс для корректного времени в отчетах.',
        en: 'Choose your preferred interface language and timezone for accurate report timestamps.',
        kk: 'Есептердегі уақыт дұрыс болуы үшін интерфейс тілін және уақыт белдеуін таңдаңыз.',
      }),
      localeLabel: t({ ru: 'Язык', en: 'Language', kk: 'Тіл' }),
      localeOptions: {
        ru: t({ ru: 'Русский', en: 'Russian', kk: 'Орыс тілі' }),
        en: t({ ru: 'English', en: 'English', kk: 'English' }),
        kk: t({ ru: 'Қазақша', en: 'Kazakh', kk: 'Қазақша' }),
      },
      timeZoneLabel: t({ ru: 'Часовой пояс', en: 'Timezone', kk: 'Уақыт белдеуі' }),
      timeZonePlaceholder: t({
        ru: 'Выберите часовой пояс',
        en: 'Select timezone',
        kk: 'Уақыт белдеуін таңдаңыз',
      }),
      timeZoneHint: t({
        ru: 'Вы всегда сможете изменить это позже в настройках профиля.',
        en: 'You can always change this later in profile settings.',
        kk: 'Мұны кейін профиль баптауларында өзгерте аласыз.',
      }),
      timeZoneNoOptions: t({
        ru: 'Часовые пояса не найдены',
        en: 'No matching timezones found',
        kk: 'Сәйкес уақыт белдеуі табылмады',
      }),
    },
    workspace: {
      title: t({
        ru: 'Настройка первого воркспейса',
        en: 'Set up your first workspace',
        kk: 'Алғашқы жұмыс кеңістігін баптау',
      }),
      subtitle: t({
        ru: 'Задайте название и валюту по умолчанию для корректного учета данных.',
        en: 'Set workspace name and default currency for accurate data tracking.',
        kk: 'Деректерді дұрыс жүргізу үшін жұмыс кеңістігінің атауын және негізгі валютаны орнатыңыз.',
      }),
      nameLabel: t({
        ru: 'Название воркспейса',
        en: 'Workspace name',
        kk: 'Жұмыс кеңістігінің атауы',
      }),
      namePlaceholder: t({
        ru: 'Например: My Company workspace',
        en: 'For example: My Company workspace',
        kk: 'Мысалы: My Company workspace',
      }),
      currencyHint: t({
        ru: 'Эта валюта будет использоваться по умолчанию при создании новых записей.',
        en: 'This currency will be used by default for new records.',
        kk: 'Бұл валюта жаңа жазбалар үшін әдепкі ретінде қолданылады.',
      }),
      currencyPickerTitle: t({
        ru: 'Выберите валюту',
        en: 'Select a currency',
        kk: 'Валютаны таңдаңыз',
      }),
      currencyPickerSubtitle: t({
        ru: 'Найдите и выберите валюту, которая будет использоваться по умолчанию.',
        en: 'Find and select the currency that will be used by default.',
        kk: 'Әдепкі бойынша қолданылатын валютаны тауып таңдаңыз.',
      }),
      backgroundLabel: t({
        ru: 'Фон воркспейса',
        en: 'Workspace background',
        kk: 'Жұмыс кеңістігінің фоны',
      }),
      customBackgroundLabel: t({
        ru: 'Своя картинка (URL)',
        en: 'Custom image (URL)',
        kk: 'Жеке сурет (URL)',
      }),
      customBackgroundPlaceholder: t({
        ru: 'https://example.com/my-image.jpg',
        en: 'https://example.com/my-image.jpg',
        kk: 'https://example.com/my-image.jpg',
      }),
      customBackgroundHint: t({
        ru: 'Можно вставить ссылку на свою картинку или выбрать одну из готовых ниже.',
        en: 'Paste your own image URL or choose one of the presets below.',
        kk: 'Өз суретіңіздің URL сілтемесін енгізіңіз немесе дайын нұсқалардың бірін таңдаңыз.',
      }),
    },
    integrations: {
      title: t({
        ru: 'Подключите нужные интеграции',
        en: 'Connect your integrations',
        kk: 'Қажетті интеграцияларды қосыңыз',
      }),
      subtitle: t({
        ru: 'Выберите сервисы, которые хотите настроить сейчас. Можно подключить и позже.',
        en: 'Pick services you want to set up now. You can connect them later as well.',
        kk: 'Қазір баптағыңыз келетін сервистерді таңдаңыз. Кейін де қосуға болады.',
      }),
      helper: t({
        ru: 'Если пропустить шаг, интеграции можно подключить в разделе Настройки -> Интеграции.',
        en: 'If you skip this step, you can connect integrations later in Settings -> Integrations.',
        kk: 'Бұл қадамды өткізіп жіберсеңіз, интеграцияларды кейін Баптаулар -> Интеграциялар бөлімінен қоса аласыз.',
      }),
      connectFailed: t({
        ru: 'Не удалось подключить интеграцию. Попробуйте еще раз.',
        en: 'Failed to connect integration. Please try again.',
        kk: 'Интеграцияны қосу мүмкін болмады. Қайта көріңіз.',
      }),
      cards: {
        gmail: {
          title: t({ ru: 'Gmail', en: 'Gmail', kk: 'Gmail' }),
          description: t({
            ru: 'Автоматически импортируйте чеки и инвойсы из Gmail.',
            en: 'Automatically import receipts and invoices from Gmail.',
            kk: 'Gmail-ден чектер мен инвойстарды автоматты түрде импорттаңыз.',
          }),
          action: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
        },
        googleDrive: {
          title: t({ ru: 'Google Drive', en: 'Google Drive', kk: 'Google Drive' }),
          description: t({
            ru: 'Синхронизируйте выписки с Google Drive и импортируйте файлы.',
            en: 'Sync statements with Google Drive and import files.',
            kk: 'Үзінділерді Google Drive-пен синхрондап, файлдарды импорттаңыз.',
          }),
          action: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
        },
        dropbox: {
          title: t({ ru: 'Dropbox', en: 'Dropbox', kk: 'Dropbox' }),
          description: t({
            ru: 'Синхронизируйте выписки с Dropbox и импортируйте файлы.',
            en: 'Sync statements with Dropbox and import files.',
            kk: 'Үзінділерді Dropbox-пен синхрондап, файлдарды импорттаңыз.',
          }),
          action: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
        },
        googleSheets: {
          title: t({ ru: 'Google Sheets', en: 'Google Sheets', kk: 'Google Sheets' }),
          description: t({
            ru: 'Отправляйте распарсенные транзакции в выбранную таблицу.',
            en: 'Send parsed transactions to a selected spreadsheet.',
            kk: 'Өңделген транзакцияларды таңдалған кестеге жіберіңіз.',
          }),
          action: t({ ru: 'Открыть настройку', en: 'Open setup', kk: 'Баптауды ашу' }),
        },
        telegram: {
          title: t({ ru: 'Telegram', en: 'Telegram', kk: 'Telegram' }),
          description: t({
            ru: 'Получайте уведомления и отправляйте выписки через бота.',
            en: 'Receive notifications and send statements via bot.',
            kk: 'Хабарламалар алыңыз және үзінділерді бот арқылы жіберіңіз.',
          }),
          action: t({ ru: 'Настроить', en: 'Set up', kk: 'Баптау' }),
        },
      },
      connectedBadge: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
      availableBadge: t({ ru: 'Доступно', en: 'Available', kk: 'Қолжетімді' }),
    },
    completion: {
      title: t({
        ru: 'Готово! Все настроено',
        en: 'Done! Setup complete',
        kk: 'Дайын! Баптау аяқталды',
      }),
      subtitle: t({
        ru: 'Нажмите кнопку ниже, и перейдете в рабочее пространство.',
        en: 'Press the button below to continue to your workspace.',
        kk: 'Төмендегі батырманы басып, жұмыс кеңістігіне өтіңіз.',
      }),
      summaryTitle: t({ ru: 'Ваши настройки', en: 'Your setup', kk: 'Сіздің баптауларыңыз' }),
      notSet: t({ ru: 'не задано', en: 'not set', kk: 'орнатылмаған' }),
      summary: {
        language: t({ ru: 'Язык: {value}', en: 'Language: {value}', kk: 'Тіл: {value}' }),
        timeZone: t({
          ru: 'Часовой пояс: {value}',
          en: 'Timezone: {value}',
          kk: 'Уақыт белдеуі: {value}',
        }),
        workspace: t({
          ru: 'Воркспейс: {value}',
          en: 'Workspace: {value}',
          kk: 'Жұмыс кеңістігі: {value}',
        }),
        currency: t({ ru: 'Валюта: {value}', en: 'Currency: {value}', kk: 'Валюта: {value}' }),
        integrations: t({
          ru: 'Подключенные интеграции:',
          en: 'Connected integrations:',
          kk: 'Қосылған интеграциялар:',
        }),
        background: t({
          ru: 'Фон воркспейса: {value}',
          en: 'Workspace background: {value}',
          kk: 'Жұмыс кеңістігінің фоны: {value}',
        }),
      },
      backgroundSet: t({ ru: 'установлен', en: 'set', kk: 'орнатылған' }),
      noIntegrations: t({
        ru: 'Интеграции не подключены',
        en: 'No integrations connected',
        kk: 'Интеграциялар қосылмаған',
      }),
    },
    navigation: {
      back: t({ ru: 'Назад', en: 'Back', kk: 'Артқа' }),
      next: t({ ru: 'Далее', en: 'Next', kk: 'Келесі' }),
      finish: t({ ru: 'Начать работу', en: 'Start using app', kk: 'Жұмысты бастау' }),
      skip: t({ ru: 'Пропустить', en: 'Skip', kk: 'Өткізу' }),
      skipAll: t({ ru: 'Пропустить все', en: 'Skip all', kk: 'Барлығын өткізу' }),
      saving: t({ ru: 'Сохраняем...', en: 'Saving...', kk: 'Сақталуда...' }),
    },
    errors: {
      workspaceLoadFailed: t({
        ru: 'Не удалось загрузить данные воркспейса. Можно продолжить с настройками по умолчанию.',
        en: 'Failed to load workspace data. You can continue with default settings.',
        kk: 'Жұмыс кеңістігі деректерін жүктеу мүмкін болмады. Әдепкі баптаулармен жалғастыра аласыз.',
      }),
      completeFailed: t({
        ru: 'Не удалось завершить онбординг. Попробуйте еще раз.',
        en: 'Failed to complete onboarding. Please try again.',
        kk: 'Онбордингті аяқтау мүмкін болмады. Қайта көріңіз.',
      }),
    },
  },
} satisfies Dictionary;

export default content;

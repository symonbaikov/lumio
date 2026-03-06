// Mock i18n translations for Storybook
// Returns objects with .value accessor matching the intlayer pattern

export const mockTranslations = {
  confirmModal: {
    buttons: {
      confirm: { value: 'Подтвердить' },
      cancel: { value: 'Отмена' },
    },
    sr: {
      close: { value: 'Закрыть' },
    },
  },

  transactionsSummaryBar: {
    uploadedAt: { value: 'Загружено' },
    parsed: { value: 'Распознано' },
    warnings: { value: 'Предупреждения' },
    errors: { value: 'Ошибки' },
    uncategorized: { value: 'Без категории' },
    debitTotal: { value: 'Расход' },
    creditTotal: { value: 'Приход' },
    fixIssues: { value: 'Исправить проблемы' },
    export: { value: 'Экспорт' },
    share: { value: 'Поделиться' },
  },

  transactionsDrawer: {
    title: { value: 'Детали транзакции' },
    date: { value: 'Дата' },
    documentNumber: { value: 'Номер документа' },
    counterparty: { value: 'Контрагент' },
    bin: { value: 'БИН' },
    purpose: { value: 'Назначение платежа' },
    debit: { value: 'Расход' },
    credit: { value: 'Приход' },
    additionalDetails: { value: 'Дополнительно' },
    currency: { value: 'Валюта' },
    exchangeRate: { value: 'Курс' },
    article: { value: 'Статья' },
    branch: { value: 'Филиал' },
    wallet: { value: 'Кошелёк' },
    parsingMetadata: { value: 'Метаданные парсинга' },
    confidence: { value: 'Уверенность' },
    rawExtract: { value: 'Исходный текст' },
    currentCategory: { value: 'Текущая категория' },
    noCategory: { value: 'Без категории' },
    actions: { value: 'Действия' },
    setCategory: { value: 'Установить категорию' },
    selectCategory: { value: 'Выберите категорию' },
    updating: { value: 'Сохранение...' },
    apply: { value: 'Применить' },
    markIgnored: { value: 'Игнорировать' },
  },

  shareDialog: {
    activeLinks: { value: 'Активные ссылки' },
    noLinks: { value: 'Нет активных ссылок' },
    permissionLabel: {
      view: { value: 'Просмотр' },
      download: { value: 'Скачивание' },
      edit: { value: 'Редактирование' },
    },
    statusLabel: {
      active: { value: 'Активна' },
      expired: { value: 'Истекла' },
    },
    untilPrefix: { value: 'до' },
    createdPrefix: { value: 'Создана' },
    visitsPrefix: { value: 'Просмотров' },
    tooltips: {
      copy: { value: 'Копировать ссылку' },
      delete: { value: 'Удалить ссылку' },
    },
  },

  permissionsPanel: {
    title: { value: 'Права доступа' },
    grantAccess: { value: 'Предоставить доступ' },
    empty: { value: 'Нет предоставленных прав' },
    confirmRevoke: { value: 'Вы уверены, что хотите отозвать доступ?' },
    table: {
      user: { value: 'Пользователь' },
      rights: { value: 'Права' },
      canReshare: { value: 'Может делиться' },
      expires: { value: 'Истекает' },
      grantedBy: { value: 'Предоставил' },
      createdAt: { value: 'Создано' },
      actions: { value: 'Действия' },
    },
    permission: {
      owner: { value: 'Владелец' },
      editor: { value: 'Редактор' },
      viewer: { value: 'Просмотр' },
      downloader: { value: 'Скачивание' },
      viewDownloadLong: { value: 'Просмотр и скачивание' },
      editorLong: { value: 'Полный доступ' },
    },
    values: {
      yes: { value: 'Да' },
      no: { value: 'Нет' },
      forever: { value: 'Бессрочно' },
    },
    tooltips: {
      edit: { value: 'Редактировать' },
      revoke: { value: 'Отозвать' },
    },
    dialogs: {
      grantTitle: { value: 'Предоставить доступ' },
      editTitle: { value: 'Редактировать доступ' },
      userIdOrEmail: { value: 'ID пользователя или Email' },
      userIdOrEmailHelp: { value: 'Введите ID или email пользователя' },
      accessLevel: { value: 'Уровень доступа' },
      expiresAt: { value: 'Срок действия' },
      expiresAtHelp: { value: 'Оставьте пустым для бессрочного доступа' },
      reshare: { value: 'Разрешить делиться' },
      cancel: { value: 'Отмена' },
      grant: { value: 'Предоставить' },
      save: { value: 'Сохранить' },
    },
    errors: {
      grantFailed: { value: 'Не удалось предоставить доступ' },
      updateFailed: { value: 'Не удалось обновить доступ' },
    },
  },

  transactionsView: {
    searchPlaceholder: { value: 'Поиск по контрагенту, назначению, категории...' },
    empty: { value: 'Нет транзакций' },
    dash: { value: '—' },
    type: {
      income: { value: 'Приход' },
      expense: { value: 'Расход' },
      transfer: { value: 'Перевод' },
    },
    columns: {
      transactionDate: { value: 'Дата' },
      documentNumber: { value: 'Номер' },
      counterpartyName: { value: 'Контрагент' },
      counterpartyBin: { value: 'БИН' },
      paymentPurpose: { value: 'Назначение' },
      debit: { value: 'Расход' },
      credit: { value: 'Приход' },
      currency: { value: 'Валюта' },
      exchangeRate: { value: 'Курс' },
      transactionType: { value: 'Тип' },
      category: { value: 'Категория' },
      article: { value: 'Статья' },
      amountForeign: { value: 'Сумма в валюте' },
      branch: { value: 'Филиал' },
      wallet: { value: 'Кошелёк' },
    },
    pagination: {
      rowsPerPage: { value: 'Строк на странице' },
      of: { value: 'из' },
    },
  },

  navigation: {
    nav: {
      statements: { value: 'Выписки' },
      storage: { value: 'Хранилище' },
      dataEntry: { value: 'Ввод данных' },
      tables: { value: 'Таблицы' },
      reports: { value: 'Отчёты' },
      categories: { value: 'Категории' },
    },
    userMenu: {
      profile: { value: 'Профиль' },
      settings: { value: 'Настройки' },
      workspace: { value: 'Рабочее пространство' },
      integrations: { value: 'Интеграции' },
      language: { value: 'Язык' },
      admin: { value: 'Администрирование' },
      logout: { value: 'Выйти' },
      logoutSuccess: { value: 'Вы вышли из системы' },
    },
    languageModal: {
      sectionLabel: { value: 'Настройки' },
      title: { value: 'Выберите язык' },
      availableLanguagesLabel: { value: 'Доступные языки' },
      defaultLanguageNote: { value: 'По умолчанию' },
      cancel: { value: 'Отмена' },
      save: { value: 'Сохранить' },
      savedToastPrefix: { value: 'Язык изменён' },
    },
    languages: {
      ru: { value: 'Русский' },
      en: { value: 'English' },
      kk: { value: 'Қазақша' },
    },
    tour: {
      steps: {
        brand: {
          title: { value: 'Добро пожаловать в Lumio' },
          description: { value: 'Это ваш финансовый помощник' },
        },
        navigation: {
          title: { value: 'Навигация' },
          description: { value: 'Основные разделы приложения' },
        },
        theme: {
          title: { value: 'Тема' },
          description: { value: 'Переключение светлой/тёмной темы' },
        },
        userMenu: {
          title: { value: 'Меню пользователя' },
          description: { value: 'Настройки и выход' },
        },
        mobileMenu: {
          title: { value: 'Мобильное меню' },
          description: { value: 'Откройте меню для навигации' },
        },
      },
    },
  },
};

// Helper to get translations by namespace
export const getMockTranslations = (namespace: string) => {
  return (mockTranslations as any)[namespace] || {};
};

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statementsPage',
  content: {
    title: t({
      ru: 'Банковские выписки',
      en: 'Bank statements',
      kk: 'Банк үзінділері',
    }),
    subtitle: t({
      ru: 'Управляйте загруженными файлами, отслеживайте статус обработки и экспортируйте данные.',
      en: 'Manage uploaded files, track processing status, and export data.',
      kk: 'Жүктелген файлдарды басқарыңыз, өңдеу күйін бақылаңыз және деректерді экспорттаңыз.',
    }),
    searchPlaceholder: t({
      ru: 'Поиск по выпискам',
      en: 'Search for something',
      kk: 'Үзінділерді іздеу',
    }),
    filters: {
      type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      status: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      from: t({ ru: 'От', en: 'From', kk: 'Бастап' }),
      filters: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      columns: t({ ru: 'Колонки', en: 'Columns', kk: 'Бағандар' }),
    },
    listHeader: {
      receipt: t({ ru: 'Чек', en: 'Receipt', kk: 'Чек' }),
      type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      merchant: t({ ru: 'Мерчант', en: 'Merchant', kk: 'Саудагер' }),
      amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
      action: t({ ru: 'Действие', en: 'Action', kk: 'Әрекет' }),
      scanning: t({ ru: 'Сканирование...', en: 'Scanning...', kk: 'Сканерлеу...' }),
    },
    sidePanel: {
      todoTitle: t({ ru: 'К выполнению', en: 'To-do', kk: 'Аяқтау керек' }),
      submit: t({ ru: 'Отправить', en: 'Submit', kk: 'Жіберу' }),
      approve: t({ ru: 'Одобрить', en: 'Approve', kk: 'Бекіту' }),
      pay: t({ ru: 'Оплатить', en: 'Pay', kk: 'Төлеу' }),
      accountingTitle: t({ ru: 'Бухгалтерия', en: 'Accounting', kk: 'Бухгалтерия' }),
      unapprovedCash: t({ ru: 'Неутвержденные наличные', en: 'Unapproved cash', kk: 'Бекітілмеген қолма-қол' }),
      insightsTitle: t({ ru: 'Инсайты', en: 'Insights', kk: 'Инсайттар' }),
      topSpenders: t({ ru: 'Главные расходы', en: 'Top spenders', kk: 'Ең көп жұмсайтындар' }),
      topCategories: t({ ru: 'Топ категории', en: 'Top categories', kk: 'Топ санаттар' }),
    },
    workflow: {
      submitAction: t({ ru: 'Отправить', en: 'Submit', kk: 'Жіберу' }),
      approvedToast: t({ ru: 'Выписка отправлена на утверждение', en: 'Statement submitted for approval', kk: 'Үзінді бекітуге жіберілді' }),
    },
    uploadStatement: t({
      ru: 'Загрузить выписку',
      en: 'Upload statement',
      kk: 'Үзіндіні жүктеу',
    }),
    allStatements: t({
      ru: 'Все выписки',
      en: 'All statements',
      kk: 'Барлық үзінділер',
    }),
    adjustments: t({
      ru: 'Корректировки',
      en: 'Adjustments',
      kk: 'Түзетулер',
    }),
    table: {
      file: t({ ru: 'Файл', en: 'File', kk: 'Файл' }),
      status: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      bank: t({ ru: 'Банк', en: 'Bank', kk: 'Банк' }),
      transactions: t({
        ru: 'Транзакции',
        en: 'Transactions',
        kk: 'Транзакциялар',
      }),
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
      opsShort: t({ ru: 'оп.', en: 'tx', kk: 'оп.' }),
    },
    actions: {
      view: t({ ru: 'Просмотреть', en: 'View', kk: 'Қарау' }),
      download: t({ ru: 'Скачать', en: 'Download', kk: 'Жүктеу' }),
      logs: t({ ru: 'Логи', en: 'Logs', kk: 'Логтар' }),
      retry: t({ ru: 'Повторить', en: 'Retry', kk: 'Қайта' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
    },
    download: {
      loading: t({
        ru: 'Скачивание файла...',
        en: 'Downloading...',
        kk: 'Жүктелуде...',
      }),
      success: t({
        ru: 'Файл успешно скачан',
        en: 'Downloaded successfully',
        kk: 'Файл сәтті жүктелді',
      }),
      failed: t({
        ru: 'Не удалось скачать файл',
        en: 'Failed to download file',
        kk: 'Файлды жүктеу мүмкін болмады',
      }),
    },
    viewFile: {
      failed: t({
        ru: 'Не удалось открыть файл',
        en: 'Failed to open file',
        kk: 'Файлды ашу мүмкін болмады',
      }),
      previewTitle: t({
        ru: 'Предпросмотр файла',
        en: 'File preview',
        kk: 'Файл алдын ала қарау',
      }),
      close: t({ ru: 'Закрыть', en: 'Close', kk: 'Жабу' }),
      download: t({
        ru: 'Скачать файл',
        en: 'Download file',
        kk: 'Файлды жүктеу',
      }),
    },
    logs: {
      openFailed: t({
        ru: 'Не удалось получить логи обработки',
        en: 'Failed to load logs',
        kk: 'Өңдеу логтарын жүктеу мүмкін болмады',
      }),
      title: t({
        ru: 'Логи обработки',
        en: 'Processing logs',
        kk: 'Өңдеу логтары',
      }),
      empty: t({
        ru: 'Логи пока отсутствуют',
        en: 'No logs yet',
        kk: 'Әзірше логтар жоқ',
      }),
      autoRefresh: t({
        ru: 'Обновляется каждые 3 секунды. Закройте окно, чтобы остановить.',
        en: 'Refreshes every 3 seconds. Close the window to stop.',
        kk: 'Әр 3 секунд сайын жаңарады. Тоқтату үшін терезені жабыңыз.',
      }),
    },
    loadListError: t({
      ru: 'Не удалось загрузить список выписок',
      en: 'Failed to load statements',
      kk: 'Үзінділер тізімін жүктеу мүмкін болмады',
    }),
    reprocessStart: t({
      ru: 'Запуск обработки...',
      en: 'Starting processing...',
      kk: 'Өңдеу басталуда...',
    }),
    reprocessSuccess: t({
      ru: 'Обработка запущена успешно',
      en: 'Processing started',
      kk: 'Өңдеу сәтті басталды',
    }),
    reprocessError: t({
      ru: 'Ошибка при запуске обработки',
      en: 'Failed to start processing',
      kk: 'Өңдеуді бастау қатесі',
    }),
    deleteLoading: t({
      ru: 'Перемещение в корзину...',
      en: 'Moving to trash...',
      kk: 'Себетке жылжытылуда...',
    }),
    deleteSuccess: t({
      ru: 'Выписка перемещена в корзину',
      en: 'Statement moved to trash',
      kk: 'Үзінді себетке жылжытылды',
    }),
    deleteError: t({
      ru: 'Ошибка при удалении',
      en: 'Failed to delete',
      kk: 'Жою қатесі',
    }),
    uploadModal: {
      title: t({
        ru: 'Загрузка файлов',
        en: 'Upload files',
        kk: 'Файлдарды жүктеу',
      }),
      subtitle: t({
        ru: 'Поддерживаются PDF, Excel, CSV и изображения',
        en: 'PDF, Excel, CSV and images are supported',
        kk: 'PDF, Excel, CSV және суреттер қолдау көрсетіледі',
      }),
      unsupportedFormat: t({
        ru: 'Неподдерживаемый формат файла',
        en: 'Unsupported file format',
        kk: 'Қолдау көрсетілмейтін файл форматы',
      }),
      pickAtLeastOne: t({
        ru: 'Выберите хотя бы один файл',
        en: 'Select at least one file',
        kk: 'Кемінде бір файл таңдаңыз',
      }),
      uploadFailed: t({
        ru: 'Не удалось загрузить файлы',
        en: 'Failed to upload files',
        kk: 'Файлдарды жүктеу мүмкін болмады',
      }),
      uploadedProcessing: t({
        ru: 'Файлы загружены, начата обработка',
        en: 'Files uploaded, processing started',
        kk: 'Файлдар жүктелді, өңдеу басталды',
      }),
      uploading: t({
        ru: 'Загрузка...',
        en: 'Uploading...',
        kk: 'Жүктелуде...',
      }),
      uploadFiles: t({
        ru: 'Загрузить файлы',
        en: 'Upload files',
        kk: 'Файлдарды жүктеу',
      }),
      dropHint1: t({
        ru: 'Нажмите для выбора',
        en: 'Click to select',
        kk: 'Таңдау үшін басыңыз',
      }),
      dropHint2: t({
        ru: 'или перетащите файлы',
        en: 'or drag and drop files',
        kk: 'немесе файлдарды сүйреп әкеліңіз',
      }),
      allowDuplicates: t({
        ru: 'Разрешить загрузку дубликатов',
        en: 'Allow uploading duplicates',
        kk: 'Дубликаттарды жүктеуге рұқсат беру',
      }),
      maxHint: t({
        ru: 'Максимум 5 файлов до 10 МБ каждый',
        en: 'Up to 5 files, 10 MB each',
        kk: 'Ең көбі 5 файл, әрқайсысы 10 МБ дейін',
      }),
      mbShort: t({ ru: 'МБ', en: 'MB', kk: 'МБ' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    confirmDelete: {
      title: t({
        ru: 'Переместить выписку в корзину?',
        en: 'Move statement to trash?',
        kk: 'Үзіндіні себетке жылжыту керек пе?',
      }),
      message: t({
        ru: 'Выписка будет перемещена в корзину. Вы сможете восстановить её позже из раздела Хранилище.',
        en: 'The statement will be moved to trash. You can restore it later from the Storage section.',
        kk: 'Үзінді себетке жылжытылады. Оны кейінірек Сақтау бөлімінен қалпына келтіруге болады.',
      }),
      confirm: t({
        ru: 'Переместить в корзину',
        en: 'Move to trash',
        kk: 'Себетке жылжыту',
      }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    status: {
      completed: t({
        ru: 'Завершено',
        en: 'Completed',
        kk: 'Аяқталды',
      }),
      processing: t({
        ru: 'Обработка',
        en: 'Processing',
        kk: 'Өңделуде',
      }),
      error: t({
        ru: 'Ошибка',
        en: 'Error',
        kk: 'Қате',
      }),
    },
    empty: {
      title: t({
        ru: 'Нет загруженных файлов',
        en: 'No uploaded files',
        kk: 'Жүктелген файлдар жоқ',
      }),
      description: t({
        ru: 'Загрузите свою первую банковскую выписку, чтобы начать работу.',
        en: 'Upload your first bank statement to get started.',
        kk: 'Бастау үшін алғашқы банк үзіндісін жүктеңіз.',
      }),
    },
    notify: {
      donePrefix: t({
        ru: 'Обработка завершена',
        en: 'Processing completed',
        kk: 'Өңдеу аяқталды',
      }),
      errorPrefix: t({
        ru: 'Ошибка обработки',
        en: 'Processing error',
        kk: 'Өңдеу қатесі',
      }),
    },
  },
} satisfies Dictionary;

export default content;

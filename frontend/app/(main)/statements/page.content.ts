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
      apply: t({ ru: 'Применить', en: 'Apply', kk: 'Қолдану' }),
      reset: t({ ru: 'Сбросить', en: 'Reset', kk: 'Тазалау' }),
      viewResults: t({ ru: 'Показать результаты', en: 'View results', kk: 'Нәтижелерді көрсету' }),
      any: t({ ru: 'Любой', en: 'Any', kk: 'Кез келген' }),
      drawerTitle: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      drawerGeneral: t({ ru: 'Общие', en: 'General', kk: 'Жалпы' }),
      drawerExpenses: t({ ru: 'Расходы', en: 'Expenses', kk: 'Шығыстар' }),
      resetFilters: t({ ru: 'Сбросить фильтры', en: 'Reset filters', kk: 'Сүзгілерді тазалау' }),
      saveSearch: t({ ru: 'Сохранить поиск', en: 'Save search', kk: 'Іздеуді сақтау' }),
      yes: t({ ru: 'Да', en: 'Yes', kk: 'Иә' }),
      no: t({ ru: 'Нет', en: 'No', kk: 'Жоқ' }),
      drawerReports: t({ ru: 'Отчеты', en: 'Reports', kk: 'Есептер' }),
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
    pagination: {
      shown: t({
        ru: 'Показано {from}–{to} из {count}',
        en: 'Showing {from}–{to} of {count}',
        kk: '{from}–{to} / {count} көрсетілді',
      }),
      previous: t({ ru: 'Предыдущая', en: 'Previous', kk: 'Алдыңғы' }),
      next: t({ ru: 'Следующая', en: 'Next', kk: 'Келесі' }),
      pageOf: t({
        ru: 'Страница {page} из {count}',
        en: 'Page {page} of {count}',
        kk: '{page} / {count} бет',
      }),
    },
    trash: {
      title: t({ ru: 'Корзина', en: 'Trash', kk: 'Қоқыс' }),
      searchPlaceholder: t({
        ru: 'Поиск в корзине...',
        en: 'Search in trash...',
        kk: 'Қоқыстан іздеу...',
      }),
      selectedCount: t({
        ru: 'Выбрано: {count}',
        en: 'Selected: {count}',
        kk: 'Таңдалды: {count}',
      }),
      restore: t({ ru: 'Восстановить', en: 'Restore', kk: 'Қалпына келтіру' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      emptyTrash: t({ ru: 'Очистить корзину', en: 'Empty trash', kk: 'Қоқысты тазарту' }),
      selectAll: t({
        ru: 'Выбрать все в корзине',
        en: 'Select all in trash',
        kk: 'Қоқыстағының бәрін таңдау',
      }),
      expiresIn: t({
        ru: 'Удалится через {days} дн.',
        en: 'Deletes in {days}d',
        kk: '{days} күннен кейін жойылады',
      }),
      expiresToday: t({
        ru: 'Удалится сегодня',
        en: 'Deletes today',
        kk: 'Бүгін жойылады',
      }),
      empty: {
        title: t({
          ru: 'Корзина пуста',
          en: 'Trash is empty',
          kk: 'Қоқыс бос',
        }),
        subtitle: t({
          ru: 'Удаленные файлы появятся здесь',
          en: 'Deleted files will appear here',
          kk: 'Жойылған файлдар осында пайда болады',
        }),
      },
      listHeader: {
        receipt: t({ ru: 'Чек', en: 'Receipt', kk: 'Чек' }),
        type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
        deleted: t({ ru: 'Удалено', en: 'Deleted', kk: 'Жойылған' }),
        name: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
        actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
      },
      restoreLoading: t({
        ru: 'Восстанавливаем...',
        en: 'Restoring...',
        kk: 'Қалпына келтіру...',
      }),
      restoreSuccess: t({
        ru: 'Файл восстановлен',
        en: 'File restored',
        kk: 'Файл қалпына келтірілді',
      }),
      restoreFailed: t({
        ru: 'Не удалось восстановить файл',
        en: 'Failed to restore file',
        kk: 'Файлды қалпына келтіру мүмкін болмады',
      }),
      deleteLoading: t({
        ru: 'Удаляем навсегда...',
        en: 'Deleting forever...',
        kk: 'Мүлде жою...',
      }),
      deleteSuccess: t({
        ru: 'Файл удалён навсегда',
        en: 'File deleted permanently',
        kk: 'Файл мүлде жойылды',
      }),
      deleteFailed: t({
        ru: 'Не удалось удалить файл навсегда',
        en: 'Failed to delete file permanently',
        kk: 'Файлды мүлде жою мүмкін болмады',
      }),
      confirmDeleteTitle: t({
        ru: 'Удалить навсегда?',
        en: 'Delete permanently?',
        kk: 'Мүлде жою керек пе?',
      }),
      confirmDeleteMessage: t({
        ru: 'Выбранные файлы ({count}) будут удалены без возможности восстановления.',
        en: 'Selected files ({count}) will be deleted permanently.',
        kk: 'Таңдалған файлдар ({count}) қайтарусыз жойылады.',
      }),
      confirmDelete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      confirmCancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      confirmEmptyTitle: t({
        ru: 'Очистить корзину?',
        en: 'Empty trash?',
        kk: 'Қоқысты тазарту керек пе?',
      }),
      confirmEmptyMessage: t({
        ru: 'Все файлы из корзины будут удалены без возможности восстановления.',
        en: 'All files in trash will be deleted permanently.',
        kk: 'Қоқыстағы барлық файлдар қайтарусыз жойылады.',
      }),
      confirmEmpty: t({ ru: 'Очистить', en: 'Empty', kk: 'Тазарту' }),
      loadError: t({
        ru: 'Не удалось загрузить корзину',
        en: 'Failed to load trash',
        kk: 'Қоқысты жүктеу мүмкін болмады',
      }),
    },
    sidePanel: {
      todoTitle: t({ ru: 'К выполнению', en: 'To-do', kk: 'Аяқтау керек' }),
      submit: t({ ru: 'Отправить', en: 'Submit', kk: 'Жіберу' }),
      approve: t({ ru: 'Одобрить', en: 'Approve', kk: 'Бекіту' }),
      pay: t({ ru: 'Оплатить', en: 'Pay', kk: 'Төлеу' }),
      accountingTitle: t({ ru: 'Бухгалтерия', en: 'Accounting', kk: 'Бухгалтерия' }),
      unapprovedCash: t({
        ru: 'Неутвержденные наличные',
        en: 'Unapproved cash',
        kk: 'Бекітілмеген қолма-қол',
      }),
      insightsTitle: t({ ru: 'Инсайты', en: 'Insights', kk: 'Инсайттар' }),
      topSpenders: t({ ru: 'Главные расходы', en: 'Top spenders', kk: 'Ең көп жұмсайтындар' }),
      topSpendersEmpty: t({ ru: 'Нет данных', en: 'No data', kk: 'Дерек жоқ' }),
      topCategories: t({ ru: 'Топ категории', en: 'Top categories', kk: 'Топ санаттар' }),
    },
    topSpenders: {
      title: t({ ru: 'Главные расходы', en: 'Top spenders', kk: 'Ең үлкен шығындар' }),
      subtitle: t({
        ru: 'Аналитика расходов по выпискам и чекам с фильтрами как в Submit.',
        en: 'Spending analytics for statements and receipts with Submit filters.',
        kk: 'Submit сүзгілерімен үзінділер мен чектер бойынша шығын аналитикасы.',
      }),
      searchPlaceholder: t({
        ru: 'Поиск по компании, банку или отправителю',
        en: 'Search by company, bank or sender',
        kk: 'Компания, банк немесе жіберуші бойынша іздеу',
      }),
      totalSpend: t({ ru: 'Общий расход', en: 'Total spend', kk: 'Жалпы шығын' }),
      statementsSpend: t({ ru: 'По выпискам', en: 'Statements', kk: 'Үзінділер' }),
      receiptsSpend: t({ ru: 'По чекам', en: 'Receipts', kk: 'Чектер' }),
      totalOperations: t({ ru: 'Операций', en: 'Operations', kk: 'Операциялар' }),
      topCompanies: t({ ru: 'Топ компаний', en: 'Top companies', kk: 'Топ компаниялар' }),
      sourceSplit: t({
        ru: 'Разбивка по источникам',
        en: 'Source split',
        kk: 'Дереккөз бойынша бөліну',
      }),
      spendTrend: t({ ru: 'Тренд расходов', en: 'Spending trend', kk: 'Шығын тренді' }),
      leaderboard: t({
        ru: 'Рейтинг плательщиков',
        en: 'Top spenders list',
        kk: 'Ең көп жұмсаушылар тізімі',
      }),
      noData: t({
        ru: 'Нет данных для выбранных фильтров',
        en: 'No data for selected filters',
        kk: 'Таңдалған сүзгілер бойынша дерек жоқ',
      }),
      source: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
      company: t({ ru: 'Компания', en: 'Company', kk: 'Компания' }),
      amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
      operations: t({ ru: 'Операции', en: 'Operations', kk: 'Операциялар' }),
      average: t({ ru: 'Средний чек', en: 'Average', kk: 'Орташа сома' }),
      lastOperation: t({ ru: 'Последняя операция', en: 'Last operation', kk: 'Соңғы операция' }),
      sourceStatement: t({ ru: 'Выписка', en: 'Statement', kk: 'Үзінді' }),
      sourceGmail: t({ ru: 'Чек', en: 'Receipt', kk: 'Чек' }),
    },
    workflow: {
      submitAction: t({ ru: 'Отправить', en: 'Submit', kk: 'Жіберу' }),
      approvedToast: t({
        ru: 'Выписка отправлена на утверждение',
        en: 'Statement submitted for approval',
        kk: 'Үзінді бекітуге жіберілді',
      }),
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
    refreshFailed: t({
      ru: 'Не удалось обновить список выписок',
      en: 'Failed to refresh statements',
      kk: 'Үзінділер тізімін жаңарту мүмкін болмады',
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

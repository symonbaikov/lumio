/**
 * Content для тура по странице выписок
 */

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statements-tour',
  content: {
    name: t({
      ru: 'Тур по выпискам',
      en: 'Statements Tour',
      kk: 'Үзінділер турі',
    }),
    description: t({
      ru: 'Узнайте как загружать и управлять банковскими выписками',
      en: 'Learn how to upload and manage bank statements',
      kk: 'Банк үзінділерін жүктеу және басқару туралы біліңіз',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в Выписки! 📄',
          en: 'Welcome to Statements! 📄',
          kk: 'Үзінділерге қош келдіңіз! 📄',
        }),
        description: t({
          ru: 'Здесь вы можете загружать банковские выписки, просматривать их статус и управлять финансовыми данными. Давайте познакомимся с основными функциями!',
          en: "Here you can upload bank statements, view their status, and manage financial data. Let's explore the main features!",
          kk: 'Мұнда банк үзінділерін жүктей аласыз, олардың күйін қарай аласыз және қаржылық деректерді басқара аласыз. Негізгі функцияларды зерттейік!',
        }),
      },
      uploadButton: {
        title: t({
          ru: 'Загрузка выписок',
          en: 'Upload Statements',
          kk: 'Үзінділерді жүктеу',
        }),
        description: t({
          ru: 'Нажмите эту кнопку, чтобы загрузить банковские выписки в форматах PDF или CSV. Система автоматически распознает банк и извлечет транзакции.',
          en: 'Click this button to upload bank statements in PDF or CSV format. The system will automatically recognize the bank and extract transactions.',
          kk: 'Банк үзінділерін PDF немесе CSV форматында жүктеу үшін бұл батырманы басыңыз. Жүйе банкті автоматты түрде танып, транзакцияларды алады.',
        }),
      },
      searchBar: {
        title: t({
          ru: 'Поиск выписок',
          en: 'Search Statements',
          kk: 'Үзінділерді іздеу',
        }),
        description: t({
          ru: 'Используйте поиск для быстрого нахождения нужной выписки по названию файла или банку.',
          en: 'Use search to quickly find the needed statement by file name or bank.',
          kk: 'Файл атауы немесе банк бойынша қажетті үзіндіні тез табу үшін іздеуді пайдаланыңыз.',
        }),
      },
      statusFilter: {
        title: t({
          ru: 'Фильтр по статусу',
          en: 'Status Filter',
          kk: 'Күй бойынша сүзгі',
        }),
        description: t({
          ru: 'Фильтруйте выписки по их статусу: обработка, успешно обработано или ошибка.',
          en: 'Filter statements by their status: processing, successfully processed, or error.',
          kk: 'Үзінділерді күй бойынша сүзіңіз: өңдеу, сәтті өңделген немесе қате.',
        }),
      },
      statementsTable: {
        title: t({
          ru: 'Таблица выписок',
          en: 'Statements Table',
          kk: 'Үзінділер кестесі',
        }),
        description: t({
          ru: 'Все ваши выписки отображаются здесь. Вы можете видеть название файла, банк, количество транзакций и статус обработки. Кликните на строку для детальной информации.',
          en: 'All your statements are displayed here. You can see the file name, bank, number of transactions, and processing status. Click on a row for detailed information.',
          kk: 'Барлық үзінділеріңіз мұнда көрсетіледі. Файл атауын, банкті, транзакциялар санын және өңдеу күйін көре аласыз. Егжей-тегжейлі ақпарат алу үшін жолды басыңыз.',
        }),
      },
      statusBadges: {
        title: t({
          ru: 'Статусы выписок',
          en: 'Statement Statuses',
          kk: 'Үзінділер күйлері',
        }),
        description: t({
          ru: '• **Обработка** - выписка загружена и обрабатывается\n• **Успешно** - выписка полностью обработана\n• **Ошибка** - возникла проблема при обработке',
          en: '• **Processing** - statement is uploaded and being processed\n• **Success** - statement is fully processed\n• **Error** - a problem occurred during processing',
          kk: '• **Өңдеу** - үзінді жүктелді және өңделуде\n• **Сәтті** - үзінді толық өңделді\n• **Қате** - өңдеу кезінде проблема туындады',
        }),
      },
      actions: {
        title: t({
          ru: 'Действия с выписками',
          en: 'Statement Actions',
          kk: 'Үзінділермен әрекеттер',
        }),
        description: t({
          ru: 'Используйте кнопки действий для:\n• **Просмотра** деталей выписки\n• **Скачивания** исходного файла\n• **Просмотра логов** обработки\n• **Удаления** выписки',
          en: 'Use action buttons to:\n• **View** statement details\n• **Download** the original file\n• **View logs** of processing\n• **Delete** the statement',
          kk: 'Әрекет батырмаларын пайдаланыңыз:\n• Үзінді **мәліметтерін көру**\n• Бастапқы файлды **жүктеп алу**\n• Өңдеу **логтарын көру**\n• Үзіндіні **жою**',
        }),
      },
      pagination: {
        title: t({
          ru: 'Навигация по страницам',
          en: 'Page Navigation',
          kk: 'Беттер бойынша навигация',
        }),
        description: t({
          ru: 'Используйте кнопки навигации для перемещения между страницами. Вы также можете изменить количество элементов на странице.',
          en: 'Use navigation buttons to move between pages. You can also change the number of items per page.',
          kk: 'Беттер арасында жүру үшін навигация батырмаларын пайдаланыңыз. Бір беттегі элементтер санын да өзгерте аласыз.',
        }),
      },
      viewDetails: {
        title: t({
          ru: 'Просмотр деталей',
          en: 'View Details',
          kk: 'Мәліметтерді көру',
        }),
        description: t({
          ru: 'Нажмите на значок глаза, чтобы открыть детальную информацию о выписке и увидеть все транзакции.',
          en: 'Click the eye icon to open detailed information about the statement and see all transactions.',
          kk: 'Үзінді туралы толық ақпаратты ашу және барлық транзакцияларды көру үшін көз белгішесін басыңыз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично! 🎉',
          en: 'Excellent! 🎉',
          kk: 'Керемет! 🎉',
        }),
        description: t({
          ru: 'Теперь вы знаете, как работать с банковскими выписками в Lumio. Попробуйте загрузить свою первую выписку!',
          en: 'Now you know how to work with bank statements in Lumio. Try uploading your first statement!',
          kk: 'Енді сіз Lumio-да банк үзінділерімен қалай жұмыс істейтінін білесіз. Бірінші үзіндіңізді жүктеп көріңіз!',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;

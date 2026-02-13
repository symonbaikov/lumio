import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'google-sheets-import-tour-content',
  content: {
    name: t({
      ru: 'Тур по импорту из Google Sheets',
      en: 'Google Sheets Import Tour',
      kk: 'Google Sheets импорт туры',
    }),
    description: t({
      ru: 'Пошаговый обзор настроек импорта и создания таблицы.',
      en: 'A step-by-step overview of import settings and table creation.',
      kk: 'Импорт баптаулары мен кесте құрудың қадамдық шолуы.',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Импорт из Google Sheets',
          en: 'Import from Google Sheets',
          kk: 'Google Sheets-тен импорт',
        }),
        description: t({
          ru: 'Этот тур объяснит все шаги: подключение, превью, выбор колонок и импорт.',
          en: 'This tour explains all steps: connection, preview, column setup, and import.',
          kk: 'Бұл тур барлық қадамдарды түсіндіреді: қосылу, превью, бағандар және импорт.',
        }),
      },
      backLink: {
        title: t({
          ru: 'Назад к таблицам',
          en: 'Back to tables',
          kk: 'Кестелерге оралу',
        }),
        description: t({
          ru: 'Ссылка возвращает в список пользовательских таблиц.',
          en: 'This link returns to the custom tables list.',
          kk: 'Бұл сілтеме пайдаланушы кестелері тізіміне қайтарады.',
        }),
      },
      sourceCard: {
        title: t({
          ru: 'Источник данных',
          en: 'Data source',
          kk: 'Дерек көзі',
        }),
        description: t({
          ru: 'Здесь выбирается подключение и параметры чтения листа.',
          en: 'Select a connection and sheet reading parameters here.',
          kk: 'Мұнда қосылым мен парақ оқу параметрлері таңдалады.',
        }),
      },
      connection: {
        title: t({
          ru: 'Подключение',
          en: 'Connection',
          kk: 'Қосылым',
        }),
        description: t({
          ru: 'Выберите Google Sheets подключение, которое хотите импортировать.',
          en: 'Choose the Google Sheets connection you want to import.',
          kk: 'Импорттағыңыз келетін Google Sheets қосылымын таңдаңыз.',
        }),
      },
      worksheet: {
        title: t({
          ru: 'Лист',
          en: 'Worksheet',
          kk: 'Парақ',
        }),
        description: t({
          ru: 'Укажите имя листа (worksheet). Если оставить пустым, будет выбран лист по умолчанию.',
          en: 'Enter a worksheet name. Leave empty to use the default sheet.',
          kk: 'Парақ атауын енгізіңіз. Бос қалдырсаңыз, әдепкі парақ алынады.',
        }),
      },
      range: {
        title: t({
          ru: 'Диапазон',
          en: 'Range',
          kk: 'Диапазон',
        }),
        description: t({
          ru: 'Определите диапазон данных (например A1:Z200), чтобы ограничить импорт.',
          en: 'Define a data range (e.g., A1:Z200) to limit the import.',
          kk: 'Импортты шектеу үшін деректер диапазонын көрсетіңіз (мысалы A1:Z200).',
        }),
      },
      headerOffset: {
        title: t({
          ru: 'Смещение заголовка',
          en: 'Header offset',
          kk: 'Тақырып ығысуы',
        }),
        description: t({
          ru: 'Укажите номер строки заголовка, чтобы корректно определить названия колонок.',
          en: 'Set the header row index to detect column names correctly.',
          kk: 'Баған атауларын дұрыс анықтау үшін тақырып жолын көрсетіңіз.',
        }),
      },
      layout: {
        title: t({
          ru: 'Тип раскладки',
          en: 'Layout type',
          kk: 'Орналасу түрі',
        }),
        description: t({
          ru: 'Выберите раскладку данных для корректной интерпретации таблицы.',
          en: 'Choose a layout so the data is interpreted correctly.',
          kk: 'Деректер дұрыс түсіндірілуі үшін орналасу түрін таңдаңыз.',
        }),
      },
      previewButton: {
        title: t({
          ru: 'Сделать превью',
          en: 'Generate preview',
          kk: 'Превью жасау',
        }),
        description: t({
          ru: 'Нажмите, чтобы загрузить превью данных и подготовить настройки импорта.',
          en: 'Click to load a data preview and prepare import settings.',
          kk: 'Деректер превьюын жүктеп, импорт баптауларын дайындау үшін басыңыз.',
        }),
      },
      previewPanel: {
        title: t({
          ru: 'Превью данных',
          en: 'Data preview',
          kk: 'Дерек превьюы',
        }),
        description: t({
          ru: 'Здесь отображается превью диапазона и параметры, определенные автоматически.',
          en: 'This panel shows the preview range and detected parameters.',
          kk: 'Мұнда превью диапазоны мен анықталған параметрлер көрсетіледі.',
        }),
      },
      columnsPanel: {
        title: t({
          ru: 'Колонки',
          en: 'Columns',
          kk: 'Бағандар',
        }),
        description: t({
          ru: 'Настройте какие колонки импортировать и их типы.',
          en: 'Choose which columns to import and their types.',
          kk: 'Импортталатын бағандар мен олардың түрлерін таңдаңыз.',
        }),
      },
      enableAll: {
        title: t({
          ru: 'Включить все',
          en: 'Enable all',
          kk: 'Барлығын қосу',
        }),
        description: t({
          ru: 'Быстро включить все колонки для импорта.',
          en: 'Quickly enable all columns for import.',
          kk: 'Импорт үшін барлық бағандарды жылдам қосу.',
        }),
      },
      resultCard: {
        title: t({
          ru: 'Результат',
          en: 'Result',
          kk: 'Нәтиже',
        }),
        description: t({
          ru: 'Укажите параметры создаваемой таблицы и запускайте импорт.',
          en: 'Set the table parameters and start the import.',
          kk: 'Кесте параметрлерін орнатып, импортты бастаңыз.',
        }),
      },
      tableName: {
        title: t({
          ru: 'Название таблицы',
          en: 'Table name',
          kk: 'Кесте атауы',
        }),
        description: t({
          ru: 'Введите название будущей таблицы.',
          en: 'Enter the name for the new table.',
          kk: 'Жаңа кестенің атауын енгізіңіз.',
        }),
      },
      category: {
        title: t({
          ru: 'Категория',
          en: 'Category',
          kk: 'Санат',
        }),
        description: t({
          ru: 'Можно привязать таблицу к категории для удобной навигации.',
          en: 'Optionally link the table to a category for easier navigation.',
          kk: 'Кестені санатқа байланыстыру навигацияны жеңілдетеді.',
        }),
      },
      importData: {
        title: t({
          ru: 'Импортировать данные',
          en: 'Import data',
          kk: 'Деректерді импорттау',
        }),
        description: t({
          ru: 'Определяет, импортировать ли строки (кроме заголовков).',
          en: 'Decides whether to import rows (excluding headers).',
          kk: 'Жолдарды (тақырыптардан басқа) импорттауын анықтайды.',
        }),
      },
      importButton: {
        title: t({
          ru: 'Запустить импорт',
          en: 'Start import',
          kk: 'Импортты бастау',
        }),
        description: t({
          ru: 'Запускает импорт и создание таблицы Lumio.',
          en: 'Starts the import and creates a Lumio table.',
          kk: 'Импортты іске қосып, Lumio кестесін жасайды.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'Done',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'После завершения вы перейдете в созданную таблицу.',
          en: 'After completion you will be taken to the created table.',
          kk: 'Аяқталғаннан кейін жасалған кестеге өтесіз.',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;

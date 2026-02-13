import { type DeclarationContent, t } from 'intlayer';

/**
 * Контент для расширенного тура по кастомным таблицам
 */
export const customTablesTourContent = {
  key: 'custom-tables-tour-content',
  content: {
    name: t({
      ru: 'Тур по кастомным таблицам',
      en: 'Custom Tables Tour',
      kk: 'Жекелендірілген кестелер туры',
    }),
    description: t({
      ru: 'Создание гибких структур данных',
      en: 'Build flexible data structures',
      kk: 'Икемді дерек құрылымдарын жасау',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в кастомные таблицы',
          en: 'Welcome to Custom Tables',
          kk: 'Реттелетін кестелерге қош келдіңіз',
        }),
        description: t({
          ru: 'Кастомные таблицы — мощный инструмент для создания любых структур данных. Здесь вы можете создавать таблицы с нуля, импортировать их из выписок или Google Sheets, и полностью настраивать под свои задачи. Давайте разберемся во всех возможностях!',
          en: "Custom tables are a powerful tool for creating any data structures. Here you can create tables from scratch, import them from statements or Google Sheets, and fully customize them for your needs. Let's explore all the features!",
          kk: 'Реттелетін кестелер кез келген деректер құрылымдарын жасау үшін қуатты құрал болып табылады. Мұнда сіз кестелерді нөлден жасай аласыз, оларды есеп айырысулардан немесе Google Sheets-тен импорттай аласыз және өз қажеттіліктеріңізге толық теңшей аласыз. Барлық мүмкіндіктерді зерттейік!',
        }),
      },
      search: {
        title: t({
          ru: 'Поиск по таблицам',
          en: 'Search tables',
          kk: 'Кестелер бойынша іздеу',
        }),
        description: t({
          ru: 'Введите часть названия — список отфильтруется мгновенно. Удобно, когда таблиц много.',
          en: 'Type part of a name — the list filters instantly. Handy when you have many tables.',
          kk: 'Атаудың бір бөлігін енгізіңіз — тізім бірден сүзіледі. Кестелер көп болғанда ыңғайлы.',
        }),
      },
      tabsAll: {
        title: t({
          ru: 'Вкладка All',
          en: 'All tab',
          kk: 'All қойындысы',
        }),
        description: t({
          ru: 'Показывает все таблицы вне зависимости от источника.',
          en: 'Shows all tables regardless of source.',
          kk: 'Дерек көзіне қарамастан барлық кестелерді көрсетеді.',
        }),
      },
      tabsManual: {
        title: t({
          ru: 'Вкладка «Вручную»',
          en: 'Manual tab',
          kk: '«Қолмен» қойындысы',
        }),
        description: t({
          ru: 'Фильтрует таблицы, созданные вручную (с нуля) внутри Lumio.',
          en: 'Filters tables created manually (from scratch) inside Lumio.',
          kk: 'Lumio ішінде қолмен (нөлден) жасалған кестелерді сүзеді.',
        }),
      },
      tabsGoogleSheets: {
        title: t({
          ru: 'Вкладка Google Sheets',
          en: 'Google Sheets tab',
          kk: 'Google Sheets қойындысы',
        }),
        description: t({
          ru: 'Показывает таблицы, импортированные из Google Sheets (обычно с синхронизацией).',
          en: 'Shows tables imported from Google Sheets (typically with sync).',
          kk: 'Google Sheets-тен импортталған кестелерді көрсетеді (әдетте синхрондаумен).',
        }),
      },
      createOptionEmpty: {
        title: t({
          ru: 'Создать пустую таблицу',
          en: 'Create Empty Table',
          kk: 'Бос кесте жасау',
        }),
        description: t({
          ru: 'Начните с чистого листа: создайте таблицу с нуля и настройте колонки под свои задачи.',
          en: 'Start from scratch: create a table and configure columns for your needs.',
          kk: 'Нөлден бастаңыз: кесте жасап, бағандарды өз қажеттіліктеріңізге қарай теңшеңіз.',
        }),
      },
      createOptionFromStatement: {
        title: t({
          ru: 'Создание из выписки',
          en: 'Create from Statement',
          kk: 'Есеп айырысудан жасау',
        }),
        description: t({
          ru: 'Создайте таблицу на основе транзакций из загруженных выписок — удобно для анализа периодов и выборок.',
          en: 'Create a table from transactions in uploaded statements — useful for analyzing periods and subsets.',
          kk: 'Жүктелген есеп айырысулардағы транзакциялардан кесте жасаңыз — кезеңдер мен таңдауларды талдауға ыңғайлы.',
        }),
      },
      createOptionGoogleSheets: {
        title: t({
          ru: 'Импорт из Google Sheets',
          en: 'Import from Google Sheets',
          kk: 'Google Sheets-тен импорттау',
        }),
        description: t({
          ru: 'Импортируйте таблицу из Google Sheets и синхронизируйте изменения в обе стороны.',
          en: 'Import a Google Sheet and sync changes both ways.',
          kk: 'Google Sheets-тен кестені импорттап, өзгерістерді екі жаққа да синхрондаңыз.',
        }),
      },
      importButtons: {
        title: t({
          ru: 'Кнопки импорта',
          en: 'Import Buttons',
          kk: 'Импорттау батырмалары',
        }),
        description: t({
          ru: "Эти две кнопки позволяют быстро создать таблицу из существующих данных. 'Из выписки' создаст таблицу на основе транзакций из загруженных банковских выписок. 'Импорт из Google Sheets' позволит подключить таблицу из вашего Google аккаунта.",
          en: "These two buttons allow you to quickly create a table from existing data. 'From Statement' creates a table based on transactions from uploaded bank statements. 'Import from Google Sheets' lets you connect a table from your Google account.",
          kk: "Бұл екі батырма бар деректерден кестені жылдам жасауға мүмкіндік береді. 'Есеп айырысудан' жүктелген банк есеп айырысуларынан транзакциялар негізінде кесте жасайды. 'Google Sheets-тен импорттау' Google аккаунтыңыздан кестені қосуға мүмкіндік береді.",
        }),
      },
      fromStatement: {
        title: t({
          ru: 'Создание из выписки',
          en: 'Create from Statement',
          kk: 'Есеп айырысудан жасау',
        }),
        description: t({
          ru: 'Нажмите эту кнопку, чтобы создать таблицу из уже загруженных выписок. Система автоматически преобразует транзакции в структурированную таблицу, где вы сможете фильтровать, сортировать и анализировать данные. Отличный способ детально изучить определенный период транзакций!',
          en: 'Click this button to create a table from already uploaded statements. The system automatically converts transactions into a structured table where you can filter, sort, and analyze data. A great way to study a specific period of transactions in detail!',
          kk: 'Бұрыннан жүктелген есеп айырысулардан кесте жасау үшін осы батырманы басыңыз. Жүйе транзакцияларды автоматты түрде құрылымдалған кестеге түрлендіреді, онда сіз деректерді сүзе, сұрыптай және талдай аласыз. Транзакциялардың белгілі бір кезеңін егжей-тегжейлі зерттеудің тамаша тәсілі!',
        }),
      },
      googleSheets: {
        title: t({
          ru: 'Импорт из Google Sheets',
          en: 'Import from Google Sheets',
          kk: 'Google Sheets-тен импорттау',
        }),
        description: t({
          ru: 'Подключите таблицу из Google Sheets для двустороннего обмена данными. Изменения, сделанные в Lumio, будут синхронизироваться с Google Sheets и наоборот. Идеально для совместной работы и интеграции с другими инструментами Google!',
          en: 'Connect a table from Google Sheets for two-way data exchange. Changes made in Lumio will sync with Google Sheets and vice versa. Perfect for collaboration and integration with other Google tools!',
          kk: 'Екі жақты деректер алмасуы үшін Google Sheets-тен кестені қосыңыз. Lumio-да жасалған өзгерістер Google Sheets-пен синхрондалады және керісінше. Бірлескен жұмыс пен басқа Google құралдарымен интеграциялау үшін өте жақсы!',
        }),
      },
      createButton: {
        title: t({
          ru: 'Создание новой таблицы',
          en: 'Create New Table',
          kk: 'Жаңа кесте жасау',
        }),
        description: t({
          ru: 'Эта кнопка открывает форму создания пустой таблицы с нуля. Вы сами задаете название, описание, категорию и начальную структуру колонок. Такие таблицы полностью настраиваемые — можно добавлять колонки любых типов, связывать записи и гибко настраивать под свои задачи.',
          en: 'This button opens the form to create an empty table from scratch. You set the name, description, category, and initial column structure. Such tables are fully customizable — you can add columns of any type, link records, and flexibly configure them for your needs.',
          kk: 'Бұл батырма нөлден бос кесте жасау пішінін ашады. Сіз өзіңіз атауын, сипаттамасын, санатын және бағандардың бастапқы құрылымын орнатасыз. Мұндай кестелер толығымен теңшелетін — кез келген түрдегі бағандарды қоса аласыз, жазбаларды байланыстыра аласыз және өз қажеттіліктеріңізге икемді теңшей аласыз.',
        }),
      },
      createForm: {
        title: t({
          ru: 'Форма создания таблицы',
          en: 'Table Creation Form',
          kk: 'Кесте жасау пішіні',
        }),
        description: t({
          ru: 'В этой форме укажите название таблицы (обязательно), описание (опционально) и выберите категорию для группировки. Категории помогают организовать таблицы визуально — каждая категория имеет свой цвет и иконку. После создания вы сможете добавить колонки любых типов: текст, числа, даты, связи с другими таблицами и многое другое.',
          en: 'In this form, specify the table name (required), description (optional), and select a category for grouping. Categories help organize tables visually — each category has its own color and icon. After creation, you can add columns of any type: text, numbers, dates, links to other tables, and more.',
          kk: 'Осы пішінде кесте атауын (міндетті), сипаттамасын (қосымша) көрсетіңіз және топтастыру үшін санатты таңдаңыз. Санаттар кестелерді визуалды түрде ұйымдастыруға көмектеседі — әрбір санаттың өзіндік түсі мен белгішесі бар. Жасағаннан кейін сіз кез келген түрдегі бағандарды қоса аласыз: мәтін, сандар, күндер, басқа кестелермен байланыстар және т.б.',
        }),
      },
      tablesList: {
        title: t({
          ru: 'Список таблиц',
          en: 'Tables List',
          kk: 'Кестелер тізімі',
        }),
        description: t({
          ru: 'Здесь отображаются все ваши таблицы в виде карточек. Каждая карточка показывает название, описание, иконку категории и источник данных (созданная вручную, импортированная из Google Sheets или созданная из выписки). Нажмите на карточку, чтобы открыть таблицу и начать работу с данными.',
          en: 'All your tables are displayed here as cards. Each card shows the name, description, category icon, and data source (manually created, imported from Google Sheets, or created from a statement). Click on a card to open the table and start working with data.',
          kk: 'Мұнда барлық кестелеріңіз карталар түрінде көрсетіледі. Әрбір карта атауын, сипаттамасын, санат белгішесін және деректер көзін көрсетеді (қолмен жасалған, Google Sheets-тен импортталған немесе есеп айырысудан жасалған). Кестені ашу және деректермен жұмыс істеуді бастау үшін картаға басыңыз.',
        }),
      },
      tableCard: {
        title: t({
          ru: 'Карточка таблицы',
          en: 'Table Card',
          kk: 'Кесте картасы',
        }),
        description: t({
          ru: 'Карточка показывает основную информацию о таблице: название, описание, иконку категории (с цветом) и дату создания. Цвет и иконка помогают быстро находить нужные таблицы визуально. Кликните по карточке, чтобы открыть таблицу и работать с записями — добавлять, редактировать, фильтровать данные.',
          en: 'The card shows basic information about the table: name, description, category icon (with color), and creation date. Color and icon help quickly find the right tables visually. Click on the card to open the table and work with records — add, edit, filter data.',
          kk: 'Карта кесте туралы негізгі ақпаратты көрсетеді: атауы, сипаттамасы, санат белгішесі (түспен) және жасалған күні. Түс пен белгіше керек кестелерді визуалды түрде жылдам табуға көмектеседі. Кестені ашу және жазбалармен жұмыс істеу үшін картаға басыңыз — деректерді қосыңыз, өңдеңіз, сүзіңіз.',
        }),
      },
      tableActions: {
        title: t({
          ru: 'Действия с таблицей',
          en: 'Table Actions',
          kk: 'Кестемен әрекеттер',
        }),
        description: t({
          ru: 'Кнопка с иконкой корзины позволяет удалить таблицу. При удалении будут удалены все записи и колонки внутри таблицы. Будьте осторожны — это действие необратимо! В будущем здесь появятся дополнительные действия: дублирование таблицы, экспорт в Excel/CSV, управление доступом.',
          en: 'The trash icon button allows you to delete the table. When deleted, all records and columns inside the table will be removed. Be careful — this action is irreversible! In the future, additional actions will appear here: duplicate table, export to Excel/CSV, access management.',
          kk: 'Қоқыс жәшігі белгішесі бар батырма кестені жоюға мүмкіндік береді. Жойылған кезде кестедегі барлық жазбалар мен бағандар жойылады. Абай болыңыз — бұл әрекетті қайтару мүмкін емес! Болашақта мұнда қосымша әрекеттер пайда болады: кестені көшіру, Excel/CSV-ге экспорттау, қатынасты басқару.',
        }),
      },
      tableSource: {
        title: t({
          ru: 'Источник данных',
          en: 'Data Source',
          kk: 'Деректер көзі',
        }),
        description: t({
          ru: "В нижней части карточки отображается источник таблицы: 'Вручную' — создана через форму, 'Google Sheets' — импортирована и синхронизируется с Google, или 'Из выписки' — создана из банковских транзакций. Эта информация помогает понять, откуда взялись данные и как они обновляются.",
          en: "The bottom of the card shows the table source: 'Manual' — created through the form, 'Google Sheets' — imported and synced with Google, or 'From Statement' — created from bank transactions. This information helps understand where the data came from and how it updates.",
          kk: "Картаның төменгі жағында кесте көзі көрсетіледі: 'Қолмен' — пішін арқылы жасалған, 'Google Sheets' — импортталған және Google-мен синхрондалған, немесе 'Есеп айырысудан' — банк транзакцияларынан жасалған. Бұл ақпарат деректердің қайдан алынғанын және қалай жаңартылатынын түсінуге көмектеседі.",
        }),
      },
      completed: {
        title: t({
          ru: 'Вы освоили кастомные таблицы!',
          en: "You've Mastered Custom Tables!",
          kk: 'Сіз реттелетін кестелерді игердіңіз!',
        }),
        description: t({
          ru: 'Теперь вы знаете все основные возможности кастомных таблиц: создание с нуля, импорт из выписок и Google Sheets, работа с категориями и управление таблицами. Создавайте любые структуры данных и настраивайте их под свои задачи. Удачи в работе с данными!',
          en: 'Now you know all the key features of custom tables: creating from scratch, importing from statements and Google Sheets, working with categories, and managing tables. Create any data structures and customize them for your needs. Good luck working with your data!',
          kk: 'Енді сіз реттелетін кестелердің барлық негізгі мүмкіндіктерін білесіз: нөлден жасау, есеп айырысулар мен Google Sheets-тен импорттау, санаттармен жұмыс істеу және кестелерді басқару. Кез келген деректер құрылымдарын жасаңыз және оларды өз қажеттіліктеріңізге теңшеңіз. Деректермен жұмыс істеуде сәттілік!',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default customTablesTourContent;

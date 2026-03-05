import { type DeclarationContent, t } from 'intlayer';

/**
 * Content for the Reports (Report Builder) tour
 */
export const reportsTourContent = {
  key: 'reports-tour-content',
  content: {
    name: t({
      ru: 'Тур по конструктору отчётов',
      en: 'Report Builder Tour',
      kk: 'Есеп конструкторы туры',
    }),
    description: t({
      ru: 'Создание и экспорт финансовых отчётов',
      en: 'Generate and export financial reports',
      kk: 'Қаржылық есептерді жасаңыз және экспорттаңыз',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в конструктор отчётов',
          en: 'Welcome to Report Builder',
          kk: 'Есеп конструкторына қош келдіңіз',
        }),
        description: t({
          ru: 'Здесь вы можете создавать финансовые отчёты из готовых шаблонов и экспортировать их в Excel, CSV или PDF.',
          en: 'Here you can generate financial reports from templates and export them as Excel, CSV, or PDF.',
          kk: 'Мұнда дайын үлгілерден қаржылық есептер жасап, Excel, CSV немесе PDF форматында экспорттауға болады.',
        }),
      },

      templates: {
        title: t({
          ru: 'Шаблоны отчётов',
          en: 'Report Templates',
          kk: 'Есеп үлгілері',
        }),
        description: t({
          ru: 'Выберите один из шаблонов: P&L, Баланс, Движение денежных средств или Расходы по категориям.',
          en: 'Choose from P&L, Balance Sheet, Cash Flow, or Expense by Category templates.',
          kk: 'P&L, Баланс парағы, Ақша ағыны немесе Санаттар бойынша шығыстар үлгісін таңдаңыз.',
        }),
      },

      selectTemplate: {
        title: t({
          ru: 'Выберите шаблон P&L',
          en: 'Select the P&L template',
          kk: 'P&L үлгісін таңдаңыз',
        }),
        description: t({
          ru: 'Нажмите на карточку P&L, чтобы открыть панель настройки отчёта.',
          en: 'Click the P&L card to open the report configuration panel.',
          kk: 'Есеп параметрлерін ашу үшін P&L карточкасын басыңыз.',
        }),
      },

      generator: {
        title: t({
          ru: 'Настройте параметры',
          en: 'Configure parameters',
          kk: 'Параметрлерді баптаңыз',
        }),
        description: t({
          ru: 'Укажите период — дату начала и окончания. Отчёт будет включать транзакции только за этот диапазон.',
          en: 'Set the date range. The report will include transactions only within this period.',
          kk: 'Күн аралығын орнатыңыз. Есеп тек осы кезеңдегі транзакцияларды қамтиды.',
        }),
      },

      formatSelector: {
        title: t({
          ru: 'Выберите формат экспорта',
          en: 'Choose export format',
          kk: 'Экспорт форматын таңдаңыз',
        }),
        description: t({
          ru: 'Выберите Excel (.xlsx) для редактируемой таблицы, CSV для обработки данных или PDF для отправки.',
          en: 'Choose Excel (.xlsx) for an editable spreadsheet, CSV for data processing, or PDF for sharing.',
          kk: 'Редактерлеуге болатын кесте үшін Excel, деректерді өңдеу үшін CSV немесе жіберу үшін PDF таңдаңыз.',
        }),
      },

      tabHistory: {
        title: t({
          ru: 'История отчётов',
          en: 'Report History',
          kk: 'Есептер тарихы',
        }),
        description: t({
          ru: 'Во вкладке «История» хранятся все ранее созданные отчёты с возможностью повторной загрузки.',
          en: 'The History tab stores all previously generated reports, ready to re-download.',
          kk: 'Тарих қойындысында бұрын жасалған барлық есептер сақталады, оларды қайта жүктеуге болады.',
        }),
      },

      completed: {
        title: t({
          ru: 'Готово!',
          en: 'All set!',
          kk: 'Дайын!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как создавать и экспортировать отчёты. Выберите шаблон и нажмите «Сформировать отчёт».',
          en: 'You now know how to generate and export reports. Pick a template and click "Generate report".',
          kk: 'Есептерді қалай жасау керектігін білдіңіз. Үлгіні таңдап, "Есеп жасау" батырмасын басыңыз.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default reportsTourContent;

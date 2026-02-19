import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'supportedBanksPage',
  content: {
    title: t({
      ru: 'Поддерживаемые банки',
      en: 'Supported banks',
      kk: 'Қолдау көрсетілетін банктер',
    }),
    subtitle: t({
      ru: 'Список банков, для которых доступен автоматический парсинг выписок.',
      en: 'List of banks currently available for automatic statement parsing.',
      kk: 'Үзінділерді автоматты түрде талдау қолжетімді банктер тізімі.',
    }),
    parserStatus: t({
      ru: 'Парсер активен',
      en: 'Parser is active',
      kk: 'Талдау модулі белсенді',
    }),
    comingSoon: t({
      ru: 'Скоро добавим новые банки',
      en: 'More banks are coming soon',
      kk: 'Жақында жаңа банктер қосылады',
    }),
    statusLabel: t({
      ru: 'Статус',
      en: 'Status',
      kk: 'Күйі',
    }),
    formatsLabel: t({
      ru: 'Поддерживаемый формат',
      en: 'Supported format',
      kk: 'Қолдау көрсетілетін формат',
    }),
    supported: t({
      ru: 'Поддерживается',
      en: 'Supported',
      kk: 'Қолдау көрсетіледі',
    }),
    pdfStatements: t({
      ru: 'PDF-выписки',
      en: 'PDF statements',
      kk: 'PDF үзінділері',
    }),
    banks: {
      kaspi: {
        name: t({ ru: 'Kaspi', en: 'Kaspi', kk: 'Kaspi' }),
        notes: t({
          ru: 'Загружайте выписки Kaspi в PDF для автоматического распознавания операций.',
          en: 'Upload Kaspi PDF statements for automatic transaction extraction.',
          kk: 'Операцияларды автоматты тану үшін Kaspi PDF үзінділерін жүктеңіз.',
        }),
      },
      bereke: {
        name: t({ ru: 'Bereke', en: 'Bereke', kk: 'Bereke' }),
        notes: t({
          ru: 'Загружайте выписки Bereke в PDF для автоматического распознавания операций.',
          en: 'Upload Bereke PDF statements for automatic transaction extraction.',
          kk: 'Операцияларды автоматты тану үшін Bereke PDF үзінділерін жүктеңіз.',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;

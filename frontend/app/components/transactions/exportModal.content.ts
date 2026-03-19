import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'exportModal',
  content: {
    title: t({
      ru: 'Экспорт транзакций',
      en: 'Export transactions',
      kk: 'Транзакцияларды экспорттау',
    }),
    exportButton: t({
      ru: 'Экспортировать',
      en: 'Export',
      kk: 'Экспорттау',
    }),
    cancel: t({
      ru: 'Отмена',
      en: 'Cancel',
      kk: 'Бас тарту',
    }),
    description: t({
      ru: 'Выберите формат экспорта для текущей выборки транзакций:',
      en: 'Choose an export format for the current transaction selection:',
      kk: 'Ағымдағы транзакциялар таңдауы үшін экспорт форматын таңдаңыз:',
    }),
    exportToTable: t({
      ru: 'Экспорт в таблицу',
      en: 'Export to table',
      kk: 'Кестеге экспорттау',
    }),
    exportToTableDescription: t({
      ru: 'Создать новую таблицу или добавить в существующую',
      en: 'Create a new table or add to an existing one',
      kk: 'Жаңа кесте құру немесе бар кестеге қосу',
    }),
    downloadFile: t({
      ru: 'Скачать файл в формате .xlsx или .csv',
      en: 'Download file in .xlsx or .csv format',
      kk: '.xlsx немесе .csv форматында файлды жүктеп алу',
    }),
  },
} satisfies Dictionary;

export default content;

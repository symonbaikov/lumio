import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statementViewPage',
  content: {
    errors: {
      loadFailed: t({
        ru: 'Не удалось загрузить данные выписки',
        en: 'Failed to load statement data',
        kk: 'Үзінді деректерін жүктеу мүмкін болмады',
      }),
    },
    loading: t({
      ru: 'Загрузка файла...',
      en: 'Loading file...',
      kk: 'Файл жүктелуде...',
    }),
    fileLoaded: t({
      ru: 'Файл загружен',
      en: 'File loaded',
      kk: 'Файл жүктелді',
    }),
    fileLoadFailed: t({
      ru: 'Не удалось загрузить файл',
      en: 'Failed to load file',
      kk: 'Файлды жүктеу мүмкін болмады',
    }),
    statementNotFound: t({
      ru: 'Выписка не найдена',
      en: 'Statement not found',
      kk: 'Үзінді табылмады',
    }),
    back: t({
      ru: 'Назад',
      en: 'Back',
      kk: 'Артқа',
    }),
    backToStatements: t({
      ru: 'Назад к списку выписок',
      en: 'Back to statements',
      kk: 'Үзінділер тізіміне оралу',
    }),
  },
} satisfies Dictionary;

export default content;

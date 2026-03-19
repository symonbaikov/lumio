import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'pdfPreviewModal',
  content: {
    errors: {
      authRequired: t({
        ru: 'Необходима авторизация',
        en: 'Authorization required',
        kk: 'Авторизация қажет',
      }),
      fileLoadFailed: t({
        ru: 'Не удалось загрузить файл',
        en: 'Failed to load file',
        kk: 'Файлды жүктеу мүмкін болмады',
      }),
      fileLoadError: t({
        ru: 'Ошибка загрузки файла',
        en: 'File loading error',
        kk: 'Файлды жүктеу қатесі',
      }),
      pdfRendererFailed: t({
        ru: 'Не удалось загрузить просмотрщик PDF',
        en: 'Failed to load PDF viewer',
        kk: 'PDF көрсеткішті жүктеу мүмкін болмады',
      }),
      downloadFailed: t({
        ru: 'Ошибка скачивания файла',
        en: 'File download error',
        kk: 'Файлды жүктеп алу қатесі',
      }),
      downloadAlertFailed: t({
        ru: 'Не удалось скачать файл',
        en: 'Failed to download file',
        kk: 'Файлды жүктеп алу мүмкін болмады',
      }),
      uploadFailed: t({
        ru: 'Не удалось загрузить файл',
        en: 'Failed to upload file',
        kk: 'Файлды жүктеу мүмкін болмады',
      }),
      parsingFailed: t({
        ru: 'Не удалось запустить парсинг',
        en: 'Failed to start parsing',
        kk: 'Парсингті бастау мүмкін болмады',
      }),
      displayFailed: t({
        ru: 'Не удалось отобразить документ',
        en: 'Failed to display document',
        kk: 'Құжатты көрсету мүмкін болмады',
      }),
    },
    loading: t({
      ru: 'Загрузка документа...',
      en: 'Loading document...',
      kk: 'Құжат жүктелуде...',
    }),
    fileNotAttached: t({
      ru: 'Файл не прикреплен',
      en: 'File not attached',
      kk: 'Файл тіркелмеген',
    }),
    loadError: t({
      ru: 'Ошибка загрузки',
      en: 'Loading error',
      kk: 'Жүктеу қатесі',
    }),
    uploadFileHint: t({
      ru: 'Загрузите файл, чтобы открыть превью документа',
      en: 'Upload a file to open document preview',
      kk: 'Құжатты алдын ала қарау үшін файлды жүктеңіз',
    }),
    uploading: t({
      ru: 'Загрузка...',
      en: 'Uploading...',
      kk: 'Жүктелуде...',
    }),
    uploadFile: t({
      ru: 'Загрузить файл',
      en: 'Upload file',
      kk: 'Файлды жүктеу',
    }),
    close: t({
      ru: 'Закрыть',
      en: 'Close',
      kk: 'Жабу',
    }),
    startParsing: t({
      ru: 'Запустить парсинг?',
      en: 'Start parsing?',
      kk: 'Парсингті бастау керек пе?',
    }),
    startParsingDescription: t({
      ru: 'Хотите извлечь данные из загруженной выписки и заменить текущие ручные значения?',
      en: 'Would you like to extract data from the uploaded statement and replace the current manual values?',
      kk: 'Жүктелген үзіндіден деректерді шығарып, ағымдағы қолмен енгізілген мәндерді ауыстырғыңыз келе ме?',
    }),
    decline: t({
      ru: 'Отказаться',
      en: 'Decline',
      kk: 'Бас тарту',
    }),
    startingParsing: t({
      ru: 'Запуск...',
      en: 'Starting...',
      kk: 'Іске қосылуда...',
    }),
    startParsingButton: t({
      ru: 'Запустить парсинг',
      en: 'Start parsing',
      kk: 'Парсингті бастау',
    }),
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTablesImportGoogleSheetsPage',
  content: {
    toasts: {
      loadConnectionsFailed: t({
        ru: 'Не удалось загрузить Google Sheets подключения',
        en: 'Failed to load Google Sheets connections',
        kk: 'Google Sheets қосылымдарын жүктеу мүмкін болмады',
      }),
      oauthRequired: t({
        ru: 'Подключение Google Sheets требует OAuth. Переподключите таблицу в разделе «Интеграции».',
        en: 'Google Sheets connection requires OAuth. Reconnect it in the “Integrations” section.',
        kk: 'Google Sheets қосылымы OAuth талап етеді. «Интеграциялар» бөлімінде қайта қосыңыз.',
      }),
      previewReady: t({ ru: 'Превью готово', en: 'Preview is ready', kk: 'Превью дайын' }),
      previewFailed: t({
        ru: 'Не удалось получить превью',
        en: 'Failed to get preview',
        kk: 'Превью алу мүмкін болмады',
      }),
      importStartFailed: t({
        ru: 'Не удалось запустить импорт',
        en: 'Failed to start import',
        kk: 'Импортты бастау мүмкін болмады',
      }),
      importStarted: t({ ru: 'Импорт запущен', en: 'Import started', kk: 'Импорт басталды' }),
      importFailed: t({
        ru: 'Не удалось выполнить импорт',
        en: 'Import failed',
        kk: 'Импорт орындалмады',
      }),
      importDone: t({ ru: 'Импорт завершён', en: 'Import completed', kk: 'Импорт аяқталды' }),
      importError: t({
        ru: 'Импорт завершился с ошибкой',
        en: 'Import finished with an error',
        kk: 'Импорт қателікпен аяқталды',
      }),
    },
    defaults: {
      tableName: t({
        ru: 'Импорт из Google Sheets',
        en: 'Import from Google Sheets',
        kk: 'Google Sheets-тен импорт',
      }),
    },
    auth: {
      loginRequired: t({
        ru: 'Войдите в систему, чтобы импортировать таблицу.',
        en: 'Log in to import a table.',
        kk: 'Кестені импорттау үшін жүйеге кіріңіз.',
      }),
    },
    header: {
      title: t({
        ru: 'Импорт из Google Sheets',
        en: 'Import from Google Sheets',
        kk: 'Google Sheets-тен импорт',
      }),
      subtitle: t({
        ru: 'Превью → настройка колонок → импорт в автономную таблицу FinFlow.',
        en: 'Preview → configure columns → import into a standalone FinFlow table.',
        kk: 'Превью → бағандарды баптау → FinFlow автономды кестесіне импорттау.',
      }),
      back: t({ ru: 'Назад', en: 'Back', kk: 'Артқа' }),
    },
    source: {
      title: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
      connectionLabel: t({
        ru: 'Подключение Google Sheet',
        en: 'Google Sheet connection',
        kk: 'Google Sheet қосылымы',
      }),
      selectPlaceholder: t({ ru: '— выберите —', en: '— select —', kk: '— таңдаңыз —' }),
      oauthNeededSuffix: t({ ru: ' (нужна OAuth)', en: ' (OAuth required)', kk: ' (OAuth қажет)' }),
      worksheetLabel: t({ ru: 'Лист (worksheet)', en: 'Worksheet', kk: 'Парақ (worksheet)' }),
      worksheetPlaceholder: t({
        ru: 'Например: Реестр платежей',
        en: 'e.g. Payments registry',
        kk: 'Мысалы: Төлемдер тізілімі',
      }),
      worksheetHelp: t({
        ru: 'Если не указать — используем лист из подключения или первый лист.',
        en: 'If empty, we will use the worksheet from the connection or the first sheet.',
        kk: 'Бос болса — қосылымдағы парақты немесе бірінші парақты қолданамыз.',
      }),
      rangeLabel: t({
        ru: 'Range (опционально)',
        en: 'Range (optional)',
        kk: 'Range (міндетті емес)',
      }),
      rangePlaceholder: t({ ru: 'Например: A1:Z200', en: 'e.g. A1:Z200', kk: 'Мысалы: A1:Z200' }),
      headerOffsetLabel: t({
        ru: 'Header row offset',
        en: 'Header row offset',
        kk: 'Header row offset',
      }),
      headerOffsetHelp: t({
        ru: '0 = первая строка used range',
        en: '0 = first row of used range',
        kk: '0 = used range бірінші жолы',
      }),
      layoutLabel: t({ ru: 'Layout', en: 'Layout', kk: 'Layout' }),
      layoutAuto: t({ ru: 'Авто', en: 'Auto', kk: 'Авто' }),
      layoutFlat: t({ ru: 'Плоский', en: 'Flat', kk: 'Жай' }),
      layoutMatrix: t({ ru: 'Матрица', en: 'Matrix', kk: 'Матрица' }),
      previewButton: t({ ru: 'Сделать превью', en: 'Make preview', kk: 'Превью жасау' }),
      loadingConnections: t({
        ru: 'Загружаем подключения…',
        en: 'Loading connections…',
        kk: 'Қосылымдар жүктелуде…',
      }),
      previewButtonLoading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
    },
    result: {
      title: t({ ru: 'Результат', en: 'Result', kk: 'Нәтиже' }),
      tableNameLabel: t({ ru: 'Название таблицы', en: 'Table name', kk: 'Кесте атауы' }),
      tableNamePlaceholder: t({
        ru: 'Например: Реестр платежей',
        en: 'e.g. Payments registry',
        kk: 'Мысалы: Төлемдер тізілімі',
      }),
      descriptionLabel: t({
        ru: 'Описание (опционально)',
        en: 'Description (optional)',
        kk: 'Сипаттама (міндетті емес)',
      }),
      categoryLabel: t({
        ru: 'Категория (иконка/цвет)',
        en: 'Category (icon/color)',
        kk: 'Санат (иконка/түс)',
      }),
      noCategory: t({ ru: 'Без категории', en: 'No category', kk: 'Санатсыз' }),
      categoryHint: t({
        ru: 'Иконка/цвет будут взяты из категории',
        en: 'Icon/color will be taken from category',
        kk: 'Иконка/түс санаттан алынады',
      }),
      importDataCheckbox: t({
        ru: 'Импортировать данные (кроме заголовка)',
        en: 'Import data (except header)',
        kk: 'Деректерді импорттау (тақырыптан басқа)',
      }),
      importButton: t({ ru: 'Импортировать', en: 'Import', kk: 'Импорттау' }),
      importRunning: t({
        ru: 'Импорт выполняется…',
        en: 'Import is running…',
        kk: 'Импорт орындалуда…',
      }),
      progressTitle: t({ ru: 'Прогресс', en: 'Progress', kk: 'Үдеріс' }),
      statusLabel: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      needPreviewHint: t({
        ru: 'Сначала сделайте превью.',
        en: 'Make a preview first.',
        kk: 'Алдымен превью жасаңыз.',
      }),
      dash: t({ ru: '—', en: '—', kk: '—' }),
    },
    preview: {
      title: t({ ru: 'Превью', en: 'Preview', kk: 'Превью' }),
      subtitle: t({
        ru: 'Used range, sample и стили. В commit будут считаны все данные.',
        en: 'Used range, sample, and styles. On commit, all data will be read.',
        kk: 'Used range, sample және стильдер. Commit кезінде барлық деректер оқылады.',
      }),
      hint: t({
        ru: 'Выберите подключение и нажмите “Сделать превью”.',
        en: 'Select a connection and click “Make preview”.',
        kk: 'Қосылымды таңдап, “Превью жасау” басыңыз.',
      }),
      rowHeader: t({ ru: 'Строка', en: 'Row', kk: 'Жол' }),
      layoutPrefix: t({ ru: 'layout', en: 'layout', kk: 'layout' }),
    },
    columns: {
      title: t({ ru: 'Колонки', en: 'Columns', kk: 'Бағандар' }),
      subtitle: t({
        ru: 'Можно отключать/переименовывать и менять тип. Тип используется для UI и валидаций.',
        en: 'You can disable/rename and change type. Type is used for UI and validations.',
        kk: 'Өшіруге/атын өзгертуге және түрін ауыстыруға болады. Түр UI және валидация үшін қолданылады.',
      }),
      enableAll: t({ ru: 'Включить все', en: 'Enable all', kk: 'Барлығын қосу' }),
      appearAfterPreview: t({
        ru: 'Колонки появятся после превью.',
        en: 'Columns will appear after preview.',
        kk: 'Бағандар превьюдан кейін пайда болады.',
      }),
      tableHeaders: {
        enabled: t({ ru: 'Вкл', en: 'On', kk: 'Қос' }),
        name: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
        type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      },
      types: {
        text: t({ ru: 'Текст', en: 'Text', kk: 'Мәтін' }),
        number: t({ ru: 'Число', en: 'Number', kk: 'Сан' }),
        date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
        boolean: t({ ru: 'Да/Нет', en: 'Yes/No', kk: 'Иә/Жоқ' }),
        select: t({ ru: 'Выбор', en: 'Select', kk: 'Таңдау' }),
        multiSelect: t({ ru: 'Мультивыбор', en: 'Multi-select', kk: 'Көп таңдау' }),
      },
    },
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'categoriesPage',
  content: {
    title: t({ ru: 'Категории', en: 'Categories', kk: 'Санаттар' }),
    subtitle: t({
      ru: 'Следите за расходами и доходами с помощью категорий по умолчанию или добавляйте свои',
      en: 'Get a better overview of where money is spent. Use default categories or add your own.',
      kk: 'Шығындар мен кірістерді әдепкі санаттармен бақылаңыз немесе өзіңіздікін қосыңыз',
    }),
    add: t({ ru: 'Добавить', en: 'Add', kk: 'Қосу' }),
    enabled: t({ ru: 'Активно', en: 'Enabled', kk: 'Белсенді' }),
    more: t({ ru: 'Еще', en: 'More', kk: 'Көбірек' }),
    searchPlaceholder: t({ ru: 'Найти категорию', en: 'Find category', kk: 'Санатты табу' }),
    columns: {
      name: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
    },
    noData: t({ ru: 'Нет категорий', en: 'No categories', kk: 'Санаттар жоқ' }),
    sourceBadges: {
      system: t({ ru: 'System', en: 'System', kk: 'System' }),
      parsing: t({ ru: 'Данные из парсинга', en: 'Parsing data', kk: 'Parsing data' }),
      user: t({ ru: 'Пользовательская', en: 'Custom', kk: 'Custom' }),
    },
    loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
    type: {
      income: t({ ru: 'Доход', en: 'Income', kk: 'Кіріс' }),
      expense: t({ ru: 'Расход', en: 'Expense', kk: 'Шығыс' }),
      label: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
    },
    actions: {
      edit: t({ ru: 'Редактировать', en: 'Edit', kk: 'Өзгерту' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
    },
    toasts: {
      loadFailed: t({
        ru: 'Не удалось загрузить категории',
        en: 'Failed to load categories',
        kk: 'Санаттарды жүктеу мүмкін болмады',
      }),
      updated: t({ ru: 'Категория обновлена', en: 'Category updated', kk: 'Санат жаңартылды' }),
      created: t({ ru: 'Категория создана', en: 'Category created', kk: 'Санат құрылды' }),
      saveFailed: t({
        ru: 'Не удалось сохранить категорию',
        en: 'Failed to save category',
        kk: 'Санатты сақтау мүмкін болмады',
      }),
      deleted: t({ ru: 'Категория удалена', en: 'Category deleted', kk: 'Санат жойылды' }),
      deleteFailed: t({
        ru: 'Не удалось удалить категорию',
        en: 'Failed to delete category',
        kk: 'Санатты жою мүмкін болмады',
      }),
      iconUploaded: t({ ru: 'Иконка загружена', en: 'Icon uploaded', kk: 'Иконка жүктелді' }),
      iconUploadFailed: t({
        ru: 'Не удалось загрузить иконку. Попробуйте ещё раз.',
        en: 'Failed to upload icon. Please try again.',
        kk: 'Иконканы жүктеу мүмкін болмады. Қайтадан көріңіз.',
      }),
    },
    confirmDelete: t({
      ru: 'Вы уверены, что хотите удалить эту категорию?',
      en: 'Are you sure you want to delete this category?',
      kk: 'Осы санатты жойғыңыз келетініне сенімдісіз бе?',
    }),
    dialog: {
      editTitle: t({ ru: 'Редактировать категорию', en: 'Edit category', kk: 'Санатты өзгерту' }),
      createTitle: t({ ru: 'Создать категорию', en: 'Create category', kk: 'Санат құру' }),
      nameLabel: t({ ru: 'Название', en: 'Name', kk: 'Атауы' }),
      chooseIcon: t({ ru: 'Выберите иконку', en: 'Choose an icon', kk: 'Иконканы таңдаңыз' }),
      uploadedIcon: t({ ru: 'Загруженная иконка:', en: 'Uploaded icon:', kk: 'Жүктелген иконка:' }),
      uploadIcon: t({ ru: 'Загрузить иконку', en: 'Upload icon', kk: 'Иконканы жүктеу' }),
      chooseColor: t({ ru: 'Выберите цвет', en: 'Choose a color', kk: 'Түсті таңдаңыз' }),
      preview: t({ ru: 'Предпросмотр:', en: 'Preview:', kk: 'Алдын ала қарау:' }),
      placeholderName: t({ ru: 'Название категории', en: 'Category name', kk: 'Санат атауы' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      save: t({ ru: 'Сохранить', en: 'Save', kk: 'Сақтау' }),
      uploading: t({ ru: 'Загрузка...', en: 'Uploading...', kk: 'Жүктелуде...' }),
    },
  },
} satisfies Dictionary;

export default content;

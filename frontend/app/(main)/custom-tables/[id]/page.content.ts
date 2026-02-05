import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTableDetailPage',
  content: {
    auth: {
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      loginRequired: t({
        ru: 'Войдите в систему, чтобы просматривать таблицу.',
        en: 'Log in to view the table.',
        kk: 'Кестені көру үшін жүйеге кіріңіз.',
      }),
    },
    errors: {
      notFound: t({
        ru: 'Таблица не найдена.',
        en: 'Table not found.',
        kk: 'Кесте табылмады.',
      }),
    },
    tabs: {
      all: t({ ru: 'Все', en: 'All', kk: 'Барлығы' }),
      paid: t({ ru: 'Оплачено', en: 'Paid', kk: 'Төленді' }),
      unpaid: t({ ru: 'Не оплачено', en: 'Unpaid', kk: 'Төленбеді' }),
    },
    actions: {
      markPaid: t({
        ru: 'Отметить как оплачено',
        en: 'Mark as paid',
        kk: 'Төленді деп белгілеу',
      }),
      markUnpaid: t({
        ru: 'Отметить как не оплачено',
        en: 'Mark as unpaid',
        kk: 'Төленбеді деп белгілеу',
      }),
      print: t({ ru: 'Печать', en: 'Print', kk: 'Басып шығару' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      markingPaid: t({
        ru: 'Отмечаем...',
        en: 'Marking...',
        kk: 'Белгіленуде...',
      }),
      markingUnpaid: t({
        ru: 'Отмечаем...',
        en: 'Marking...',
        kk: 'Белгіленуде...',
      }),
      searchPlaceholder: t({
        ru: 'Поиск по счету',
        en: 'Search invoice',
        kk: 'Шотты іздеу',
      }),
      columns: t({ ru: 'Колонки', en: 'Columns', kk: 'Бағандар' }),
      columnsReset: t({ ru: 'Сбросить', en: 'Reset', kk: 'Қалпына келтіру' }),
      columnsHint: t({
        ru: 'Скрыть / порядок',
        en: 'Hide / order',
        kk: 'Жасыру / рет',
      }),
      actionsHeader: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    },
    nav: {
      back: t({ ru: 'Назад', en: 'Back', kk: 'Артқа' }),
      tables: t({ ru: 'Таблицы', en: 'Tables', kk: 'Кестелер' }),
    },
    paidColumn: t({ ru: 'Оплачено', en: 'Paid', kk: 'Төленген' }),
    meta: {
      namePlaceholder: t({
        ru: 'Название таблицы',
        en: 'Table name',
        kk: 'Кесте атауы',
      }),
      descriptionPlaceholder: t({
        ru: 'Описание таблицы',
        en: 'Table description',
        kk: 'Кесте сипаттамасы',
      }),
      save: t({ ru: 'Сохранить', en: 'Save', kk: 'Сақтау' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      editTooltip: t({
        ru: 'Редактировать название и описание',
        en: 'Edit name and description',
        kk: 'Атау мен сипаттаманы өңдеу',
      }),
      editMenu: {
        name: t({
          ru: 'Изменить название',
          en: 'Edit name',
          kk: 'Атауын өзгерту',
        }),
        description: t({
          ru: 'Изменить описание',
          en: 'Edit description',
          kk: 'Сипаттаманы өзгерту',
        }),
        both: t({
          ru: 'Название и описание',
          en: 'Name and description',
          kk: 'Атау және сипаттама',
        }),
      },
      nameRequired: t({
        ru: 'Введите название таблицы',
        en: 'Enter table name',
        kk: 'Кесте атауын енгізіңіз',
      }),
      saved: t({ ru: 'Сохранено', en: 'Saved', kk: 'Сақталды' }),
      saveFailed: t({
        ru: 'Не удалось сохранить изменения',
        en: 'Failed to save changes',
        kk: 'Өзгерістерді сақтау мүмкін болмады',
      }),
    },
    category: {
      none: t({ ru: 'Без категории', en: 'No category', kk: 'Санатсыз' }),
      updated: t({
        ru: 'Категория обновлена',
        en: 'Category updated',
        kk: 'Санат жаңартылды',
      }),
      updateFailed: t({
        ru: 'Не удалось обновить категорию',
        en: 'Failed to update category',
        kk: 'Санатты жаңарту мүмкін болмады',
      }),
    },
    columnTypes: {
      text: t({ ru: 'Текст', en: 'Text', kk: 'Мәтін' }),
      number: t({ ru: 'Число', en: 'Number', kk: 'Сан' }),
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      boolean: t({ ru: 'Да/Нет', en: 'Yes/No', kk: 'Иә/Жоқ' }),
      select: t({ ru: 'Выбор', en: 'Select', kk: 'Таңдау' }),
      multiSelect: t({
        ru: 'Мультивыбор',
        en: 'Multi-select',
        kk: 'Көп таңдау',
      }),
    },
    grid: {
      columnWidthSaveFailed: t({
        ru: 'Не удалось сохранить ширину колонки',
        en: 'Failed to save column width',
        kk: 'Баған ені сақталмады',
      }),
      emptyTitle: t({
        ru: 'Пока нет данных',
        en: 'No data yet',
        kk: 'Әзірге дерек жоқ',
      }),
      emptySubtitle: t({
        ru: 'Начните с добавления строк в таблицу',
        en: 'Start by adding rows to your table',
        kk: 'Кестеге жолдар қосудан бастаңыз',
      }),
      addRowLabel: t({
        ru: 'Добавить строку',
        en: 'Add row',
        kk: 'Жол қосу',
      }),
      loadTableFailed: t({
        ru: 'Не удалось загрузить таблицу',
        en: 'Failed to load table',
        kk: 'Кестені жүктеу мүмкін болмады',
      }),
      loadRowsFailed: t({
        ru: 'Не удалось загрузить строки',
        en: 'Failed to load rows',
        kk: 'Жолдарды жүктеу мүмкін болмады',
      }),
      saveValueFailed: t({
        ru: 'Не удалось сохранить значение',
        en: 'Failed to save value',
        kk: 'Мәнді сақтау мүмкін болмады',
      }),
      loadMore: t({ ru: 'Загрузить ещё', en: 'Load more', kk: 'Тағы жүктеу' }),
      noMore: t({
        ru: 'Больше нет строк',
        en: 'No more rows',
        kk: 'Жолдар жоқ',
      }),
      loadingMore: t({
        ru: 'Загрузка...',
        en: 'Loading...',
        kk: 'Жүктелуде...',
      }),
    },
    paste: {
      titlePrefix: t({ ru: 'Вставка ', en: 'Paste ', kk: 'Қою ' }),
      titleSuffix: t({ ru: ' строк', en: ' rows', kk: ' жол' }),
      titleFallback: t({
        ru: 'Вставка строк',
        en: 'Paste rows',
        kk: 'Жолдарды қою',
      }),
      headersToggle: t({
        ru: 'Первая строка — заголовки',
        en: 'First row is headers',
        kk: 'Бірінші жол — тақырыптар',
      }),
      parsing: t({
        ru: 'Подготовка превью...',
        en: 'Preparing preview...',
        kk: 'Алдын ала көру дайындалуда...',
      }),
      add: t({ ru: 'Добавить', en: 'Add', kk: 'Қосу' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      noRows: t({
        ru: 'Нет строк для вставки',
        en: 'No rows to insert',
        kk: 'Қоюға жол жоқ',
      }),
      errorsTitle: t({
        ru: 'Есть ошибки',
        en: 'Errors found',
        kk: 'Қателер бар',
      }),
      errors: {
        date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
        amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
        currency: t({ ru: 'Валюта', en: 'Currency', kk: 'Валюта' }),
        paid: t({ ru: 'Paid', en: 'Paid', kk: 'Төленді' }),
      },
      addedPrefix: t({ ru: 'Добавлено ', en: 'Added ', kk: 'Қосылды ' }),
      addedSuffix: t({ ru: ' строк', en: ' rows', kk: ' жол' }),
      undo: t({ ru: 'Отменить', en: 'Undo', kk: 'Болдырмау' }),
      insertFailed: t({
        ru: 'Не удалось добавить строки',
        en: 'Failed to add rows',
        kk: 'Жолдарды қосу мүмкін болмады',
      }),
      undoFailed: t({
        ru: 'Не удалось отменить вставку',
        en: 'Failed to undo insert',
        kk: 'Қоюды болдырмау мүмкін болмады',
      }),
      moreRowsPrefix: t({ ru: 'И ещё ', en: 'And ', kk: 'Тағы ' }),
      moreRowsSuffix: t({
        ru: ' строк',
        en: ' more rows',
        kk: ' жол',
      }),
      mappingTitle: t({
        ru: 'Сопоставление колонок',
        en: 'Column mapping',
        kk: 'Бағандарды сәйкестендіру',
      }),
      mappingIgnore: t({
        ru: 'Не импортировать',
        en: 'Ignore',
        kk: 'Импорттамау',
      }),
      mappingNew: t({
        ru: 'Новая колонка',
        en: 'New column',
        kk: 'Жаңа баған',
      }),
      mappingNewPlaceholder: t({
        ru: 'Название колонки',
        en: 'Column name',
        kk: 'Баған атауы',
      }),
      missingColumnTitle: t({
        ru: 'Укажите название новой колонки',
        en: 'Provide a name for the new column',
        kk: 'Жаңа баған атауын енгізіңіз',
      }),
      mappingTypeLabel: t({
        ru: 'Тип',
        en: 'Type',
        kk: 'Түрі',
      }),
      defaults: {
        date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
        type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
        amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
        currency: t({ ru: 'Валюта', en: 'Currency', kk: 'Валюта' }),
        comment: t({
          ru: 'Комментарий',
          en: 'Comment',
          kk: 'Түсініктеме',
        }),
        paid: t({ ru: 'Оплачено', en: 'Paid', kk: 'Төленді' }),
        columnPrefix: t({
          ru: 'Колонка',
          en: 'Column',
          kk: 'Баған',
        }),
      },
    },
    toasts: {
      noMoreRows: t({
        ru: 'Больше нет строк',
        en: 'No more rows',
        kk: 'Жолдар жоқ',
      }),
      creatingPaidColumn: t({
        ru: 'Создание колонки оплаты...',
        en: 'Creating Paid column...',
        kk: 'Төлем бағаны жасалуда...',
      }),
      paidColumnCreated: t({
        ru: 'Колонка оплаты создана',
        en: 'Paid column created',
        kk: 'Төлем бағаны жасалды',
      }),
      paidColumnCreateFailed: t({
        ru: 'Не удалось создать колонку оплаты',
        en: 'Failed to create Paid column',
        kk: 'Төлем бағанын жасау мүмкін болмады',
      }),
      updateSomeRowsFailed: t({
        ru: 'Не удалось обновить некоторые строки',
        en: 'Failed to update some rows',
        kk: 'Кейбір жолдарды жаңарту мүмкін болмады',
      }),
      markedPaid: t({
        ru: 'Отмечено как оплачено',
        en: 'Marked as paid',
        kk: 'Төленді деп белгіленді',
      }),
      markedUnpaid: t({
        ru: 'Отмечено как не оплачено',
        en: 'Marked as unpaid',
        kk: 'Төленбеді деп белгіленді',
      }),
      updateRowsFailed: t({
        ru: 'Не удалось обновить строки',
        en: 'Failed to update rows',
        kk: 'Жолдарды жаңарту мүмкін болмады',
      }),
    },
    zoom: {
      out: t({ ru: 'Уменьшить масштаб', en: 'Zoom out', kk: 'Кішірейту' }),
      in: t({ ru: 'Увеличить масштаб', en: 'Zoom in', kk: 'Үлкейту' }),
    },
    fill: {
      column: t({ ru: 'Колонка', en: 'Column', kk: 'Баған' }),
      row: t({ ru: 'Строка', en: 'Row', kk: 'Жол' }),
      selectedRowsPrefix: t({
        ru: 'Выбрано строк',
        en: 'Selected rows',
        kk: 'Таңдалған жолдар',
      }),
      rowsFillTitle: t({
        ru: 'Заливка строк',
        en: 'Row fill',
        kk: 'Жолды бояу',
      }),
      colorTooltip: t({
        ru: 'Цвет заливки',
        en: 'Fill color',
        kk: 'Бояу түсі',
      }),
      fillButton: t({ ru: 'Заливка', en: 'Fill', kk: 'Бояу' }),
      clear: t({ ru: 'Очистить', en: 'Clear', kk: 'Тазалау' }),
      chooseRowsError: t({
        ru: 'Выберите строки, к которым нужно применить заливку',
        en: 'Select rows to apply fill',
        kk: 'Бояуды қолдану үшін жолдарды таңдаңыз',
      }),
      applied: t({
        ru: 'Заливка применена',
        en: 'Fill applied',
        kk: 'Бояу қолданылды',
      }),
      clearedToast: t({
        ru: 'Заливка сброшена',
        en: 'Fill cleared',
        kk: 'Бояу тазаланды',
      }),
      applyFailed: t({
        ru: 'Не удалось применить заливку',
        en: 'Failed to apply fill',
        kk: 'Бояуды қолдану мүмкін болмады',
      }),
    },
    addRow: {
      loading: t({
        ru: 'Добавление строки...',
        en: 'Adding row...',
        kk: 'Жол қосылуда...',
      }),
      success: t({
        ru: 'Строка добавлена',
        en: 'Row added',
        kk: 'Жол қосылды',
      }),
      failed: t({
        ru: 'Не удалось добавить строку',
        en: 'Failed to add row',
        kk: 'Жол қосу мүмкін болмады',
      }),
    },
    renameColumn: {
      success: t({
        ru: 'Название колонки обновлено',
        en: 'Column renamed',
        kk: 'Баған атауы жаңартылды',
      }),
      failed: t({
        ru: 'Не удалось переименовать колонку',
        en: 'Failed to rename column',
        kk: 'Баған атын өзгерту мүмкін болмады',
      }),
    },
    deleteColumn: {
      loading: t({
        ru: 'Удаление колонки...',
        en: 'Deleting column...',
        kk: 'Баған жойылуда...',
      }),
      success: t({
        ru: 'Колонка удалена',
        en: 'Column deleted',
        kk: 'Баған жойылды',
      }),
      failed: t({
        ru: 'Не удалось удалить колонку',
        en: 'Failed to delete column',
        kk: 'Бағанды жою мүмкін болмады',
      }),
      confirmTitle: t({
        ru: 'Удалить колонку?',
        en: 'Delete column?',
        kk: 'Бағанды жою керек пе?',
      }),
      confirmWithNamePrefix: t({
        ru: 'Колонка “',
        en: 'Column “',
        kk: 'Баған “',
      }),
      confirmWithNameSuffix: t({
        ru: '” будет удалена. Значения в строках останутся в данных, но не будут отображаться (пока не добавите колонку снова).',
        en: '” will be deleted. Values will remain in data but won’t be shown (until you add the column again).',
        kk: '” жойылады. Мәндер деректе қалады, бірақ көрсетілмейді (бағанды қайта қоспайынша).',
      }),
      confirmNoName: t({
        ru: 'Колонка будет удалена.',
        en: 'Column will be deleted.',
        kk: 'Баған жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    deleteRow: {
      loading: t({
        ru: 'Удаление строки...',
        en: 'Deleting row...',
        kk: 'Жол жойылуда...',
      }),
      success: t({
        ru: 'Строка удалена',
        en: 'Row deleted',
        kk: 'Жол жойылды',
      }),
      failed: t({
        ru: 'Не удалось удалить строку',
        en: 'Failed to delete row',
        kk: 'Жолды жою мүмкін болмады',
      }),
      confirmTitle: t({
        ru: 'Удалить строку?',
        en: 'Delete row?',
        kk: 'Жолды жою керек пе?',
      }),
      confirmWithNumberPrefix: t({ ru: 'Строка #', en: 'Row #', kk: 'Жол #' }),
      confirmWithNumberSuffix: t({
        ru: ' будет удалена.',
        en: ' will be deleted.',
        kk: ' жойылады.',
      }),
      confirmNoNumber: t({
        ru: 'Строка будет удалена.',
        en: 'Row will be deleted.',
        kk: 'Жол жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    bulkDeleteRows: {
      loading: t({
        ru: 'Удаление строк...',
        en: 'Deleting rows...',
        kk: 'Жолдар жойылуда...',
      }),
      success: t({
        ru: 'Строки удалены',
        en: 'Rows deleted',
        kk: 'Жолдар жойылды',
      }),
      failed: t({
        ru: 'Не удалось удалить некоторые строки',
        en: 'Failed to delete some rows',
        kk: 'Кейбір жолдарды жою мүмкін болмады',
      }),
      confirmTitle: t({
        ru: 'Удалить строки?',
        en: 'Delete rows?',
        kk: 'Жолдарды жою керек пе?',
      }),
      confirmMessagePrefix: t({
        ru: 'Будут удалены ',
        en: 'Delete ',
        kk: 'Жойылады ',
      }),
      confirmMessageSuffix: t({
        ru: ' выбранных строк.',
        en: ' selected rows?',
        kk: ' таңдалған жол.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    columnIcon: {
      uploaded: t({
        ru: 'Иконка загружена',
        en: 'Icon uploaded',
        kk: 'Иконка жүктелді',
      }),
      uploadFailed: t({
        ru: 'Не удалось загрузить иконку',
        en: 'Failed to upload icon',
        kk: 'Иконканы жүктеу мүмкін болмады',
      }),
    },
    addColumn: {
      modalTitle: t({
        ru: 'Новая колонка',
        en: 'New column',
        kk: 'Жаңа баған',
      }),
      loading: t({
        ru: 'Добавление колонки...',
        en: 'Adding column...',
        kk: 'Баған қосылуда...',
      }),
      success: t({
        ru: 'Колонка добавлена',
        en: 'Column added',
        kk: 'Баған қосылды',
      }),
      failed: t({
        ru: 'Не удалось добавить колонку',
        en: 'Failed to add column',
        kk: 'Баған қосу мүмкін болмады',
      }),
      titleLabel: t({
        ru: 'Название колонки',
        en: 'Column name',
        kk: 'Баған атауы',
      }),
      titlePlaceholder: t({
        ru: 'Например: Сумма, Дата, Контрагент',
        en: 'e.g. Amount, Date, Counterparty',
        kk: 'Мысалы: Сома, Күні, Контрагент',
      }),
      typeLabel: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      iconLabel: t({ ru: 'Иконка', en: 'Icon', kk: 'Иконка' }),
      choose: t({ ru: 'Выбрать', en: 'Choose', kk: 'Таңдау' }),
      uploadIcon: t({
        ru: 'Загрузить иконку',
        en: 'Upload icon',
        kk: 'Иконканы жүктеу',
      }),
      uploading: t({
        ru: 'Загрузка...',
        en: 'Uploading...',
        kk: 'Жүктелуде...',
      }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      save: t({ ru: 'Сохранить', en: 'Save', kk: 'Сақтау' }),
    },
    dateFilters: {
      from: t({ ru: 'Дата от', en: 'Date from', kk: 'Күні бастап' }),
      to: t({ ru: 'Дата до', en: 'Date to', kk: 'Күні дейін' }),
    },
  },
} satisfies Dictionary;

export default content;

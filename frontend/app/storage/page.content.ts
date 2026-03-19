import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'storagePage',
  content: {
    title: t({ ru: 'Хранилище', en: 'Storage', kk: 'Қойма' }),
    subtitle: t({
      ru: 'Управляйте загруженными файлами и документами',
      en: 'Manage uploaded files and documents',
      kk: 'Жүктелген файлдар мен құжаттарды басқарыңыз',
    }),
    driveSync: {
      title: t({
        ru: 'Синхронизация с Google Drive',
        en: 'Google Drive sync',
        kk: 'Google Drive синхрондауы',
      }),
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      lastSync: t({
        ru: 'Последняя синхронизация: {time}',
        en: 'Last sync: {time}',
        kk: 'Соңғы синхрондау: {time}',
      }),
      status: {
        connected: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
        disconnected: t({
          ru: 'Не подключено',
          en: 'Not connected',
          kk: 'Қосылмаған',
        }),
        needsReauth: t({
          ru: 'Нужна повторная авторизация',
          en: 'Reauthorization required',
          kk: 'Қайта авторизация қажет',
        }),
      },
      actions: {
        connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
        import: t({
          ru: 'Импортировать из Drive',
          en: 'Import from Drive',
          kk: 'Drive-тен импорттау',
        }),
        syncNow: t({
          ru: 'Синхронизировать',
          en: 'Sync now',
          kk: 'Синхрондау',
        }),
        settings: t({ ru: 'Настройки', en: 'Settings', kk: 'Баптаулар' }),
      },
      toasts: {
        syncStarted: t({
          ru: 'Синхронизация запущена',
          en: 'Sync started',
          kk: 'Синхрондау басталды',
        }),
        imported: t({
          ru: 'Импортировано файлов: {count}',
          en: 'Imported files: {count}',
          kk: 'Импортталған файлдар: {count}',
        }),
      },
      errors: {
        loadStatus: t({
          ru: 'Не удалось загрузить статус Google Drive',
          en: 'Failed to load Google Drive status',
          kk: 'Google Drive статусын жүктеу мүмкін болмады',
        }),
        connectFailed: t({
          ru: 'Не удалось подключить Google Drive',
          en: 'Failed to connect Google Drive',
          kk: 'Google Drive қосу мүмкін болмады',
        }),
        syncFailed: t({
          ru: 'Не удалось синхронизировать',
          en: 'Failed to sync',
          kk: 'Синхрондау мүмкін болмады',
        }),
        importFailed: t({
          ru: 'Не удалось импортировать файлы: {files}',
          en: 'Failed to import files: {files}',
          kk: 'Файлдарды импорттау мүмкін болмады: {files}',
        }),
        pickerUnavailable: t({
          ru: 'Google Picker недоступен',
          en: 'Google Picker is unavailable',
          kk: 'Google Picker қолжетімсіз',
        }),
      },
    },
    dropboxSync: {
      title: t({
        ru: 'Синхронизация с Dropbox',
        en: 'Dropbox sync',
        kk: 'Dropbox синхрондауы',
      }),
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      lastSync: t({
        ru: 'Последняя синхронизация: {time}',
        en: 'Last sync: {time}',
        kk: 'Соңғы синхрондау: {time}',
      }),
      status: {
        connected: t({ ru: 'Подключено', en: 'Connected', kk: 'Қосылған' }),
        disconnected: t({
          ru: 'Не подключено',
          en: 'Not connected',
          kk: 'Қосылмаған',
        }),
        needsReauth: t({
          ru: 'Нужна повторная авторизация',
          en: 'Reauthorization required',
          kk: 'Қайта авторизация қажет',
        }),
      },
      actions: {
        connect: t({ ru: 'Подключить', en: 'Connect', kk: 'Қосу' }),
        import: t({
          ru: 'Импортировать из Dropbox',
          en: 'Import from Dropbox',
          kk: 'Dropbox-тен импорттау',
        }),
        syncNow: t({
          ru: 'Синхронизировать',
          en: 'Sync now',
          kk: 'Синхрондау',
        }),
        settings: t({ ru: 'Настройки', en: 'Settings', kk: 'Баптаулар' }),
      },
      toasts: {
        syncStarted: t({
          ru: 'Синхронизация запущена',
          en: 'Sync started',
          kk: 'Синхрондау басталды',
        }),
        imported: t({
          ru: 'Импортировано файлов: {count}',
          en: 'Imported files: {count}',
          kk: 'Импортталған файлдар: {count}',
        }),
      },
      errors: {
        loadStatus: t({
          ru: 'Не удалось загрузить статус Dropbox',
          en: 'Failed to load Dropbox status',
          kk: 'Dropbox статусын жүктеу мүмкін болмады',
        }),
        connectFailed: t({
          ru: 'Не удалось подключить Dropbox',
          en: 'Failed to connect Dropbox',
          kk: 'Dropbox қосу мүмкін болмады',
        }),
        syncFailed: t({
          ru: 'Не удалось синхронизировать',
          en: 'Failed to sync',
          kk: 'Синхрондау мүмкін болмады',
        }),
        importFailed: t({
          ru: 'Не удалось импортировать файлы: {files}',
          en: 'Failed to import files: {files}',
          kk: 'Файлдарды импорттау мүмкін болмады: {files}',
        }),
        pickerUnavailable: t({
          ru: 'Dropbox Chooser недоступен',
          en: 'Dropbox Chooser is unavailable',
          kk: 'Dropbox Chooser қолжетімсіз',
        }),
      },
    },
    tabs: {
      all: t({ ru: 'Файлы', en: 'Files', kk: 'Файлдар' }),
      trash: t({ ru: 'Корзина', en: 'Trash', kk: 'Қоқыс' }),
    },
    pagination: {
      shown: t({
        ru: 'Показано {from}–{to} из {count}',
        en: 'Showing {from}–{to} of {count}',
        kk: '{from}–{to} / {count} көрсетілді',
      }),
      previous: t({ ru: 'Предыдущая', en: 'Previous', kk: 'Алдыңғы' }),
      next: t({ ru: 'Следующая', en: 'Next', kk: 'Келесі' }),
      pageOf: t({
        ru: 'Страница {page} из {count}',
        en: 'Page {page} of {count}',
        kk: '{page} / {count} бет',
      }),
    },
    trash: {
      title: t({ ru: 'Корзина', en: 'Trash', kk: 'Қоқыс' }),
      selectedLabel: t({
        ru: 'Выбрано: {count}',
        en: 'Selected: {count}',
        kk: 'Таңдалды: {count}',
      }),
      restoreSelected: t({
        ru: 'Восстановить',
        en: 'Restore',
        kk: 'Қалпына келтіру',
      }),
      deleteSelected: t({
        ru: 'Удалить',
        en: 'Delete',
        kk: 'Жою',
      }),
      emptyAction: t({
        ru: 'Очистить корзину',
        en: 'Empty trash',
        kk: 'Қоқысты тазарту',
      }),
      selectAll: t({
        ru: 'Выбрать все в корзине',
        en: 'Select all in trash',
        kk: 'Қоқыстағының бәрін таңдау',
      }),
      selectRow: t({
        ru: 'Выбрать файл',
        en: 'Select file',
        kk: 'Файлды таңдау',
      }),
      expiresIn: t({
        ru: 'Удалится через {days} дн.',
        en: 'Deletes in {days}d',
        kk: '{days} күннен кейін жойылады',
      }),
      expiresToday: t({
        ru: 'Удалится сегодня',
        en: 'Deletes today',
        kk: 'Бүгін жойылады',
      }),
      empty: {
        title: t({
          ru: 'Корзина пуста',
          en: 'Trash is empty',
          kk: 'Қоқыс бос',
        }),
        subtitle: t({
          ru: 'Удалённые файлы появятся здесь',
          en: 'Deleted files will appear here',
          kk: 'Жойылған файлдар осында пайда болады',
        }),
      },
      restoreAction: t({
        ru: 'Восстановить',
        en: 'Restore',
        kk: 'Қалпына келтіру',
      }),
      deleteAction: t({
        ru: 'Удалить навсегда',
        en: 'Delete forever',
        kk: 'Мүлде жою',
      }),
      restoreLoading: t({
        ru: 'Восстанавливаем...',
        en: 'Restoring...',
        kk: 'Қалпына келтіру...',
      }),
      restoreSuccess: t({
        ru: 'Файл восстановлен',
        en: 'File restored',
        kk: 'Файл қалпына келтірілді',
      }),
      restoreFailed: t({
        ru: 'Не удалось восстановить файл',
        en: 'Failed to restore file',
        kk: 'Файлды қалпына келтіру мүмкін болмады',
      }),
      deleteLoading: t({
        ru: 'Удаляем навсегда...',
        en: 'Deleting forever...',
        kk: 'Мүлде жою...',
      }),
      deleteSuccess: t({
        ru: 'Файл удалён навсегда',
        en: 'File deleted permanently',
        kk: 'Файл мүлде жойылды',
      }),
      deleteFailed: t({
        ru: 'Не удалось удалить файл навсегда',
        en: 'Failed to delete file permanently',
        kk: 'Файлды мүлде жою мүмкін болмады',
      }),
      bulkDeleteTitle: t({
        ru: 'Удалить выбранные файлы?',
        en: 'Delete selected files?',
        kk: 'Таңдалған файлдарды жою керек пе?',
      }),
      bulkDeleteMessage: t({
        ru: 'Выбранные файлы ({count}) будут удалены без возможности восстановления.',
        en: 'Selected files ({count}) will be deleted permanently.',
        kk: 'Таңдалған файлдар ({count}) қайтарусыз жойылады.',
      }),
      bulkDeleteConfirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      bulkDeleteCancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      emptyTitle: t({
        ru: 'Очистить корзину?',
        en: 'Empty trash?',
        kk: 'Қоқысты тазарту керек пе?',
      }),
      emptyMessage: t({
        ru: 'Все файлы из корзины будут удалены без возможности восстановления.',
        en: 'All files in trash will be deleted permanently.',
        kk: 'Қоқыстағы барлық файлдар қайтарусыз жойылады.',
      }),
      emptyConfirm: t({
        ru: 'Очистить',
        en: 'Empty',
        kk: 'Тазарту',
      }),
      emptyCancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    searchPlaceholder: t({
      ru: 'Поиск по файлам...',
      en: 'Search files...',
      kk: 'Файлдардан іздеу...',
    }),
    filters: {
      button: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      title: t({ ru: 'Фильтры', en: 'Filters', kk: 'Сүзгілер' }),
      reset: t({ ru: 'Сбросить', en: 'Reset', kk: 'Қалпына келтіру' }),
      apply: t({ ru: 'Применить', en: 'Apply', kk: 'Қолдану' }),
      all: t({ ru: 'Все', en: 'All', kk: 'Барлығы' }),
      status: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      bank: t({ ru: 'Банк', en: 'Bank', kk: 'Банк' }),
      category: t({ ru: 'Категория', en: 'Category', kk: 'Санат' }),
      folder: t({ ru: 'Папка', en: 'Folder', kk: 'Қапшық' }),
      tags: t({ ru: 'Теги', en: 'Tags', kk: 'Тегтер' }),
      accessType: t({
        ru: 'Тип доступа',
        en: 'Access type',
        kk: 'Қолжетімділік түрі',
      }),
      owned: t({ ru: 'Мои файлы', en: 'My files', kk: 'Менің файлдарым' }),
      shared: t({
        ru: 'Доступные мне',
        en: 'Shared with me',
        kk: 'Маған қолжетімді',
      }),
    },
    sort: {
      newest: t({
        ru: 'Сначала новые',
        en: 'Newest first',
        kk: 'Алдымен жаңалары',
      }),
      oldest: t({
        ru: 'Сначала старые',
        en: 'Oldest first',
        kk: 'Алдымен ескілері',
      }),
      nameAsc: t({ ru: 'Имя A–Z', en: 'Name A–Z', kk: 'Атауы A–Z' }),
      nameDesc: t({ ru: 'Имя Z–A', en: 'Name Z–A', kk: 'Атауы Z–A' }),
      bankAsc: t({ ru: 'Банк A–Z', en: 'Bank A–Z', kk: 'Банк A–Z' }),
      bankDesc: t({ ru: 'Банк Z–A', en: 'Bank Z–A', kk: 'Банк Z–A' }),
    },
    views: {
      title: t({
        ru: 'Сохранённые виды',
        en: 'Saved views',
        kk: 'Сақталған көріністер',
      }),
      namePlaceholder: t({
        ru: 'Название вида',
        en: 'View name',
        kk: 'Көрініс атауы',
      }),
      saveTooltip: t({
        ru: 'Сохранить текущие фильтры и сортировку',
        en: 'Save current filters and sorting',
        kk: 'Ағымдағы сүзгілер мен сұрыптауды сақтау',
      }),
      loading: t({ ru: 'Загрузка...', en: 'Loading...', kk: 'Жүктелуде...' }),
      empty: t({
        ru: 'Нет сохранённых видов',
        en: 'No saved views',
        kk: 'Сақталған көріністер жоқ',
      }),
      delete: t({
        ru: 'В корзину',
        en: 'Move to trash',
        kk: 'Қоқысқа',
      }),
    },
    folders: {
      title: t({ ru: 'Папки', en: 'Folders', kk: 'Қапшықтар' }),
      all: t({ ru: 'Все файлы', en: 'All files', kk: 'Барлық файлдар' }),
      none: t({ ru: 'Без папки', en: 'No folder', kk: 'Қапшықсыз' }),
      createPlaceholder: t({
        ru: 'Новая папка',
        en: 'New folder',
        kk: 'Жаңа қапшық',
      }),
      createTooltip: t({
        ru: 'Создать папку',
        en: 'Create folder',
        kk: 'Қапшық жасау',
      }),
      renameTooltip: t({
        ru: 'Переименовать папку',
        en: 'Rename folder',
        kk: 'Қапшық атауын өзгерту',
      }),
      nameTooLong: t({
        ru: 'Название папки не должно превышать 40 символов',
        en: "Folder name can't exceed 40 characters",
        kk: 'Қапшық атауы 40 таңбадан аспауы керек',
      }),
      cancelRename: t({ ru: 'Отменить', en: 'Cancel', kk: 'Болдырмау' }),
      deleteTooltip: t({
        ru: 'Удалить папку',
        en: 'Delete folder',
        kk: 'Қапшықты жою',
      }),
      deleteTitle: t({
        ru: 'Удалить папку?',
        en: 'Delete folder?',
        kk: 'Қапшықты жою керек пе?',
      }),
      deleteMessagePrefix: t({
        ru: 'Папка ',
        en: 'Folder ',
        kk: 'Қапшық ',
      }),
      deleteMessageSuffix: t({
        ru: ' будет удалена.',
        en: ' will be deleted.',
        kk: ' жойылады.',
      }),
      deleteMessageFallback: t({
        ru: 'Папка будет удалена.',
        en: 'Folder will be deleted.',
        kk: 'Қапшық жойылады.',
      }),
      deleteWithContents: t({
        ru: 'Удалить вместе с содержимым',
        en: 'Delete with contents',
        kk: 'Құрамымен бірге жою',
      }),
      deleteConfirm: t({
        ru: 'Удалить папку',
        en: 'Delete folder',
        kk: 'Қапшықты жою',
      }),
      deleteCancel: t({
        ru: 'Отмена',
        en: 'Cancel',
        kk: 'Болдырмау',
      }),
    },
    tags: {
      title: t({ ru: 'Теги', en: 'Tags', kk: 'Тегтер' }),
      empty: t({ ru: 'Теги не заданы', en: 'No tags yet', kk: 'Тегтер жоқ' }),
      clear: t({
        ru: 'Сбросить теги',
        en: 'Clear tags',
        kk: 'Тегтерді тазарту',
      }),
      createPlaceholder: t({
        ru: 'Новый тег',
        en: 'New tag',
        kk: 'Жаңа тег',
      }),
      createTooltip: t({
        ru: 'Создать тег',
        en: 'Create tag',
        kk: 'Тег жасау',
      }),
      renameTooltip: t({
        ru: 'Переименовать тег',
        en: 'Rename tag',
        kk: 'Тег атауын өзгерту',
      }),
      deleteTooltip: t({
        ru: 'Удалить тег',
        en: 'Delete tag',
        kk: 'Тегті жою',
      }),
      cancelRename: t({ ru: 'Отменить', en: 'Cancel', kk: 'Болдырмау' }),
      deleteTitle: t({
        ru: 'Удалить тег?',
        en: 'Delete tag?',
        kk: 'Тегті жою керек пе?',
      }),
      deleteMessagePrefix: t({
        ru: 'Тег ',
        en: 'Tag ',
        kk: 'Тег ',
      }),
      deleteMessageSuffix: t({
        ru: ' будет удалён.',
        en: ' will be deleted.',
        kk: ' жойылады.',
      }),
      deleteMessageFallback: t({
        ru: 'Тег будет удалён.',
        en: 'Tag will be deleted.',
        kk: 'Тег жойылады.',
      }),
      deleteConfirm: t({
        ru: 'Удалить тег',
        en: 'Delete tag',
        kk: 'Тегті жою',
      }),
      deleteCancel: t({
        ru: 'Отмена',
        en: 'Cancel',
        kk: 'Болдырмау',
      }),
    },
    modals: {
      foldersTitle: t({ ru: 'Папки', en: 'Folders', kk: 'Қапшықтар' }),
      foldersSubtitle: t({
        ru: 'Создавайте папки и раскладывайте файлы по разделам',
        en: 'Create folders and organize files',
        kk: 'Қапшықтар құрып, файлдарды реттеңіз',
      }),
      folderCreateTitle: t({
        ru: 'Создать папку',
        en: 'Create folder',
        kk: 'Қапшық жасау',
      }),
      folderListTitle: t({
        ru: 'Список папок',
        en: 'Folder list',
        kk: 'Қапшықтар тізімі',
      }),
      folderListEmpty: t({
        ru: 'Папок пока нет',
        en: 'No folders yet',
        kk: 'Қапшықтар жоқ',
      }),
      folderAssignTitle: t({
        ru: 'Добавить файлы в папку',
        en: 'Add files to folder',
        kk: 'Файлдарды қапшыққа қосу',
      }),
      folderAssignHint: t({
        ru: 'Выберите папку и отметьте файлы ниже',
        en: 'Select a folder and choose files below',
        kk: 'Қапшықты таңдаңыз және файлдарды белгілеңіз',
      }),
      folderSelectLabel: t({
        ru: 'Папка',
        en: 'Folder',
        kk: 'Қапшық',
      }),
      folderSelectPlaceholder: t({
        ru: 'Выберите папку',
        en: 'Choose a folder',
        kk: 'Қапшықты таңдаңыз',
      }),
      filesLabel: t({ ru: 'Файлы', en: 'Files', kk: 'Файлдар' }),
      fileSearchPlaceholder: t({
        ru: 'Найти файл по названию, банку или тегу',
        en: 'Search by name, bank, or tag',
        kk: 'Аты, банк немесе тег бойынша іздеу',
      }),
      filesEmpty: t({
        ru: 'Файлов нет',
        en: 'No files found',
        kk: 'Файлдар жоқ',
      }),
      selectAll: t({
        ru: 'Выбрать все',
        en: 'Select all',
        kk: 'Барлығын таңдау',
      }),
      clearSelection: t({
        ru: 'Снять выбор',
        en: 'Clear selection',
        kk: 'Таңдауды алып тастау',
      }),
      assignAction: t({
        ru: 'Добавить в папку',
        en: 'Add to folder',
        kk: 'Қапшыққа қосу',
      }),
      assigning: t({
        ru: 'Добавляем...',
        en: 'Adding...',
        kk: 'Қосылуда...',
      }),
      selectedLabel: t({
        ru: 'Выбрано:',
        en: 'Selected:',
        kk: 'Таңдалды:',
      }),
      readOnlyHint: t({
        ru: 'Нет прав на перемещение',
        en: 'No permission to move',
        kk: 'Жылжытуға құқық жоқ',
      }),
      tagsTitle: t({ ru: 'Теги', en: 'Tags', kk: 'Тегтер' }),
      tagsSubtitle: t({
        ru: 'Создавайте теги и переименовывайте в списке',
        en: 'Create and rename tags here',
        kk: 'Тегтерді жасап, атауын өзгертіңіз',
      }),
      tagCreateTitle: t({
        ru: 'Создать тег',
        en: 'Create tag',
        kk: 'Тег жасау',
      }),
      tagListTitle: t({
        ru: 'Список тегов',
        en: 'Tag list',
        kk: 'Тегтер тізімі',
      }),
      viewsTitle: t({
        ru: 'Сохранённые виды',
        en: 'Saved views',
        kk: 'Сақталған көріністер',
      }),
      viewsSubtitle: t({
        ru: 'Сохраняйте фильтры и быстро возвращайтесь к ним',
        en: 'Save filters and return quickly',
        kk: 'Сүзгілерді сақтап, тез қайта оралыңыз',
      }),
      viewCreateTitle: t({
        ru: 'Сохранить текущий вид',
        en: 'Save current view',
        kk: 'Ағымдағы көріністі сақтау',
      }),
      viewSaveAction: t({
        ru: 'Сохранить',
        en: 'Save',
        kk: 'Сақтау',
      }),
      viewSaving: t({
        ru: 'Сохраняем...',
        en: 'Saving...',
        kk: 'Сақталуда...',
      }),
      viewListTitle: t({
        ru: 'Сохранённые виды',
        en: 'Saved views',
        kk: 'Сақталған көріністер',
      }),
      viewActive: t({
        ru: 'Активен',
        en: 'Active',
        kk: 'Белсенді',
      }),
    },
    dragDrop: {
      pick: t({ ru: 'Перетащить', en: 'Drag', kk: 'Сүйреу' }),
      place: t({ ru: 'Сюда', en: 'Place', kk: 'Осында' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      title: t({
        ru: 'Перетащите в папку',
        en: 'Drop into folder',
        kk: 'Қапшыққа сүйреңіз',
      }),
      subtitle: t({
        ru: 'Удерживайте файл и отпустите над нужной папкой',
        en: 'Hold the file and release over a folder',
        kk: 'Файлды ұстап, керек қапшыққа тастаңыз',
      }),
      empty: t({
        ru: 'Создайте папку, чтобы начать сортировку',
        en: 'Create a folder to start organizing',
        kk: 'Сұрыптау үшін қапшық жасаңыз',
      }),
      rowHint: t({
        ru: 'Перетащите файл в папку',
        en: 'Drag to move into a folder',
        kk: 'Қапшыққа сүйреңіз',
      }),
    },
    table: {
      fileName: t({ ru: 'Имя файла', en: 'File name', kk: 'Файл атауы' }),
      bank: t({ ru: 'Банк', en: 'Bank', kk: 'Банк' }),
      account: t({ ru: 'Счет', en: 'Account', kk: 'Шот' }),
      size: t({ ru: 'Размер', en: 'Size', kk: 'Өлшемі' }),
      status: t({ ru: 'Статус', en: 'Status', kk: 'Күйі' }),
      category: t({ ru: 'Категория', en: 'Category', kk: 'Санат' }),
      access: t({ ru: 'Доступ', en: 'Access', kk: 'Қолжетімділік' }),
      createdAt: t({ ru: 'Создано', en: 'Created', kk: 'Құрылған' }),
      deletedAt: t({ ru: 'Удалено', en: 'Deleted', kk: 'Жойылған' }),
      actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    },
    empty: {
      title: t({
        ru: 'Файлы не найдены',
        en: 'No files found',
        kk: 'Файлдар табылмады',
      }),
      subtitle: t({
        ru: 'Попробуйте изменить параметры поиска или фильтры',
        en: 'Try adjusting search or filters',
        kk: 'Іздеу немесе сүзгілер параметрлерін өзгертіп көріңіз',
      }),
    },
    sharedLinksShort: t({ ru: 'ссылок', en: 'links', kk: 'сілтемелер' }),
    categoryCell: {
      choose: t({ ru: 'Выбрать', en: 'Choose', kk: 'Таңдау' }),
      none: t({ ru: 'Без категории', en: 'No category', kk: 'Санатсыз' }),
    },
    permission: {
      owner: t({ ru: 'Владелец', en: 'Owner', kk: 'Иесі' }),
      editor: t({ ru: 'Редактор', en: 'Editor', kk: 'Өңдеуші' }),
      viewer: t({ ru: 'Просмотр', en: 'View', kk: 'Қарау' }),
      downloader: t({ ru: 'Скачивание', en: 'Download', kk: 'Жүктеу' }),
      access: t({ ru: 'Доступ', en: 'Access', kk: 'Қолжетімділік' }),
    },
    statusLabels: {
      completed: t({ ru: 'Завершено', en: 'Completed', kk: 'Аяқталды' }),
      processing: t({ ru: 'Обрабатывается', en: 'Processing', kk: 'Өңделуде' }),
      error: t({ ru: 'Ошибка', en: 'Error', kk: 'Қате' }),
      uploaded: t({ ru: 'Загружено', en: 'Uploaded', kk: 'Жүктелді' }),
      parsed: t({ ru: 'Распарсено', en: 'Parsed', kk: 'Өңделді' }),
    },
    availability: {
      labels: {
        both: t({ ru: 'OK', en: 'OK', kk: 'OK' }),
        disk: t({ ru: 'Диск', en: 'Disk', kk: 'Disk' }),
        db: t({ ru: 'БД', en: 'DB', kk: 'DB' }),
        missing: t({ ru: 'Нет файла', en: 'Missing', kk: 'Қолжетімсіз' }),
      },
      tooltips: {
        both: t({
          ru: 'Файл доступен на диске и в базе данных',
          en: 'File is available on disk and in DB',
          kk: 'Файл дискте және дерекқорда қолжетімді',
        }),
        disk: t({
          ru: 'Файл доступен на диске',
          en: 'File is available on disk',
          kk: 'Файл дискте қолжетімді',
        }),
        db: t({
          ru: 'Файл доступен в базе данных',
          en: 'File is available in DB',
          kk: 'Файл дерекқорда қолжетімді',
        }),
        missing: t({
          ru: 'Файл недоступен (нет на диске и в базе данных)',
          en: 'File is unavailable (missing on disk and in DB)',
          kk: 'Файл қолжетімсіз (дискте де, дерекқорда да жоқ)',
        }),
      },
    },
    preview: t({
      ru: 'Предпросмотр',
      en: 'Preview',
      kk: 'Алдын ала қарау',
    }),
    searchFiles: t({
      ru: 'Поиск по файлам',
      en: 'Search files',
      kk: 'Файлдарды іздеу',
    }),
    scrollHint: t({
      ru: 'Используйте колесико мыши для перемещения',
      en: 'Use mouse wheel to navigate',
      kk: 'Жылжу үшін тінтуірдің дөңгелегін пайдаланыңыз',
    }),
    dragAndDrop: t({
      ru: 'Перетащить',
      en: 'Drag and drop',
      kk: 'Сүйреп апару',
    }),
    done: t({
      ru: 'Готово',
      en: 'Done',
      kk: 'Дайын',
    }),
    tagColor: t({
      ru: 'Цвет тега',
      en: 'Tag color',
      kk: 'Тег түсі',
    }),
    actions: {
      view: t({ ru: 'Просмотр', en: 'View', kk: 'Қарау' }),
      download: t({ ru: 'Скачать', en: 'Download', kk: 'Жүктеу' }),
      delete: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      share: t({ ru: 'Поделиться', en: 'Share', kk: 'Бөлісу' }),
      permissions: t({ ru: 'Доступ', en: 'Access', kk: 'Қолжетімділік' }),
      tooltipView: t({ ru: 'Просмотр', en: 'View', kk: 'Қарау' }),
      tooltipDownload: t({ ru: 'Скачать', en: 'Download', kk: 'Жүктеу' }),
    },
    delete: {
      title: t({
        ru: 'Переместить файл в корзину?',
        en: 'Move file to trash?',
        kk: 'Файлды қоқысқа жіберу керек пе?',
      }),
      messagePrefix: t({
        ru: 'Файл ',
        en: 'File ',
        kk: 'Файл ',
      }),
      messageSuffix: t({
        ru: ' будет перемещён в корзину.',
        en: ' will be moved to trash.',
        kk: ' қоқысқа жіберіледі.',
      }),
      messageFallback: t({
        ru: 'Файл будет перемещён в корзину.',
        en: 'File will be moved to trash.',
        kk: 'Файл қоқысқа жіберіледі.',
      }),
      confirm: t({ ru: 'В корзину', en: 'Move', kk: 'Қоқысқа' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      loading: t({
        ru: 'Перемещаем...',
        en: 'Moving...',
        kk: 'Жіберілуде...',
      }),
      success: t({
        ru: 'Файл в корзине',
        en: 'File moved to trash',
        kk: 'Файл қоқысқа жіберілді',
      }),
      error: t({
        ru: 'Не удалось переместить файл в корзину',
        en: 'Failed to move file to trash',
        kk: 'Файлды қоқысқа жіберу мүмкін болмады',
      }),
    },
    permanentDelete: {
      title: t({
        ru: 'Удалить файл навсегда?',
        en: 'Delete file permanently?',
        kk: 'Файлды мүлде жою керек пе?',
      }),
      messagePrefix: t({
        ru: 'Файл ',
        en: 'File ',
        kk: 'Файл ',
      }),
      messageSuffix: t({
        ru: ' будет удалён без возможности восстановления.',
        en: ' will be deleted permanently.',
        kk: ' қайтарусыз жойылады.',
      }),
      messageFallback: t({
        ru: 'Файл будет удалён без возможности восстановления.',
        en: 'File will be deleted permanently.',
        kk: 'Файл қайтарусыз жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    toasts: {
      loadFilesFailed: t({
        ru: 'Не удалось загрузить файлы',
        en: 'Failed to load files',
        kk: 'Файлдарды жүктеу мүмкін болмады',
      }),
      loadCategoriesFailed: t({
        ru: 'Не удалось загрузить категории',
        en: 'Failed to load categories',
        kk: 'Санаттарды жүктеу мүмкін болмады',
      }),
      loadTagsFailed: t({
        ru: 'Не удалось загрузить теги',
        en: 'Failed to load tags',
        kk: 'Тегтерді жүктеу мүмкін болмады',
      }),
      loadFoldersFailed: t({
        ru: 'Не удалось загрузить папки',
        en: 'Failed to load folders',
        kk: 'Қапшықтарды жүктеу мүмкін болмады',
      }),
      loadViewsFailed: t({
        ru: 'Не удалось загрузить сохранённые виды',
        en: 'Failed to load saved views',
        kk: 'Сақталған көріністерді жүктеу мүмкін болмады',
      }),
      downloaded: t({
        ru: 'Файл скачан',
        en: 'File downloaded',
        kk: 'Файл жүктелді',
      }),
      downloadFailed: t({
        ru: 'Не удалось скачать файл',
        en: 'Failed to download file',
        kk: 'Файлды жүктеу мүмкін болмады',
      }),
      shareOpened: t({
        ru: 'Открыто окно доступа',
        en: 'Sharing opened',
        kk: 'Бөлісу терезесі ашылды',
      }),
      permissionsOpened: t({
        ru: 'Открыто управление правами',
        en: 'Permissions opened',
        kk: 'Құқықтарды басқару ашылды',
      }),
      categoryUpdated: t({
        ru: 'Категория обновлена',
        en: 'Category updated',
        kk: 'Санат жаңартылды',
      }),
      categoryUpdateFailed: t({
        ru: 'Не удалось обновить категорию файла',
        en: 'Failed to update file category',
        kk: 'Файл санатын жаңарту мүмкін болмады',
      }),
      folderUpdated: t({
        ru: 'Файл успешно перемещён в папку',
        en: 'File successfully moved to folder',
        kk: 'Файл қапшыққа сәтті көшірілді',
      }),
      fileMovedTo: t({
        ru: 'Файл перемещён в папку',
        en: 'File moved to folder',
        kk: 'Файл мына қапшыққа көшірілді',
      }),
      folderUpdateFailed: t({
        ru: 'Не удалось переместить файл',
        en: 'Failed to move file',
        kk: 'Файлды жылжыту мүмкін болмады',
      }),
      folderPermissionDenied: t({
        ru: 'Недостаточно прав для перемещения файла',
        en: 'Not enough permissions to move file',
        kk: 'Файлды жылжытуға құқық жеткіліксіз',
      }),
      folderNameRequired: t({
        ru: 'Введите название папки',
        en: 'Enter a folder name',
        kk: 'Қапшық атауын енгізіңіз',
      }),
      folderCreated: t({
        ru: 'Папка создана',
        en: 'Folder created',
        kk: 'Қапшық жасалды',
      }),
      folderCreateFailed: t({
        ru: 'Не удалось создать папку',
        en: 'Failed to create folder',
        kk: 'Қапшықты жасау мүмкін болмады',
      }),
      folderRenamed: t({
        ru: 'Папка переименована',
        en: 'Folder renamed',
        kk: 'Қапшық атауы өзгертілді',
      }),
      folderRenameFailed: t({
        ru: 'Не удалось переименовать папку',
        en: 'Failed to rename folder',
        kk: 'Қапшықтың атын өзгерту мүмкін болмады',
      }),
      folderDeleteLoading: t({
        ru: 'Удаляем папку...',
        en: 'Deleting folder...',
        kk: 'Қапшық жойылуда...',
      }),
      folderDeleted: t({
        ru: 'Папка удалена',
        en: 'Folder deleted',
        kk: 'Қапшық жойылды',
      }),
      folderDeleteFailed: t({
        ru: 'Не удалось удалить папку',
        en: 'Failed to delete folder',
        kk: 'Қапшықты жою мүмкін болмады',
      }),
      folderAssignSelectFolder: t({
        ru: 'Выберите папку',
        en: 'Select a folder',
        kk: 'Қапшықты таңдаңыз',
      }),
      folderAssignSelectFiles: t({
        ru: 'Выберите файлы',
        en: 'Select files',
        kk: 'Файлдарды таңдаңыз',
      }),
      folderAssignSuccess: t({
        ru: 'Файлы добавлены в папку',
        en: 'Files added to folder',
        kk: 'Файлдар қапшыққа қосылды',
      }),
      folderAssignFailed: t({
        ru: 'Не удалось добавить файлы в папку',
        en: 'Failed to add files to folder',
        kk: 'Файлдарды қапшыққа қосу мүмкін болмады',
      }),
      tagNameRequired: t({
        ru: 'Введите название тега',
        en: 'Enter a tag name',
        kk: 'Тег атауын енгізіңіз',
      }),
      tagCreated: t({
        ru: 'Тег создан',
        en: 'Tag created',
        kk: 'Тег жасалды',
      }),
      tagCreateFailed: t({
        ru: 'Не удалось создать тег',
        en: 'Failed to create tag',
        kk: 'Тегті жасау мүмкін болмады',
      }),
      tagRenamed: t({
        ru: 'Тег переименован',
        en: 'Tag renamed',
        kk: 'Тег атауы өзгертілді',
      }),
      tagRenameFailed: t({
        ru: 'Не удалось переименовать тег',
        en: 'Failed to rename tag',
        kk: 'Тегтің атын өзгерту мүмкін болмады',
      }),
      tagDeleteLoading: t({
        ru: 'Удаляем тег...',
        en: 'Deleting tag...',
        kk: 'Тег жойылуда...',
      }),
      tagDeleted: t({
        ru: 'Тег удалён',
        en: 'Tag deleted',
        kk: 'Тег жойылды',
      }),
      tagDeleteFailed: t({
        ru: 'Не удалось удалить тег',
        en: 'Failed to delete tag',
        kk: 'Тегті жою мүмкін болмады',
      }),
      folderTagUpdateFailed: t({
        ru: 'Не удалось обновить тег папки',
        en: 'Failed to update folder tag',
        kk: 'Қапшық тегін жаңарту мүмкін болмады',
      }),
      viewNameRequired: t({
        ru: 'Введите название для вида',
        en: 'Enter a view name',
        kk: 'Көрініс атауын енгізіңіз',
      }),
      viewSaved: t({
        ru: 'Вид сохранён',
        en: 'View saved',
        kk: 'Көрініс сақталды',
      }),
      viewSaveFailed: t({
        ru: 'Не удалось сохранить вид',
        en: 'Failed to save view',
        kk: 'Көріністі сақтау мүмкін болмады',
      }),
      viewDeleted: t({
        ru: 'Вид удалён',
        en: 'View deleted',
        kk: 'Көрініс жойылды',
      }),
      viewDeleteFailed: t({
        ru: 'Не удалось удалить вид',
        en: 'Failed to delete view',
        kk: 'Көріністі жою мүмкін болмады',
      }),
    },
  },
} satisfies Dictionary;

export default content;

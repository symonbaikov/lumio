import { type DeclarationContent, t } from 'intlayer';

const pageContent = {
  key: 'gmail-receipts-page',
  content: {
    title: t({
      en: 'Gmail Receipts',
      ru: 'Чеки из Gmail',
      kk: 'Gmail чектері',
    }),
    subtitle: t({
      en: 'Auto-imported receipts from your Gmail inbox',
      ru: 'Автоматически импортированные чеки из Gmail',
      kk: 'Gmail-ден автоматты түрде импортталған чектер',
    }),
    connectionStatus: {
      connected: t({
        en: 'Connected',
        ru: 'Подключено',
        kk: 'Қосылған',
      }),
      disconnected: t({
        en: 'Disconnected',
        ru: 'Отключено',
        kk: 'Ажыратылған',
      }),
    },
    stats: {
      total: t({
        en: 'Total Receipts',
        ru: 'Всего чеков',
        kk: 'Барлық чектер',
      }),
      pending: t({
        en: 'Pending Review',
        ru: 'На проверке',
        kk: 'Тексеруде',
      }),
      approved: t({
        en: 'Approved This Month',
        ru: 'Одобрено в этом месяце',
        kk: 'Осы айда бекітілді',
      }),
      totalAmount: t({
        en: 'Total Amount',
        ru: 'Общая сумма',
        kk: 'Жалпы сома',
      }),
    },
    filters: {
      status: t({
        en: 'Status',
        ru: 'Статус',
        kk: 'Күй',
      }),
      all: t({
        en: 'All',
        ru: 'Все',
        kk: 'Барлығы',
      }),
      new: t({
        en: 'New',
        ru: 'Новые',
        kk: 'Жаңа',
      }),
      parsed: t({
        en: 'Parsed',
        ru: 'Обработано',
        kk: 'Өңделген',
      }),
      needsReview: t({
        en: 'Needs Review',
        ru: 'Требует проверки',
        kk: 'Тексеру қажет',
      }),
      draft: t({
        en: 'Draft',
        ru: 'Черновик',
        kk: 'Жоба',
      }),
      approved: t({
        en: 'Approved',
        ru: 'Одобрено',
        kk: 'Бекітілді',
      }),
      rejected: t({
        en: 'Rejected',
        ru: 'Отклонено',
        kk: 'Қабылданбады',
      }),
      failed: t({
        en: 'Failed',
        ru: 'Ошибка',
        kk: 'Қате',
      }),
      searchPlaceholder: t({
        en: 'Search by merchant or amount...',
        ru: 'Поиск по продавцу или сумме...',
        kk: 'Сатушы немесе сома бойынша іздеу...',
      }),
    },
    table: {
      date: t({
        en: 'Date',
        ru: 'Дата',
        kk: 'Күн',
      }),
      merchant: t({
        en: 'Merchant',
        ru: 'Продавец',
        kk: 'Сатушы',
      }),
      amount: t({
        en: 'Amount',
        ru: 'Сумма',
        kk: 'Сома',
      }),
      tax: t({
        en: 'Tax',
        ru: 'Налог',
        kk: 'Салық',
      }),
      category: t({
        en: 'Category',
        ru: 'Категория',
        kk: 'Санат',
      }),
      status: t({
        en: 'Status',
        ru: 'Статус',
        kk: 'Күй',
      }),
      actions: t({
        en: 'Actions',
        ru: 'Действия',
        kk: 'Әрекеттер',
      }),
      emptyState: t({
        en: 'No receipts found',
        ru: 'Чеки не найдены',
        kk: 'Чектер табылмады',
      }),
    },
    actions: {
      refresh: t({
        en: 'Refresh',
        ru: 'Обновить',
        kk: 'Жаңарту',
      }),
      bulkApprove: t({
        en: 'Bulk Approve',
        ru: 'Массовое одобрение',
        kk: 'Жаппай бекіту',
      }),
      exportToSheets: t({
        en: 'Export to Sheets',
        ru: 'Экспорт в Sheets',
        kk: 'Sheets-ке экспорттау',
      }),
      approve: t({
        en: 'Approve',
        ru: 'Одобрить',
        kk: 'Бекіту',
      }),
      reject: t({
        en: 'Reject',
        ru: 'Отклонить',
        kk: 'Қабылдамау',
      }),
      edit: t({
        en: 'Edit',
        ru: 'Редактировать',
        kk: 'Өңдеу',
      }),
      delete: t({
        en: 'Delete',
        ru: 'Удалить',
        kk: 'Жою',
      }),
      viewDetails: t({
        en: 'View Details',
        ru: 'Подробности',
        kk: 'Толығырақ',
      }),
    },
    drawer: {
      tabs: {
        overview: t({
          en: 'Overview',
          ru: 'Обзор',
          kk: 'Шолу',
        }),
        parsedData: t({
          en: 'Parsed Data',
          ru: 'Извлеченные данные',
          kk: 'Өңделген деректер',
        }),
        duplicates: t({
          en: 'Duplicates',
          ru: 'Дубликаты',
          kk: 'Көшірмелер',
        }),
      },
      fields: {
        merchant: t({
          en: 'Merchant',
          ru: 'Продавец',
          kk: 'Сатушы',
        }),
        amount: t({
          en: 'Amount',
          ru: 'Сумма',
          kk: 'Сома',
        }),
        currency: t({
          en: 'Currency',
          ru: 'Валюта',
          kk: 'Валюта',
        }),
        tax: t({
          en: 'Tax',
          ru: 'Налог',
          kk: 'Салық',
        }),
        date: t({
          en: 'Date',
          ru: 'Дата',
          kk: 'Күн',
        }),
        category: t({
          en: 'Category',
          ru: 'Категория',
          kk: 'Санат',
        }),
        confidence: t({
          en: 'Confidence',
          ru: 'Точность',
          kk: 'Дәлдік',
        }),
        saveChanges: t({
          en: 'Save Changes',
          ru: 'Сохранить изменения',
          kk: 'Өзгерістерді сақтау',
        }),
      },
      duplicates: {
        noDuplicates: t({
          en: 'No potential duplicates found',
          ru: 'Потенциальные дубликаты не найдены',
          kk: 'Ықтимал көшірмелер табылмады',
        }),
        markAsDuplicate: t({
          en: 'Mark as Duplicate',
          ru: 'Отметить как дубликат',
          kk: 'Көшірме ретінде белгілеу',
        }),
        notDuplicate: t({
          en: 'Not a Duplicate',
          ru: 'Не дубликат',
          kk: 'Көшірме емес',
        }),
        similarity: t({
          en: 'Similarity',
          ru: 'Совпадение',
          kk: 'Ұқсастық',
        }),
      },
      emailPreview: t({
        en: 'Email Preview',
        ru: 'Предпросмотр письма',
        kk: 'Хат алдын-ала қарау',
      }),
      openInGmail: t({
        en: 'Open in Gmail',
        ru: 'Открыть в Gmail',
        kk: 'Gmail-де ашу',
      }),
    },
    toast: {
      receiptUpdated: t({
        en: 'Receipt updated successfully',
        ru: 'Чек успешно обновлен',
        kk: 'Чек сәтті жаңартылды',
      }),
      receiptApproved: t({
        en: 'Receipt approved and transaction created',
        ru: 'Чек одобрен и транзакция создана',
        kk: 'Чек бекітілді және транзакция жасалды',
      }),
      bulkApproveSuccess: t({
        en: 'Receipts approved successfully',
        ru: 'Чеки успешно одобрены',
        kk: 'Чектер сәтті бекітілді',
      }),
      exportSuccess: t({
        en: 'Successfully exported to Google Sheets',
        ru: 'Успешно экспортировано в Google Sheets',
        kk: 'Google Sheets-ке сәтті экспортталды',
      }),
      error: t({
        en: 'An error occurred',
        ru: 'Произошла ошибка',
        kk: 'Қате орын алды',
      }),
      markedAsDuplicate: t({
        en: 'Marked as duplicate',
        ru: 'Отмечено как дубликат',
        kk: 'Көшірме ретінде белгіленді',
      }),
      unmarkedDuplicate: t({
        en: 'Unmarked as duplicate',
        ru: 'Снята отметка дубликата',
        kk: 'Көшірме белгісі алынды',
      }),
    },
    bulk: {
      selected: t({
        en: 'selected',
        ru: 'выбрано',
        kk: 'таңдалды',
      }),
      clearSelection: t({
        en: 'Clear Selection',
        ru: 'Снять выделение',
        kk: 'Таңдауды алып тастау',
      }),
      selectCategory: t({
        en: 'Select Category',
        ru: 'Выберите категорию',
        kk: 'Санатты таңдаңыз',
      }),
    },
  },
} satisfies DeclarationContent;

export default pageContent;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'transactionsPageView',
  content: {
    notImplemented: t({
      ru: 'Еще не реализовано',
      en: 'Not implemented yet',
      kk: 'Әлі іске асырылмаған',
    }),
    categoryUpdated: t({
      ru: 'Категория обновлена успешно',
      en: 'Category updated successfully',
      kk: 'Санат сәтті жаңартылды',
    }),
    categoryUpdateFailed: t({
      ru: 'Не удалось обновить категорию',
      en: 'Failed to update category',
      kk: 'Санатты жаңарту сәтсіз аяқталды',
    }),
    categoriesUpdated: t({
      ru: 'Категория назначена транзакциям',
      en: 'Category assigned to transactions',
      kk: 'Санат транзакцияларға тағайындалды',
    }),
    bulkUpdateFailed: t({
      ru: 'Не удалось обновить категории',
      en: 'Failed to update categories',
      kk: 'Санаттарды жаңарту сәтсіз аяқталды',
    }),
    exportComingSoon: t({
      ru: 'Экспорт скоро будет доступен',
      en: 'Export feature coming soon',
      kk: 'Экспорт мүмкіндігі жақын арада',
    }),
    shareComingSoon: t({
      ru: 'Функция поделиться скоро будет доступна',
      en: 'Share feature coming soon',
      kk: 'Бөлісу мүмкіндігі жақын арада',
    }),
    fixIssuesHint: t({
      ru: 'Используйте фильтры для поиска и исправления проблем',
      en: 'Use filters to find and fix issues',
      kk: 'Мәселелерді табу және шешу үшін сүзгілерді пайдаланыңыз',
    }),
    selected: t({
      ru: 'выбрано',
      en: 'selected',
      kk: 'таңдалды',
    }),
    selectCategory: t({
      ru: 'Выберите категорию...',
      en: 'Select category...',
      kk: 'Санат таңдаңыз...',
    }),
    apply: t({
      ru: 'Применить',
      en: 'Apply',
      kk: 'Қолдану',
    }),
    clearSelection: t({
      ru: 'Очистить',
      en: 'Clear',
      kk: 'Тазалау',
    }),
    allCategorized: t({
      ru: 'Все транзакции уже категоризированы',
      en: 'All transactions are already categorized',
      kk: 'Барлық транзакциялар санатталған',
    }),
    categorizingProgress: t({
      ru: 'Категоризация {{count}} транзакций...',
      en: 'Categorizing {{count}} transactions...',
      kk: '{{count}} транзакция санатталуда...',
    }),
    categorizeSuccess: t({
      ru: 'Успешно категоризировано {{count}} транзакций',
      en: 'Successfully categorized {{count}} transactions',
      kk: '{{count}} транзакция сәтті санатталды',
    }),
    categorizePartial: t({
      ru: 'Категоризировано {{successful}} из {{total}}. Ошибок: {{failed}}',
      en: 'Categorized {{successful}} of {{total}}. Errors: {{failed}}',
      kk: '{{total}} ішінен {{successful}} санатталды. Қателер: {{failed}}',
    }),
    categorizeFailed: t({
      ru: 'Не удалось категоризировать (ошибок: {{count}})',
      en: 'Failed to categorize (errors: {{count}})',
      kk: 'Санаттау мүмкін болмады (қателер: {{count}})',
    }),
    autoFixFailed: t({
      ru: 'Не удалось автоматически исправить проблемы',
      en: 'Failed to automatically fix issues',
      kk: 'Мәселелерді автоматты түрде түзету мүмкін болмады',
    }),
    exportToTable: t({
      ru: 'Экспорт в таблицу: функционал в разработке',
      en: 'Export to table: feature in development',
      kk: 'Кестеге экспорт: функционал әзірленуде',
    }),
    exportFormat: t({
      ru: 'Экспорт в {{type}}: функционал в разработке',
      en: 'Export to {{type}}: feature in development',
      kk: '{{type}} экспорты: функционал әзірленуде',
    }),
  },
} satisfies Dictionary;

export default content;

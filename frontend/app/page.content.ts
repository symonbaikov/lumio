import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'homePage',
  content: {
    badge: t({
      ru: 'Обновления продукта',
      en: 'Product updates',
      kk: 'Өнім жаңартулары',
    }),
    title: t({
      ru: 'Что нового',
      en: "What's new",
      kk: 'Не жаңалық',
    }),
    description: t({
      ru: 'Краткая лента изменений. Нажмите на запись, чтобы открыть подробный changelog.',
      en: 'A compact stream of updates. Open any entry to view the full changelog.',
      kk: 'Өзгерістердің қысқаша таспасы. Толық changelog көру үшін жазбаны ашыңыз.',
    }),
    loading: t({
      ru: 'Загружаем changelog...',
      en: 'Loading changelog...',
      kk: 'Changelog жүктелуде...',
    }),
    empty: t({
      ru: 'Пока нет опубликованных обновлений.',
      en: 'No published updates yet.',
      kk: 'Жарияланған жаңартулар әлі жоқ.',
    }),
    openDetails: t({
      ru: 'Открыть детали',
      en: 'Open details',
      kk: 'Толығырақ ашу',
    }),
    releaseLabel: t({
      ru: 'Релиз',
      en: 'Release',
      kk: 'Релиз',
    }),
    closeLabel: t({
      ru: 'Закрыть changelog',
      en: 'Close changelog',
      kk: 'Changelog жабу',
    }),
  },
} satisfies Dictionary;

export default content;

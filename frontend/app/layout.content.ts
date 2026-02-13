import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'layout',
  content: {
    title: t({
      ru: 'Lumio — Обработка банковских выписок',
      en: 'Lumio — Bank statement processing',
      kk: 'Lumio — Банктік үзінділерді өңдеу',
    }),
    description: t({
      ru: 'Система автоматической обработки банковских выписок',
      en: 'Automatic bank statement processing system',
      kk: 'Банктік үзінділерді автоматты өңдеу жүйесі',
    }),
  },
} satisfies Dictionary;

export default content;

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'auditEventDrawer',
  content: {
    rollbackChange: t({
      ru: 'Откатить изменение',
      en: 'Roll back change',
      kk: 'Өзгерісті қайтару',
      de: 'Änderung zurücksetzen',
      fr: 'Annuler la modification',
      es: 'Revertir el cambio',
      pt: 'Reverter alteração',
      tr: 'Değişikliği geri al',
      uk: 'Відкотити зміну',
      zh: '回滚更改',
      ar: 'التراجع عن التغيير',
      pl: 'Cofnij zmianę',
      it: 'Ripristina la modifica',
      sk: 'Vrátiť zmenu',
      ja: '変更をロールバック',
      ko: '변경 되돌리기',
      hi: 'बदलाव वापस लें',
      nl: 'Wijziging terugdraaien',
      sv: 'Återställ ändringen',
      vi: 'Hoàn tác thay đổi',
      id: 'Kembalikan perubahan',
    }),
  },
} satisfies Dictionary;

export default content;

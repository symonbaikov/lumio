import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'dashboardHeader',
  content: {
    uploadStatement: t({
      ru: 'Загрузить выписку',
      en: 'Upload statement',
      kk: 'Үзінді көшірмені жүктеу',
      de: 'Kontoauszug hochladen',
      fr: 'Importer un relevé',
      es: 'Subir extracto',
      pt: 'Enviar extrato',
      tr: 'Ekstre yükle',
      uk: 'Завантажити виписку',
      zh: '上传对账单',
      ar: 'رفع كشف الحساب',
      pl: 'Prześlij wyciąg',
      it: 'Carica estratto conto',
      sk: 'Nahrať výpis',
      ja: '明細書をアップロード',
      ko: '명세서 업로드',
      hi: 'स्टेटमेंट अपलोड करें',
      nl: 'Afschrift uploaden',
      sv: 'Ladda upp kontoutdrag',
      vi: 'Tải lên sao kê',
      id: 'Unggah rekening koran',
    }),
  },
} satisfies Dictionary;

export default content;

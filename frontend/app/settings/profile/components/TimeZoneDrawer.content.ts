import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'timeZoneDrawer',
  content: {
    noResults: t({
      ru: 'Часовые пояса не найдены',
      en: 'No time zones found',
      kk: 'Уақыт белдеулері табылмады',
      de: 'Keine Zeitzonen gefunden',
      fr: 'Aucun fuseau horaire trouvé',
      es: 'No se encontraron zonas horarias',
      pt: 'Nenhum fuso horário encontrado',
      tr: 'Saat dilimi bulunamadı',
      uk: 'Часові пояси не знайдено',
      zh: '未找到时区',
      ar: 'لم يتم العثور على مناطق زمنية',
      pl: 'Nie znaleziono stref czasowych',
      it: 'Nessun fuso orario trovato',
      sk: 'Nenašli sa žiadne časové pásma',
      ja: 'タイムゾーンが見つかりません',
      ko: '시간대를 찾을 수 없습니다',
      hi: 'कोई समय क्षेत्र नहीं मिला',
      nl: 'Geen tijdzones gevonden',
      sv: 'Inga tidszoner hittades',
      vi: 'Không tìm thấy múi giờ',
      id: 'Zona waktu tidak ditemukan',
    }),
  },
} satisfies Dictionary;

export default content;

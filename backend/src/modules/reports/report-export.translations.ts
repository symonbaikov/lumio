/**
 * Column headers and sheet names for report exports.
 *
 * Labels are data, not identifiers: the sheet is built with aoa_to_sheet so the
 * header row is an ordinary row, rather than being derived from object keys.
 */
type ReportLabelMap = Record<ReportLabelKey, string>;

export type ReportLabelKey =
  | 'group'
  | 'date'
  | 'counterparty'
  | 'amount'
  | 'category'
  | 'branch'
  | 'wallet'
  | 'type'
  | 'count'
  | 'income'
  | 'expense'
  | 'difference'
  | 'sheetReport'
  | 'sheetTrends';

const ru: ReportLabelMap = {
  group: 'Группа',
  date: 'Дата',
  counterparty: 'Контрагент',
  amount: 'Сумма',
  category: 'Категория',
  branch: 'Филиал',
  wallet: 'Кошелёк',
  type: 'Тип',
  count: 'Количество',
  income: 'Приходы',
  expense: 'Расходы',
  difference: 'Разница',
  sheetReport: 'Отчёт',
  sheetTrends: 'Динамика',
};

const en: ReportLabelMap = {
  group: 'Group',
  date: 'Date',
  counterparty: 'Counterparty',
  amount: 'Amount',
  category: 'Category',
  branch: 'Branch',
  wallet: 'Wallet',
  type: 'Type',
  count: 'Count',
  income: 'Income',
  expense: 'Expenses',
  difference: 'Difference',
  sheetReport: 'Report',
  sheetTrends: 'Trends',
};

const kk: ReportLabelMap = {
  group: 'Топ',
  date: 'Күні',
  counterparty: 'Контрагент',
  amount: 'Сома',
  category: 'Санат',
  branch: 'Филиал',
  wallet: 'Әмиян',
  type: 'Түрі',
  count: 'Саны',
  income: 'Кірістер',
  expense: 'Шығыстар',
  difference: 'Айырма',
  sheetReport: 'Есеп',
  sheetTrends: 'Динамика',
};

const de: ReportLabelMap = {
  group: 'Gruppe',
  date: 'Datum',
  counterparty: 'Geschäftspartner',
  amount: 'Betrag',
  category: 'Kategorie',
  branch: 'Filiale',
  wallet: 'Wallet',
  type: 'Typ',
  count: 'Anzahl',
  income: 'Einnahmen',
  expense: 'Ausgaben',
  difference: 'Differenz',
  sheetReport: 'Bericht',
  sheetTrends: 'Verlauf',
};

const fr: ReportLabelMap = {
  group: 'Groupe',
  date: 'Date',
  counterparty: 'Contrepartie',
  amount: 'Montant',
  category: 'Catégorie',
  branch: 'Succursale',
  wallet: 'Portefeuille',
  type: 'Type',
  count: 'Nombre',
  income: 'Recettes',
  expense: 'Dépenses',
  difference: 'Écart',
  sheetReport: 'Rapport',
  sheetTrends: 'Tendances',
};

const es: ReportLabelMap = {
  group: 'Grupo',
  date: 'Fecha',
  counterparty: 'Contraparte',
  amount: 'Importe',
  category: 'Categoría',
  branch: 'Sucursal',
  wallet: 'Billetera',
  type: 'Tipo',
  count: 'Cantidad',
  income: 'Ingresos',
  expense: 'Gastos',
  difference: 'Diferencia',
  sheetReport: 'Informe',
  sheetTrends: 'Tendencias',
};

const pt: ReportLabelMap = {
  group: 'Grupo',
  date: 'Data',
  counterparty: 'Contraparte',
  amount: 'Valor',
  category: 'Categoria',
  branch: 'Filial',
  wallet: 'Carteira',
  type: 'Tipo',
  count: 'Quantidade',
  income: 'Receitas',
  expense: 'Despesas',
  difference: 'Diferença',
  sheetReport: 'Relatório',
  sheetTrends: 'Tendências',
};

const tr: ReportLabelMap = {
  group: 'Grup',
  date: 'Tarih',
  counterparty: 'Karşı taraf',
  amount: 'Tutar',
  category: 'Kategori',
  branch: 'Şube',
  wallet: 'Cüzdan',
  type: 'Tür',
  count: 'Adet',
  income: 'Gelirler',
  expense: 'Giderler',
  difference: 'Fark',
  sheetReport: 'Rapor',
  sheetTrends: 'Eğilimler',
};

const uk: ReportLabelMap = {
  group: 'Група',
  date: 'Дата',
  counterparty: 'Контрагент',
  amount: 'Сума',
  category: 'Категорія',
  branch: 'Філія',
  wallet: 'Гаманець',
  type: 'Тип',
  count: 'Кількість',
  income: 'Надходження',
  expense: 'Витрати',
  difference: 'Різниця',
  sheetReport: 'Звіт',
  sheetTrends: 'Динаміка',
};

const zh: ReportLabelMap = {
  group: '分组',
  date: '日期',
  counterparty: '交易对方',
  amount: '金额',
  category: '类别',
  branch: '分支机构',
  wallet: '钱包',
  type: '类型',
  count: '数量',
  income: '收入',
  expense: '支出',
  difference: '差额',
  sheetReport: '报告',
  sheetTrends: '趋势',
};

const ar: ReportLabelMap = {
  group: 'المجموعة',
  date: 'التاريخ',
  counterparty: 'الطرف المقابل',
  amount: 'المبلغ',
  category: 'الفئة',
  branch: 'الفرع',
  wallet: 'المحفظة',
  type: 'النوع',
  count: 'العدد',
  income: 'الإيرادات',
  expense: 'المصروفات',
  difference: 'الفرق',
  sheetReport: 'التقرير',
  sheetTrends: 'الاتجاهات',
};

const pl: ReportLabelMap = {
  group: 'Grupa',
  date: 'Data',
  counterparty: 'Kontrahent',
  amount: 'Kwota',
  category: 'Kategoria',
  branch: 'Oddział',
  wallet: 'Portfel',
  type: 'Typ',
  count: 'Liczba',
  income: 'Wpływy',
  expense: 'Wydatki',
  difference: 'Różnica',
  sheetReport: 'Raport',
  sheetTrends: 'Trendy',
};

const it: ReportLabelMap = {
  group: 'Gruppo',
  date: 'Data',
  counterparty: 'Controparte',
  amount: 'Importo',
  category: 'Categoria',
  branch: 'Filiale',
  wallet: 'Portafoglio',
  type: 'Tipo',
  count: 'Quantità',
  income: 'Entrate',
  expense: 'Uscite',
  difference: 'Differenza',
  sheetReport: 'Report',
  sheetTrends: 'Andamento',
};

const sk: ReportLabelMap = {
  group: 'Skupina',
  date: 'Dátum',
  counterparty: 'Protistrana',
  amount: 'Suma',
  category: 'Kategória',
  branch: 'Pobočka',
  wallet: 'Peňaženka',
  type: 'Typ',
  count: 'Počet',
  income: 'Príjmy',
  expense: 'Výdavky',
  difference: 'Rozdiel',
  sheetReport: 'Správa',
  sheetTrends: 'Vývoj',
};

const ja: ReportLabelMap = {
  group: 'グループ',
  date: '日付',
  counterparty: '取引先',
  amount: '金額',
  category: 'カテゴリ',
  branch: '支店',
  wallet: 'ウォレット',
  type: '種別',
  count: '件数',
  income: '収入',
  expense: '支出',
  difference: '差額',
  sheetReport: 'レポート',
  sheetTrends: '推移',
};

const ko: ReportLabelMap = {
  group: '그룹',
  date: '날짜',
  counterparty: '거래처',
  amount: '금액',
  category: '카테고리',
  branch: '지점',
  wallet: '지갑',
  type: '유형',
  count: '건수',
  income: '수입',
  expense: '지출',
  difference: '차액',
  sheetReport: '보고서',
  sheetTrends: '추이',
};

const hi: ReportLabelMap = {
  group: 'समूह',
  date: 'दिनांक',
  counterparty: 'प्रतिपक्ष',
  amount: 'राशि',
  category: 'श्रेणी',
  branch: 'शाखा',
  wallet: 'वॉलेट',
  type: 'प्रकार',
  count: 'संख्या',
  income: 'आय',
  expense: 'व्यय',
  difference: 'अंतर',
  sheetReport: 'रिपोर्ट',
  sheetTrends: 'रुझान',
};

const nl: ReportLabelMap = {
  group: 'Groep',
  date: 'Datum',
  counterparty: 'Tegenpartij',
  amount: 'Bedrag',
  category: 'Categorie',
  branch: 'Filiaal',
  wallet: 'Portemonnee',
  type: 'Type',
  count: 'Aantal',
  income: 'Inkomsten',
  expense: 'Uitgaven',
  difference: 'Verschil',
  sheetReport: 'Rapport',
  sheetTrends: 'Trends',
};

const sv: ReportLabelMap = {
  group: 'Grupp',
  date: 'Datum',
  counterparty: 'Motpart',
  amount: 'Belopp',
  category: 'Kategori',
  branch: 'Filial',
  wallet: 'Plånbok',
  type: 'Typ',
  count: 'Antal',
  income: 'Inkomster',
  expense: 'Utgifter',
  difference: 'Differens',
  sheetReport: 'Rapport',
  sheetTrends: 'Trender',
};

const vi: ReportLabelMap = {
  group: 'Nhóm',
  date: 'Ngày',
  counterparty: 'Đối tác',
  amount: 'Số tiền',
  category: 'Danh mục',
  branch: 'Chi nhánh',
  wallet: 'Ví',
  type: 'Loại',
  count: 'Số lượng',
  income: 'Thu',
  expense: 'Chi',
  difference: 'Chênh lệch',
  sheetReport: 'Báo cáo',
  sheetTrends: 'Xu hướng',
};

const id: ReportLabelMap = {
  group: 'Grup',
  date: 'Tanggal',
  counterparty: 'Pihak lawan',
  amount: 'Jumlah',
  category: 'Kategori',
  branch: 'Cabang',
  wallet: 'Dompet',
  type: 'Tipe',
  count: 'Jumlah data',
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  difference: 'Selisih',
  sheetReport: 'Laporan',
  sheetTrends: 'Tren',
};

const REPORT_LABELS: Record<string, ReportLabelMap> = {
  ru,
  en,
  kk,
  de,
  fr,
  es,
  pt,
  tr,
  uk,
  zh,
  ar,
  pl,
  it,
  sk,
  ja,
  ko,
  hi,
  nl,
  sv,
  vi,
  id,
};

export function renderReportLabels(locale: string | undefined): ReportLabelMap {
  return REPORT_LABELS[locale ?? ''] ?? REPORT_LABELS.en;
}

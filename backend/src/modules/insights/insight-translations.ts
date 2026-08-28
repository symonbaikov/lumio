/**
 * Insight texts are stored as a key plus params, not as a finished sentence,
 * so the wording lives here instead of inside the analyzers. Mirrors
 * notification-translations.ts — same shape, same interpolation, separate
 * namespace because insights and notifications have different lifecycles.
 */
export type InsightMessageKey =
  | 'operational.unapproved'
  | 'operational.uncategorized'
  | 'operational.duplicates'
  | 'trend.category_rising'
  | 'pattern.unbudgeted_top_category'
  | 'trend.savings_rate_up'
  | 'trend.savings_rate_down'
  | 'pattern.risky_allocation';

interface TranslationEntry {
  title: string;
  message: string;
}

type TranslationMap = Record<InsightMessageKey, TranslationEntry>;

const ru: TranslationMap = {
  'operational.unapproved': {
    title: 'Есть неподтвержденные операции',
    message: 'Есть {{count}} неподтвержденных операций',
  },
  'operational.uncategorized': {
    title: 'Есть транзакции без категории',
    message: 'Есть {{count}} транзакций без категории',
  },
  'operational.duplicates': {
    title: 'Найдены возможные дубликаты',
    message: 'Обнаружено {{count}} потенциальных дубликатов',
  },
  'trend.category_rising': {
    title: 'Категория растет',
    message: 'Расходы в категории "{{category}}" на {{percent}}% выше среднего за 3 месяца',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Крупная категория без бюджета',
    message: '"{{category}}" — самая крупная статья расходов в этом месяце, но бюджета по ней нет',
  },
  'trend.savings_rate_up': {
    title: 'Норма сбережений выросла',
    message: 'Норма сбережений {{rate}}% — на {{diff}} п.п. выше прошлого месяца',
  },
  'trend.savings_rate_down': {
    title: 'Норма сбережений упала',
    message: 'Норма сбережений {{rate}}% — на {{diff}} п.п. ниже прошлого месяца',
  },
  'pattern.risky_allocation': {
    title: 'Слишком много капитала в риске',
    message: '{{percent}}% активов в среднем и высоком риске — больше порога в {{threshold}}%',
  },
};

const en: TranslationMap = {
  'operational.unapproved': {
    title: 'Unapproved transactions',
    message: '{{count}} transactions are waiting for approval',
  },
  'operational.uncategorized': {
    title: 'Uncategorized transactions',
    message: '{{count}} transactions have no category',
  },
  'operational.duplicates': {
    title: 'Possible duplicates found',
    message: '{{count}} potential duplicates detected',
  },
  'trend.category_rising': {
    title: 'Category is rising',
    message: 'Spending on "{{category}}" is {{percent}}% above its 3-month average',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Top category has no budget',
    message: '"{{category}}" is your largest expense this month and has no budget',
  },
  'trend.savings_rate_up': {
    title: 'Savings rate is up',
    message: 'Savings rate {{rate}}% — {{diff}} pts higher than last month',
  },
  'trend.savings_rate_down': {
    title: 'Savings rate is down',
    message: 'Savings rate {{rate}}% — {{diff}} pts lower than last month',
  },
  'pattern.risky_allocation': {
    title: 'Too much capital at risk',
    message: '{{percent}}% of assets sit in medium or high risk — above the {{threshold}}% limit',
  },
};

const kk: TranslationMap = {
  'operational.unapproved': {
    title: 'Расталмаған операциялар бар',
    message: '{{count}} операция расталуды күтуде',
  },
  'operational.uncategorized': {
    title: 'Санатсыз транзакциялар бар',
    message: '{{count}} транзакцияның санаты жоқ',
  },
  'operational.duplicates': {
    title: 'Ықтимал телнұсқалар табылды',
    message: '{{count}} ықтимал телнұсқа анықталды',
  },
  'trend.category_rising': {
    title: 'Санат бойынша шығын өсуде',
    message: '"{{category}}" санатындағы шығыс 3 айлық орташадан {{percent}}% жоғары',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Ірі санатта бюджет жоқ',
    message: '"{{category}}" — осы айдағы ең ірі шығыс бабы, бірақ бюджеті жоқ',
  },
  'trend.savings_rate_up': {
    title: 'Жинақ үлесі өсті',
    message: 'Жинақ үлесі {{rate}}% — өткен айдан {{diff}} т.т. жоғары',
  },
  'trend.savings_rate_down': {
    title: 'Жинақ үлесі төмендеді',
    message: 'Жинақ үлесі {{rate}}% — өткен айдан {{diff}} т.т. төмен',
  },
  'pattern.risky_allocation': {
    title: 'Тәуекелдегі капитал тым көп',
    message:
      'Активтердің {{percent}}%-ы орташа және жоғары тәуекелде — {{threshold}}% шегінен жоғары',
  },
};

const de: TranslationMap = {
  'operational.unapproved': {
    title: 'Nicht bestätigte Transaktionen',
    message: '{{count}} Transaktionen warten auf Bestätigung',
  },
  'operational.uncategorized': {
    title: 'Transaktionen ohne Kategorie',
    message: '{{count}} Transaktionen haben keine Kategorie',
  },
  'operational.duplicates': {
    title: 'Mögliche Duplikate gefunden',
    message: '{{count}} mögliche Duplikate erkannt',
  },
  'trend.category_rising': {
    title: 'Kategorie steigt',
    message: 'Ausgaben für "{{category}}" liegen {{percent}}% über dem 3-Monats-Durchschnitt',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Top-Kategorie ohne Budget',
    message: '"{{category}}" ist dieser Monat der größte Ausgabenposten und hat kein Budget',
  },
  'trend.savings_rate_up': {
    title: 'Sparquote gestiegen',
    message: 'Sparquote {{rate}}% — {{diff}} Pp. höher als im Vormonat',
  },
  'trend.savings_rate_down': {
    title: 'Sparquote gesunken',
    message: 'Sparquote {{rate}}% — {{diff}} Pp. niedriger als im Vormonat',
  },
  'pattern.risky_allocation': {
    title: 'Zu viel Kapital im Risiko',
    message:
      '{{percent}}% der Vermögenswerte liegen im mittleren oder hohen Risiko — über der Grenze von {{threshold}}%',
  },
};

const fr: TranslationMap = {
  'operational.unapproved': {
    title: 'Transactions non validées',
    message: '{{count}} transactions attendent une validation',
  },
  'operational.uncategorized': {
    title: 'Transactions sans catégorie',
    message: '{{count}} transactions sans catégorie',
  },
  'operational.duplicates': {
    title: 'Doublons possibles détectés',
    message: '{{count}} doublons potentiels détectés',
  },
  'trend.category_rising': {
    title: 'Catégorie en hausse',
    message: 'Les dépenses "{{category}}" dépassent de {{percent}}% leur moyenne sur 3 mois',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Première catégorie sans budget',
    message: '"{{category}}" est votre plus gros poste ce mois-ci et n\'a pas de budget',
  },
  'trend.savings_rate_up': {
    title: "Taux d'épargne en hausse",
    message: "Taux d'épargne {{rate}}% — {{diff}} pts de plus que le mois dernier",
  },
  'trend.savings_rate_down': {
    title: "Taux d'épargne en baisse",
    message: "Taux d'épargne {{rate}}% — {{diff}} pts de moins que le mois dernier",
  },
  'pattern.risky_allocation': {
    title: 'Trop de capital exposé',
    message:
      '{{percent}}% des actifs sont à risque moyen ou élevé — au-delà de la limite de {{threshold}}%',
  },
};

const es: TranslationMap = {
  'operational.unapproved': {
    title: 'Transacciones sin aprobar',
    message: '{{count}} transacciones esperan aprobación',
  },
  'operational.uncategorized': {
    title: 'Transacciones sin categoría',
    message: '{{count}} transacciones no tienen categoría',
  },
  'operational.duplicates': {
    title: 'Posibles duplicados encontrados',
    message: '{{count}} posibles duplicados detectados',
  },
  'trend.category_rising': {
    title: 'Categoría en aumento',
    message: 'El gasto en "{{category}}" supera en {{percent}}% su media de 3 meses',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Categoría principal sin presupuesto',
    message: '"{{category}}" es tu mayor gasto este mes y no tiene presupuesto',
  },
  'trend.savings_rate_up': {
    title: 'Tasa de ahorro al alza',
    message: 'Tasa de ahorro {{rate}}% — {{diff}} pts más que el mes pasado',
  },
  'trend.savings_rate_down': {
    title: 'Tasa de ahorro a la baja',
    message: 'Tasa de ahorro {{rate}}% — {{diff}} pts menos que el mes pasado',
  },
  'pattern.risky_allocation': {
    title: 'Demasiado capital en riesgo',
    message:
      'El {{percent}}% de los activos está en riesgo medio o alto — por encima del límite del {{threshold}}%',
  },
};

const pt: TranslationMap = {
  'operational.unapproved': {
    title: 'Transações não aprovadas',
    message: '{{count}} transações aguardam aprovação',
  },
  'operational.uncategorized': {
    title: 'Transações sem categoria',
    message: '{{count}} transações não têm categoria',
  },
  'operational.duplicates': {
    title: 'Possíveis duplicatas encontradas',
    message: '{{count}} possíveis duplicatas detectadas',
  },
  'trend.category_rising': {
    title: 'Categoria em alta',
    message: 'Os gastos em "{{category}}" estão {{percent}}% acima da média de 3 meses',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Maior categoria sem orçamento',
    message: '"{{category}}" é sua maior despesa neste mês e não tem orçamento',
  },
  'trend.savings_rate_up': {
    title: 'Taxa de poupança subiu',
    message: 'Taxa de poupança {{rate}}% — {{diff}} pts acima do mês passado',
  },
  'trend.savings_rate_down': {
    title: 'Taxa de poupança caiu',
    message: 'Taxa de poupança {{rate}}% — {{diff}} pts abaixo do mês passado',
  },
  'pattern.risky_allocation': {
    title: 'Capital em risco a mais',
    message:
      '{{percent}}% dos ativos estão em risco médio ou alto — acima do limite de {{threshold}}%',
  },
};

const tr: TranslationMap = {
  'operational.unapproved': {
    title: 'Onaylanmamış işlemler',
    message: '{{count}} işlem onay bekliyor',
  },
  'operational.uncategorized': {
    title: 'Kategorisiz işlemler',
    message: '{{count}} işlemin kategorisi yok',
  },
  'operational.duplicates': {
    title: 'Olası kopyalar bulundu',
    message: '{{count}} olası kopya tespit edildi',
  },
  'trend.category_rising': {
    title: 'Kategori yükseliyor',
    message: '"{{category}}" harcaması 3 aylık ortalamanın %{{percent}} üzerinde',
  },
  'pattern.unbudgeted_top_category': {
    title: 'En büyük kategoride bütçe yok',
    message: '"{{category}}" bu ayki en büyük gider kalemin ve bütçesi yok',
  },
  'trend.savings_rate_up': {
    title: 'Tasarruf oranı arttı',
    message: 'Tasarruf oranı %{{rate}} — geçen aya göre {{diff}} puan yüksek',
  },
  'trend.savings_rate_down': {
    title: 'Tasarruf oranı düştü',
    message: 'Tasarruf oranı %{{rate}} — geçen aya göre {{diff}} puan düşük',
  },
  'pattern.risky_allocation': {
    title: 'Risk altındaki sermaye fazla',
    message:
      "Varlıkların %{{percent}}'i orta veya yüksek riskte — %{{threshold}} sınırının üzerinde",
  },
};

const uk: TranslationMap = {
  'operational.unapproved': {
    title: 'Є непідтверджені операції',
    message: '{{count}} операцій очікують підтвердження',
  },
  'operational.uncategorized': {
    title: 'Є транзакції без категорії',
    message: '{{count}} транзакцій без категорії',
  },
  'operational.duplicates': {
    title: 'Знайдено можливі дублікати',
    message: 'Виявлено {{count}} потенційних дублікатів',
  },
  'trend.category_rising': {
    title: 'Категорія зростає',
    message: 'Витрати на "{{category}}" на {{percent}}% вищі за середні за 3 місяці',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Велика категорія без бюджету',
    message: '"{{category}}" — найбільша стаття витрат цього місяця, але бюджету немає',
  },
  'trend.savings_rate_up': {
    title: 'Норма заощаджень зросла',
    message: 'Норма заощаджень {{rate}}% — на {{diff}} в.п. вище за минулий місяць',
  },
  'trend.savings_rate_down': {
    title: 'Норма заощаджень впала',
    message: 'Норма заощаджень {{rate}}% — на {{diff}} в.п. нижче за минулий місяць',
  },
  'pattern.risky_allocation': {
    title: 'Забагато капіталу в ризику',
    message: '{{percent}}% активів у середньому та високому ризику — понад поріг {{threshold}}%',
  },
};

const zh: TranslationMap = {
  'operational.unapproved': { title: '有未确认的交易', message: '{{count}} 笔交易等待确认' },
  'operational.uncategorized': { title: '有未分类的交易', message: '{{count}} 笔交易没有分类' },
  'operational.duplicates': {
    title: '发现可能的重复项',
    message: '检测到 {{count}} 笔潜在重复交易',
  },
  'trend.category_rising': {
    title: '该类别支出上升',
    message: '“{{category}}”支出比三个月均值高 {{percent}}%',
  },
  'pattern.unbudgeted_top_category': {
    title: '最大类别没有预算',
    message: '“{{category}}”是本月最大支出，但没有设置预算',
  },
  'trend.savings_rate_up': {
    title: '储蓄率上升',
    message: '储蓄率 {{rate}}%，比上月高 {{diff}} 个百分点',
  },
  'trend.savings_rate_down': {
    title: '储蓄率下降',
    message: '储蓄率 {{rate}}%，比上月低 {{diff}} 个百分点',
  },
  'pattern.risky_allocation': {
    title: '风险资产占比过高',
    message: '{{percent}}% 的资产处于中高风险，超过 {{threshold}}% 的上限',
  },
};

const ar: TranslationMap = {
  'operational.unapproved': {
    title: 'معاملات غير مؤكدة',
    message: '{{count}} معاملة بانتظار التأكيد',
  },
  'operational.uncategorized': { title: 'معاملات بدون فئة', message: '{{count}} معاملة بدون فئة' },
  'operational.duplicates': {
    title: 'تم العثور على تكرارات محتملة',
    message: 'تم رصد {{count}} تكرار محتمل',
  },
  'trend.category_rising': {
    title: 'الفئة في ارتفاع',
    message: 'الإنفاق على "{{category}}" أعلى بنسبة {{percent}}% من متوسط 3 أشهر',
  },
  'pattern.unbudgeted_top_category': {
    title: 'أكبر فئة بلا ميزانية',
    message: '"{{category}}" هي أكبر نفقاتك هذا الشهر وليس لها ميزانية',
  },
  'trend.savings_rate_up': {
    title: 'ارتفع معدل الادخار',
    message: 'معدل الادخار {{rate}}% — أعلى بـ {{diff}} نقطة من الشهر الماضي',
  },
  'trend.savings_rate_down': {
    title: 'انخفض معدل الادخار',
    message: 'معدل الادخار {{rate}}% — أقل بـ {{diff}} نقطة من الشهر الماضي',
  },
  'pattern.risky_allocation': {
    title: 'رأس مال كثير في المخاطرة',
    message: '{{percent}}% من الأصول في مخاطرة متوسطة أو عالية — أعلى من حد {{threshold}}%',
  },
};

const pl: TranslationMap = {
  'operational.unapproved': {
    title: 'Niezatwierdzone transakcje',
    message: '{{count}} transakcji czeka na zatwierdzenie',
  },
  'operational.uncategorized': {
    title: 'Transakcje bez kategorii',
    message: '{{count}} transakcji nie ma kategorii',
  },
  'operational.duplicates': {
    title: 'Znaleziono możliwe duplikaty',
    message: 'Wykryto {{count}} potencjalnych duplikatów',
  },
  'trend.category_rising': {
    title: 'Kategoria rośnie',
    message: 'Wydatki na "{{category}}" są o {{percent}}% wyższe od średniej z 3 miesięcy',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Największa kategoria bez budżetu',
    message: '"{{category}}" to największy wydatek w tym miesiącu i nie ma budżetu',
  },
  'trend.savings_rate_up': {
    title: 'Stopa oszczędności wzrosła',
    message: 'Stopa oszczędności {{rate}}% — o {{diff}} pkt proc. wyżej niż w zeszłym miesiącu',
  },
  'trend.savings_rate_down': {
    title: 'Stopa oszczędności spadła',
    message: 'Stopa oszczędności {{rate}}% — o {{diff}} pkt proc. niżej niż w zeszłym miesiącu',
  },
  'pattern.risky_allocation': {
    title: 'Zbyt dużo kapitału w ryzyku',
    message:
      '{{percent}}% aktywów jest w średnim lub wysokim ryzyku — powyżej progu {{threshold}}%',
  },
};

const it: TranslationMap = {
  'operational.unapproved': {
    title: 'Transazioni non approvate',
    message: '{{count}} transazioni in attesa di approvazione',
  },
  'operational.uncategorized': {
    title: 'Transazioni senza categoria',
    message: '{{count}} transazioni senza categoria',
  },
  'operational.duplicates': {
    title: 'Possibili duplicati trovati',
    message: 'Rilevati {{count}} potenziali duplicati',
  },
  'trend.category_rising': {
    title: 'Categoria in crescita',
    message: 'La spesa per "{{category}}" supera del {{percent}}% la media di 3 mesi',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Categoria principale senza budget',
    message: '"{{category}}" è la spesa maggiore del mese e non ha budget',
  },
  'trend.savings_rate_up': {
    title: 'Tasso di risparmio in aumento',
    message: 'Tasso di risparmio {{rate}}% — {{diff}} punti in più del mese scorso',
  },
  'trend.savings_rate_down': {
    title: 'Tasso di risparmio in calo',
    message: 'Tasso di risparmio {{rate}}% — {{diff}} punti in meno del mese scorso',
  },
  'pattern.risky_allocation': {
    title: 'Troppo capitale a rischio',
    message:
      'Il {{percent}}% delle attività è a rischio medio o alto — oltre il limite del {{threshold}}%',
  },
};

const sk: TranslationMap = {
  'operational.unapproved': {
    title: 'Nepotvrdené transakcie',
    message: '{{count}} transakcií čaká na potvrdenie',
  },
  'operational.uncategorized': {
    title: 'Transakcie bez kategórie',
    message: '{{count}} transakcií nemá kategóriu',
  },
  'operational.duplicates': {
    title: 'Nájdené možné duplikáty',
    message: 'Zistených {{count}} možných duplikátov',
  },
  'trend.category_rising': {
    title: 'Kategória rastie',
    message: 'Výdavky na "{{category}}" sú o {{percent}}% vyššie než 3-mesačný priemer',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Najväčšia kategória bez rozpočtu',
    message: '"{{category}}" je tento mesiac najväčší výdavok a nemá rozpočet',
  },
  'trend.savings_rate_up': {
    title: 'Miera úspor stúpla',
    message: 'Miera úspor {{rate}}% — o {{diff}} p. b. viac než minulý mesiac',
  },
  'trend.savings_rate_down': {
    title: 'Miera úspor klesla',
    message: 'Miera úspor {{rate}}% — o {{diff}} p. b. menej než minulý mesiac',
  },
  'pattern.risky_allocation': {
    title: 'Priveľa kapitálu v riziku',
    message: '{{percent}}% aktív je v strednom alebo vysokom riziku — nad hranicou {{threshold}}%',
  },
};

const ja: TranslationMap = {
  'operational.unapproved': {
    title: '未承認の取引があります',
    message: '{{count}} 件の取引が承認待ちです',
  },
  'operational.uncategorized': {
    title: '未分類の取引があります',
    message: '{{count}} 件の取引にカテゴリがありません',
  },
  'operational.duplicates': {
    title: '重複の可能性を検出',
    message: '{{count}} 件の重複候補を検出しました',
  },
  'trend.category_rising': {
    title: 'カテゴリの支出が増加',
    message: '「{{category}}」の支出が3か月平均より {{percent}}% 多くなっています',
  },
  'pattern.unbudgeted_top_category': {
    title: '最大カテゴリに予算がありません',
    message: '「{{category}}」は今月最大の支出ですが予算が未設定です',
  },
  'trend.savings_rate_up': {
    title: '貯蓄率が上昇',
    message: '貯蓄率 {{rate}}% — 前月より {{diff}} ポイント高い',
  },
  'trend.savings_rate_down': {
    title: '貯蓄率が低下',
    message: '貯蓄率 {{rate}}% — 前月より {{diff}} ポイント低い',
  },
  'pattern.risky_allocation': {
    title: 'リスク資産が多すぎます',
    message: '資産の{{percent}}%が中〜高リスクで、上限{{threshold}}%を超えています',
  },
};

const ko: TranslationMap = {
  'operational.unapproved': {
    title: '미승인 거래가 있습니다',
    message: '{{count}}건의 거래가 승인 대기 중입니다',
  },
  'operational.uncategorized': {
    title: '미분류 거래가 있습니다',
    message: '{{count}}건의 거래에 카테고리가 없습니다',
  },
  'operational.duplicates': {
    title: '중복 가능성 발견',
    message: '{{count}}건의 잠재적 중복을 발견했습니다',
  },
  'trend.category_rising': {
    title: '카테고리 지출 증가',
    message: '"{{category}}" 지출이 3개월 평균보다 {{percent}}% 많습니다',
  },
  'pattern.unbudgeted_top_category': {
    title: '최대 카테고리에 예산 없음',
    message: '"{{category}}"은(는) 이번 달 최대 지출이지만 예산이 없습니다',
  },
  'trend.savings_rate_up': {
    title: '저축률 상승',
    message: '저축률 {{rate}}% — 지난달보다 {{diff}}%p 높습니다',
  },
  'trend.savings_rate_down': {
    title: '저축률 하락',
    message: '저축률 {{rate}}% — 지난달보다 {{diff}}%p 낮습니다',
  },
  'pattern.risky_allocation': {
    title: '위험 자산 비중이 높습니다',
    message: '자산의 {{percent}}%가 중·고위험으로 {{threshold}}% 한도를 넘었습니다',
  },
};

const hi: TranslationMap = {
  'operational.unapproved': {
    title: 'अस्वीकृत लेनदेन हैं',
    message: '{{count}} लेनदेन स्वीकृति की प्रतीक्षा में हैं',
  },
  'operational.uncategorized': {
    title: 'बिना श्रेणी के लेनदेन',
    message: '{{count}} लेनदेन की कोई श्रेणी नहीं है',
  },
  'operational.duplicates': { title: 'संभावित डुप्लिकेट मिले', message: '{{count}} संभावित डुप्लिकेट मिले' },
  'trend.category_rising': {
    title: 'श्रेणी में खर्च बढ़ रहा है',
    message: '"{{category}}" पर खर्च 3-महीने के औसत से {{percent}}% अधिक है',
  },
  'pattern.unbudgeted_top_category': {
    title: 'सबसे बड़ी श्रेणी का बजट नहीं',
    message: '"{{category}}" इस महीने का सबसे बड़ा खर्च है, पर बजट नहीं है',
  },
  'trend.savings_rate_up': {
    title: 'बचत दर बढ़ी',
    message: 'बचत दर {{rate}}% — पिछले महीने से {{diff}} अंक अधिक',
  },
  'trend.savings_rate_down': {
    title: 'बचत दर घटी',
    message: 'बचत दर {{rate}}% — पिछले महीने से {{diff}} अंक कम',
  },
  'pattern.risky_allocation': {
    title: 'बहुत अधिक पूँजी जोखिम में',
    message: '{{percent}}% संपत्ति मध्यम या उच्च जोखिम में है — {{threshold}}% की सीमा से अधिक',
  },
};

const nl: TranslationMap = {
  'operational.unapproved': {
    title: 'Niet-goedgekeurde transacties',
    message: '{{count}} transacties wachten op goedkeuring',
  },
  'operational.uncategorized': {
    title: 'Transacties zonder categorie',
    message: '{{count}} transacties hebben geen categorie',
  },
  'operational.duplicates': {
    title: 'Mogelijke duplicaten gevonden',
    message: '{{count}} mogelijke duplicaten gevonden',
  },
  'trend.category_rising': {
    title: 'Categorie stijgt',
    message: 'Uitgaven aan "{{category}}" liggen {{percent}}% boven het 3-maandsgemiddelde',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Grootste categorie zonder budget',
    message: '"{{category}}" is deze maand je grootste uitgave en heeft geen budget',
  },
  'trend.savings_rate_up': {
    title: 'Spaarquote gestegen',
    message: 'Spaarquote {{rate}}% — {{diff}} procentpunt hoger dan vorige maand',
  },
  'trend.savings_rate_down': {
    title: 'Spaarquote gedaald',
    message: 'Spaarquote {{rate}}% — {{diff}} procentpunt lager dan vorige maand',
  },
  'pattern.risky_allocation': {
    title: 'Te veel kapitaal in risico',
    message:
      '{{percent}}% van de activa zit in midden- of hoog risico — boven de grens van {{threshold}}%',
  },
};

const sv: TranslationMap = {
  'operational.unapproved': {
    title: 'Ej godkända transaktioner',
    message: '{{count}} transaktioner väntar på godkännande',
  },
  'operational.uncategorized': {
    title: 'Transaktioner utan kategori',
    message: '{{count}} transaktioner saknar kategori',
  },
  'operational.duplicates': {
    title: 'Möjliga dubbletter hittade',
    message: '{{count}} möjliga dubbletter upptäckta',
  },
  'trend.category_rising': {
    title: 'Kategorin ökar',
    message: 'Utgifterna för "{{category}}" är {{percent}}% över 3-månaderssnittet',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Största kategorin saknar budget',
    message: '"{{category}}" är månadens största utgift och saknar budget',
  },
  'trend.savings_rate_up': {
    title: 'Sparkvoten har ökat',
    message: 'Sparkvot {{rate}}% — {{diff}} procentenheter högre än förra månaden',
  },
  'trend.savings_rate_down': {
    title: 'Sparkvoten har minskat',
    message: 'Sparkvot {{rate}}% — {{diff}} procentenheter lägre än förra månaden',
  },
  'pattern.risky_allocation': {
    title: 'För mycket kapital i risk',
    message:
      '{{percent}}% av tillgångarna ligger i medel- eller hög risk — över gränsen på {{threshold}}%',
  },
};

const vi: TranslationMap = {
  'operational.unapproved': {
    title: 'Có giao dịch chưa duyệt',
    message: '{{count}} giao dịch đang chờ duyệt',
  },
  'operational.uncategorized': {
    title: 'Có giao dịch chưa phân loại',
    message: '{{count}} giao dịch chưa có danh mục',
  },
  'operational.duplicates': {
    title: 'Phát hiện bản trùng',
    message: 'Phát hiện {{count}} giao dịch có thể trùng lặp',
  },
  'trend.category_rising': {
    title: 'Danh mục đang tăng',
    message: 'Chi tiêu cho "{{category}}" cao hơn {{percent}}% so với trung bình 3 tháng',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Danh mục lớn nhất chưa có ngân sách',
    message: '"{{category}}" là khoản chi lớn nhất tháng này nhưng chưa có ngân sách',
  },
  'trend.savings_rate_up': {
    title: 'Tỷ lệ tiết kiệm tăng',
    message: 'Tỷ lệ tiết kiệm {{rate}}% — cao hơn tháng trước {{diff}} điểm',
  },
  'trend.savings_rate_down': {
    title: 'Tỷ lệ tiết kiệm giảm',
    message: 'Tỷ lệ tiết kiệm {{rate}}% — thấp hơn tháng trước {{diff}} điểm',
  },
  'pattern.risky_allocation': {
    title: 'Quá nhiều vốn chịu rủi ro',
    message: '{{percent}}% tài sản ở mức rủi ro trung bình hoặc cao — vượt ngưỡng {{threshold}}%',
  },
};

const id: TranslationMap = {
  'operational.unapproved': {
    title: 'Ada transaksi belum disetujui',
    message: '{{count}} transaksi menunggu persetujuan',
  },
  'operational.uncategorized': {
    title: 'Ada transaksi tanpa kategori',
    message: '{{count}} transaksi belum punya kategori',
  },
  'operational.duplicates': {
    title: 'Kemungkinan duplikat ditemukan',
    message: '{{count}} potensi duplikat terdeteksi',
  },
  'trend.category_rising': {
    title: 'Kategori meningkat',
    message: 'Pengeluaran "{{category}}" {{percent}}% di atas rata-rata 3 bulan',
  },
  'pattern.unbudgeted_top_category': {
    title: 'Kategori terbesar tanpa anggaran',
    message: '"{{category}}" adalah pengeluaran terbesar bulan ini dan belum punya anggaran',
  },
  'trend.savings_rate_up': {
    title: 'Rasio tabungan naik',
    message: 'Rasio tabungan {{rate}}% — {{diff}} poin lebih tinggi dari bulan lalu',
  },
  'trend.savings_rate_down': {
    title: 'Rasio tabungan turun',
    message: 'Rasio tabungan {{rate}}% — {{diff}} poin lebih rendah dari bulan lalu',
  },
  'pattern.risky_allocation': {
    title: 'Terlalu banyak modal berisiko',
    message:
      '{{percent}}% aset berada di risiko menengah atau tinggi — di atas batas {{threshold}}%',
  },
};

export const INSIGHT_TRANSLATIONS: Record<string, TranslationMap> = {
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

export function renderInsight(
  locale: string,
  key: InsightMessageKey,
  params: Record<string, string | number>,
): { title: string; message: string } {
  const translations = INSIGHT_TRANSLATIONS[locale] ?? INSIGHT_TRANSLATIONS.en;
  const entry = translations[key];
  const interpolate = (template: string) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  return { title: interpolate(entry.title), message: interpolate(entry.message) };
}

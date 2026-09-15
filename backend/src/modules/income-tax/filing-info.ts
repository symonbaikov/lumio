import type { TaxpayerType } from './rule-packs/types';

/**
 * Where, by when and on which form a year's income tax is filed, per country.
 *
 * Every entry was checked against the tax authority's own page (or the statute)
 * for the 2025 tax year (research passes of 2026-09-13 and 2026-09-14). Fields
 * that were not verified are NULL rather than filled from memory; countries
 * that were not verified are simply absent.
 */

export type DeadlineKind =
  | 'standard'
  | 'paper'
  | 'online'
  | 'adviser'
  | 'online_pay_and_file'
  | 'no_assessment_received'
  | 'direct_debit'
  | 'online_zone_1'
  | 'online_zone_2'
  | 'online_zone_3'
  | 'higher_rate_income'
  | 'with_extension'
  | 'correction';

/**
 * What the tax authority prepares on its own.
 * - becomes_final: an assessment that stands if the taxpayer does nothing;
 * - prepared_needs_confirmation: a prefilled return the taxpayer must complete and accept;
 * - prepared: a draft is offered; what happens without action was not verified.
 */
export type AuthorityPreparation = 'becomes_final' | 'prepared_needs_confirmation' | 'prepared';

export type RetentionKind =
  | 'booking_documents'
  | 'books_and_records'
  | 'other_business_documents'
  | 'tax_records'
  | 'commercial_books'
  | 'accounting_records';

/**
 * How long the year's records must be kept. `until` applies the rule to records
 * of the tax year itself; `years` is NULL where the source gives a date instead.
 */
export interface RetentionInfo {
  periods: Array<{ kind: RetentionKind; years: number | null; until: string }>;
  sourceUrl: string;
}

export interface FilingInfo {
  countryCode: string;
  taxYear: number;
  formName: string;
  /** First day returns are accepted, when the authority sets one. */
  filingOpens: string | null;
  deadlines: Array<{ kind: DeadlineKind; date: string }>;
  authorityPreparation: AuthorityPreparation | null;
  portal: string | null;
  sourceUrl: string;
  retention: RetentionInfo | null;
}

type Override = Partial<
  Pick<
    FilingInfo,
    'formName' | 'filingOpens' | 'deadlines' | 'authorityPreparation' | 'sourceUrl' | 'retention'
  >
>;

/** Defaults for the country, plus what differs by taxpayer type or regime. */
type Entry = Omit<FilingInfo, 'retention'> & {
  retention?: RetentionInfo;
  forType?: (type: TaxpayerType, details: Record<string, unknown>) => Override;
};

const PL_BUSINESS_FORMS: Record<string, string> = {
  liniowy: 'PIT-36L',
  ryczalt: 'PIT-28',
  skala: 'PIT-36',
};

const ENTRIES: Entry[] = [
  {
    countryCode: 'PL',
    taxYear: 2025,
    formName: 'PIT-36 / PIT-36L / PIT-28',
    filingOpens: '2026-02-15',
    deadlines: [{ kind: 'standard', date: '2026-04-30' }],
    authorityPreparation: null,
    // Twój e-PIT accepts PIT-37 on its own; business returns wait for the taxpayer.
    forType: (type, details) =>
      type === 'employee'
        ? { formName: 'PIT-37', authorityPreparation: 'becomes_final' }
        : {
            formName: PL_BUSINESS_FORMS[String(details.regime)] ?? 'PIT-36 / PIT-36L / PIT-28',
            authorityPreparation: 'prepared_needs_confirmation',
          },
    portal: 'Twój e-PIT',
    sourceUrl:
      'https://www.gov.pl/web/finanse/rozliczenie-pit-za-2025-rok-od-15-lutego-do-30-kwietnia',
  },
  {
    countryCode: 'DE',
    taxYear: 2025,
    formName: 'Einkommensteuererklärung',
    filingOpens: null,
    // § 149 Abs. 2/3 AO; 28.02.2027 is a Sunday, so the adviser deadline moves to 1 March (§ 108 Abs. 3 AO).
    deadlines: [
      { kind: 'standard', date: '2026-07-31' },
      { kind: 'adviser', date: '2027-03-01' },
    ],
    authorityPreparation: null,
    portal: 'ELSTER',
    sourceUrl: 'https://www.gesetze-im-internet.de/ao_1977/__149.html',
    // § 147 Abs. 3–4 AO (as of 2025): counted from the end of the year a document was
    // created or the last entry made, so a record closed in 2026 runs a year longer.
    retention: {
      periods: [
        { kind: 'booking_documents', years: 8, until: '2033-12-31' },
        { kind: 'books_and_records', years: 10, until: '2035-12-31' },
        { kind: 'other_business_documents', years: 6, until: '2031-12-31' },
      ],
      sourceUrl: 'https://www.gesetze-im-internet.de/ao_1977/__147.html',
    },
    // The duty to keep records falls on businesses.
    forType: type => (type === 'employee' ? { retention: null } : {}),
  },
  {
    countryCode: 'ES',
    taxYear: 2025,
    // Common-regime calendar; the Basque Country and Navarra run their own.
    formName: 'Modelo 100 (Renta 2025)',
    filingOpens: '2026-04-08',
    deadlines: [
      { kind: 'direct_debit', date: '2026-06-25' },
      { kind: 'standard', date: '2026-06-30' },
    ],
    authorityPreparation: null,
    portal: 'Renta WEB',
    sourceUrl:
      'https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/calendario-campana-renta/junio.html',
  },
  {
    countryCode: 'FR',
    taxYear: 2025,
    formName: 'Déclaration 2042 (2042-C-PRO)',
    filingOpens: null,
    deadlines: [
      { kind: 'paper', date: '2026-05-19' },
      { kind: 'online_zone_1', date: '2026-05-21' },
      { kind: 'online_zone_2', date: '2026-05-28' },
      { kind: 'online_zone_3', date: '2026-06-04' },
    ],
    authorityPreparation: null,
    portal: 'impots.gouv.fr',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/calendrier-fiscal/2026-05',
    // LPF art. L102 B (6 years from the last operation) and, for traders,
    // Code de commerce art. L123-22 (10 years from the close of the financial year).
    retention: {
      periods: [
        { kind: 'tax_records', years: 6, until: '2031-12-31' },
        { kind: 'commercial_books', years: 10, until: '2035-12-31' },
      ],
      sourceUrl: 'https://entreprendre.service-public.gouv.fr/vosdroits/F10029',
    },
    forType: type => (type === 'employee' ? { retention: null } : {}),
  },
  {
    countryCode: 'IT',
    taxYear: 2025,
    formName: 'Redditi Persone Fisiche 2026',
    filingOpens: '2026-04-15',
    // 31.10.2026 is a Saturday, so the online deadline moves to Monday 2 November.
    deadlines: [
      { kind: 'paper', date: '2026-06-30' },
      { kind: 'online', date: '2026-11-02' },
    ],
    // Accepting the precompilata unchanged only spares documentary checks on third-party data.
    authorityPreparation: 'prepared_needs_confirmation',
    forType: type =>
      type === 'employee'
        ? {
            formName: '730/2026 precompilato',
            filingOpens: '2026-05-14',
            deadlines: [{ kind: 'online', date: '2026-09-30' }],
          }
        : {},
    // Art. 43 DPR 600/1973, as stated in the Redditi PF 2026 instructions; applies to every return.
    retention: {
      periods: [{ kind: 'tax_records', years: null, until: '2031-12-31' }],
      sourceUrl:
        'https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf1_istruzioni_2026_agg-28-05-2026',
    },
    portal: 'Agenzia delle Entrate — dichiarazione precompilata',
    sourceUrl: 'https://infoprecompilata.agenziaentrate.gov.it/portale/scadenze',
  },
  {
    countryCode: 'AT',
    taxYear: 2025,
    formName: 'Formular E1 (E1a for business income)',
    filingOpens: null,
    deadlines: [
      { kind: 'paper', date: '2026-04-30' },
      { kind: 'online', date: '2026-06-30' },
    ],
    authorityPreparation: null,
    portal: 'FinanzOnline',
    sourceUrl:
      'https://www.bmf.gv.at/themen/steuern/fuer-unternehmen/einkommensteuer/einkommensteuererklaerungspflicht.html',
  },
  {
    countryCode: 'IE',
    taxYear: 2025,
    formName: 'Form 11',
    filingOpens: null,
    deadlines: [
      { kind: 'standard', date: '2026-10-31' },
      { kind: 'online_pay_and_file', date: '2026-11-18' },
    ],
    authorityPreparation: null,
    portal: 'ROS (Revenue Online Service)',
    sourceUrl: 'https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-0342026.aspx',
  },
  {
    countryCode: 'CZ',
    taxYear: 2025,
    formName: 'Daňové přiznání k dani z příjmů fyzických osob',
    filingOpens: null,
    deadlines: [
      { kind: 'paper', date: '2026-04-01' },
      { kind: 'online', date: '2026-05-04' },
      { kind: 'adviser', date: '2026-07-01' },
    ],
    authorityPreparation: null,
    portal: 'MOJE daně',
    sourceUrl:
      'https://financnisprava.gov.cz/cs/financni-sprava/media-a-verejnost/tiskove-zpravy-gfr/tiskove-zpravy-2026/vyplnujete-danove-priznani-za-rok-2025',
  },
  {
    countryCode: 'HU',
    taxYear: 2025,
    formName: '2553 (SZJA)',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-05-20' }],
    authorityPreparation: 'prepared',
    portal: 'eSZJA',
    sourceUrl: 'https://nav.gov.hu/sajtoszoba/hirek/Indul_a_2026-os_szja-szezon',
  },
  {
    countryCode: 'SK',
    taxYear: 2025,
    formName: 'Daňové priznanie k dani z príjmov fyzickej osoby',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-03-31' }],
    authorityPreparation: null,
    portal: null,
    sourceUrl:
      'https://podpora.financnasprava.sk/398970-Lehota-na-podanie-da%C5%88ov%C3%A9ho-priznania-k-dani-z-pr%C3%ADjmov-za-rok-2025',
  },
  {
    countryCode: 'RO',
    taxYear: 2025,
    formName: 'Declarația unică (formular 212)',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-05-25' }],
    authorityPreparation: null,
    portal: 'SPV (anaf.ro)',
    sourceUrl: 'https://static.anaf.ro/static/3/Cluj/20260522102135_25_%20mai_%202026%20.pdf',
  },
  {
    countryCode: 'PT',
    taxYear: 2025,
    formName: 'IRS — Modelo 3',
    filingOpens: '2026-04-01',
    deadlines: [{ kind: 'standard', date: '2026-06-30' }],
    // IRS Automático, for eligible taxpayers only; the eligibility conditions were not verified.
    authorityPreparation: 'becomes_final',
    portal: 'Portal das Finanças',
    sourceUrl:
      'https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Rendimentos/Declaracao/IRS_automatico/Paginas/default.aspx',
  },
  {
    countryCode: 'SI',
    taxYear: 2025,
    formName: 'Napoved za odmero dohodnine',
    filingOpens: null,
    deadlines: [{ kind: 'no_assessment_received', date: '2026-07-31' }],
    authorityPreparation: 'becomes_final',
    portal: 'eDavki',
    sourceUrl:
      'https://www.fu.gov.si/fileadmin/Internet/Davki_in_druge_dajatve/Podrocja/Dohodnina/Letna_odmera_dohodnine/Opis/Odmera_dohodnine_za_leto_2025.doc',
  },
  {
    countryCode: 'LU',
    taxYear: 2025,
    formName: 'Modèle 100 (annexes 111c, 112 for business income)',
    filingOpens: '2026-04-07',
    // Same date on paper and online.
    deadlines: [{ kind: 'standard', date: '2026-12-31' }],
    authorityPreparation: null,
    portal: 'MyGuichet.lu',
    sourceUrl:
      'https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/activite-professionnelle/declaration-revenus/declaration-impot.html',
  },
  {
    countryCode: 'DK',
    taxYear: 2025,
    formName: 'Oplysningsskema',
    filingOpens: null,
    // Owners of a personal business get no årsopgørelse until the oplysningsskema is filed.
    deadlines: [{ kind: 'standard', date: '2026-07-01' }],
    authorityPreparation: null,
    // Whether an unchanged årsopgørelse becomes final was not verified.
    forType: type =>
      type === 'employee'
        ? {
            formName: 'Årsopgørelse',
            filingOpens: '2026-03-23',
            deadlines: [{ kind: 'correction', date: '2026-05-20' }],
            authorityPreparation: 'prepared',
            retention: null,
          }
        : {},
    // Bogføringsloven § 12: 5 years from the end of the financial year.
    retention: {
      periods: [{ kind: 'accounting_records', years: 5, until: '2030-12-31' }],
      sourceUrl: 'https://www.retsinformation.dk/eli/lta/2022/700',
    },
    portal: 'TastSelv Borger (skat.dk)',
    sourceUrl: 'https://skat.dk/borger/aarsopgoerelse/aarsopgoerelsen-hvornaar-sker-hvad',
  },
  {
    countryCode: 'SE',
    taxYear: 2025,
    formName: 'Inkomstdeklaration 1 (NE annex for sole traders)',
    filingOpens: '2026-03-17',
    deadlines: [
      { kind: 'standard', date: '2026-05-04' },
      { kind: 'with_extension', date: '2026-06-01' },
      // byråanstånd, requested by the accounting firm.
      { kind: 'adviser', date: '2026-06-15' },
    ],
    authorityPreparation: null,
    forType: type => (type === 'employee' ? { formName: 'Inkomstdeklaration 1' } : {}),
    portal: 'Skatteverket e-tjänst (Mina sidor)',
    sourceUrl:
      'https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraenskildnaringsverksamhet.4.133ff59513d6f9ee2ebf00.html',
  },
  {
    countryCode: 'FI',
    taxYear: 2025,
    // Filed every year, even without activity; assumes a calendar-year accounting period.
    formName: 'Elinkeinotoiminnan veroilmoitus (5)',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-04-01' }],
    authorityPreparation: null,
    // The pre-completed return: each taxpayer's own correction date is printed on it.
    forType: type =>
      type === 'employee'
        ? {
            formName: 'Esitäytetty veroilmoitus',
            deadlines: ['2026-04-01', '2026-04-14', '2026-04-21', '2026-04-28'].map(date => ({
              kind: 'correction' as const,
              date,
            })),
            authorityPreparation: 'becomes_final',
            sourceUrl:
              'https://www.vero.fi/henkiloasiakkaat/verokortti-ja-veroilmoitus/veroilmoitus_ja_verotuspaato/',
          }
        : {},
    portal: 'OmaVero',
    sourceUrl: 'https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/liikkeen-tai-ammatinharjoittaja/',
  },
  {
    countryCode: 'GR',
    taxYear: 2025,
    formName: 'Ε1 (Ε3 for business income)',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-07-24' }],
    // Ε3 comes prefilled from myDATA and can be changed; deemed filing was not verified.
    authorityPreparation: 'prepared_needs_confirmation',
    forType: type => (type === 'employee' ? { formName: 'Ε1', authorityPreparation: 'prepared' } : {}),
    portal: null,
    sourceUrl: 'https://www.aade.gr/dilosi-forologias-eisodimatos-fp-e1-e2-e3',
  },
  {
    countryCode: 'MT',
    taxYear: 2025,
    formName: 'Personal Income Tax Return (Year of Assessment 2026)',
    filingOpens: '2026-05-15',
    // Standing MTCA rule (30 June, online 31 July); no year-specific notice confirmed the dates.
    deadlines: [
      { kind: 'standard', date: '2026-06-30' },
      { kind: 'online', date: '2026-07-31' },
    ],
    authorityPreparation: null,
    portal: 'myTax (mtca.gov.mt)',
    sourceUrl: 'https://mtca.gov.mt/personal-tax/individual/tax-return-cycle',
  },
  {
    countryCode: 'NL',
    taxYear: 2025,
    formName: 'Aangifte inkomstenbelasting 2025',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-05-01' }],
    // Prefilled, but never final on its own; entrepreneurs may only file online.
    authorityPreparation: 'prepared_needs_confirmation',
    portal: 'Mijn Belastingdienst',
    sourceUrl:
      'https://www.belastingdienst.nl/wps/wcm/connect/nl/belastingaangifte/content/kan-ik-nog-uitstel-aanvragen-belastingaangifte',
  },
  {
    countryCode: 'EE',
    taxYear: 2025,
    formName: 'Form A + Form E (business income)',
    filingOpens: '2026-02-16',
    deadlines: [{ kind: 'standard', date: '2026-04-30' }],
    // Form A is prefilled; Form E never is, and sole proprietors must file even without income.
    authorityPreparation: 'prepared_needs_confirmation',
    forType: type =>
      type === 'employee' ? { formName: 'Form A', authorityPreparation: 'prepared' } : {},
    portal: 'e-MTA',
    sourceUrl:
      'https://www.emta.ee/en/private-client/taxes-and-payment/declaration-income/income-tax-returns-2025',
  },
  {
    countryCode: 'LV',
    taxYear: 2025,
    formName: 'Gada ienākumu deklarācija',
    filingOpens: '2026-03-01',
    // Self-employed may only file through EDS.
    deadlines: [
      { kind: 'standard', date: '2026-06-01' },
      { kind: 'higher_rate_income', date: '2026-07-01' },
    ],
    authorityPreparation: null,
    portal: 'EDS (VID)',
    sourceUrl: 'https://www.vid.gov.lv/lv/deklaraciju-iesniegsanas-un-nodoklu-nomaksas-termini',
  },
  {
    countryCode: 'LT',
    taxYear: 2025,
    formName: 'GPM311 (GPM311C for individual activity)',
    filingOpens: null,
    deadlines: [{ kind: 'standard', date: '2026-05-04' }],
    authorityPreparation: 'prepared_needs_confirmation',
    portal: 'Mano VMI',
    sourceUrl:
      'https://www.vmi.lt/evmi/paaiskinimai-apie-2025-metu-pajamu-ir-turto-deklaravimo-tvarka',
  },
  {
    countryCode: 'HR',
    taxYear: 2025,
    formName: 'Obrazac DOH',
    filingOpens: null,
    // Online only.
    deadlines: [{ kind: 'online', date: '2026-03-02' }],
    authorityPreparation: null,
    portal: 'ePorezna',
    sourceUrl: 'https://porezna-uprava.gov.hr/hr/godisnji-obracun-poreza-na-dohodak/3957',
  },
  {
    countryCode: 'CY',
    taxYear: 2025,
    formName: 'Individual Income Tax Return',
    filingOpens: '2026-06-18',
    deadlines: [{ kind: 'standard', date: '2026-10-31' }],
    authorityPreparation: null,
    portal: 'TAXISnet',
    sourceUrl:
      'https://www.gov.cy/oikonomia/anakoinosi-tou-tmimatos-forologias-anaforika-me-tin-enarxi-tis-ypovolis-tis-dilosis-eisodimatos-atomou-gia-to-forologiko-etos-2025/',
  },
];

export function filingInfoFor(
  countryCode: string,
  taxYear: number,
  taxpayerType: TaxpayerType,
  details: Record<string, unknown>,
): FilingInfo | null {
  const entry = ENTRIES.find(
    candidate =>
      candidate.countryCode === countryCode.toUpperCase() && candidate.taxYear === taxYear,
  );
  if (!entry) {
    return null;
  }
  const { forType, ...info } = entry;
  return { retention: null, ...info, ...forType?.(taxpayerType, details) };
}

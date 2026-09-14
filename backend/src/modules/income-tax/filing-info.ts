import type { TaxpayerType } from './rule-packs/types';

/**
 * Where, by when and on which form a year's income tax is filed, per country.
 *
 * Every entry was checked against the tax authority's own page for the 2025
 * tax year (second research pass, 2026-09-13). Fields that were not verified
 * are NULL rather than filled from memory; countries that were not verified
 * are simply absent.
 */

export type DeadlineKind =
  | 'standard'
  | 'paper'
  | 'online'
  | 'adviser'
  | 'online_pay_and_file'
  | 'no_assessment_received';

/**
 * What the tax authority prepares on its own.
 * - becomes_final: an assessment that stands if the taxpayer does nothing;
 * - prepared_needs_confirmation: a prefilled return the taxpayer must complete and accept;
 * - prepared: a draft is offered; what happens without action was not verified.
 */
export type AuthorityPreparation = 'becomes_final' | 'prepared_needs_confirmation' | 'prepared';

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
}

type Entry = Omit<FilingInfo, 'formName'> & {
  formName: string | ((type: TaxpayerType, details: Record<string, unknown>) => string);
  preparationFor?: (type: TaxpayerType) => AuthorityPreparation | null;
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
    formName: (type, details) =>
      type === 'employee'
        ? 'PIT-37'
        : (PL_BUSINESS_FORMS[String(details.regime)] ?? 'PIT-36 / PIT-36L / PIT-28'),
    filingOpens: '2026-02-15',
    deadlines: [{ kind: 'standard', date: '2026-04-30' }],
    authorityPreparation: null,
    // Twój e-PIT accepts PIT-37 on its own; business returns wait for the taxpayer.
    preparationFor: type => (type === 'employee' ? 'becomes_final' : 'prepared_needs_confirmation'),
    portal: 'Twój e-PIT',
    sourceUrl:
      'https://www.gov.pl/web/finanse/rozliczenie-pit-za-2025-rok-od-15-lutego-do-30-kwietnia',
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
  const { preparationFor, formName, ...rest } = entry;
  return {
    ...rest,
    formName: typeof formName === 'function' ? formName(taxpayerType, details) : formName,
    authorityPreparation: preparationFor
      ? preparationFor(taxpayerType)
      : entry.authorityPreparation,
  };
}

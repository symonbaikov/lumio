import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { kk } from './kk';
import { ko } from './ko';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ru } from './ru';
import { sk } from './sk';
import { sv } from './sv';
import { tr } from './tr';
import type { QuoteTexts } from './types';
import { uk } from './uk';
import { vi } from './vi';
import { zh } from './zh';

/** Quote texts by locale; the analyzer falls back to English. */
export const QUOTE_TEXTS: Record<string, QuoteTexts> = {
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

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
import type { StoicMessageKey, StoicTextMap } from './types';
import { uk } from './uk';
import { vi } from './vi';
import { zh } from './zh';

export const STOIC_TEXTS: Record<string, StoicTextMap> = {
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

export function isStoicKey(key: string): key is StoicMessageKey {
  return key in en;
}

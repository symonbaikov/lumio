type GmailMerchantInput = {
  vendor?: string | null;
  sender?: string | null;
  subject?: string | null;
  fallback?: string | null;
};

const GENERIC_VENDOR_PATTERN =
  /^(page\s+\d+\s+of\s+\d+|receipt|invoice|payment\s+receipt|order\s+confirmation)$/i;

const SENTENCE_START_PATTERN = /^(we|your|thanks?|dear|hello|hi|please|this)\b/i;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i;

const SUPPORT_SUFFIX_PATTERN =
  /\s+(support|billing|payments?|service|team|notifications?|no[-\s]?reply)$/i;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const toTitleCase = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;

const isLikelySentence = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return false;
  }

  const words = normalized.split(' ').filter(Boolean);
  if (words.length >= 6) {
    return true;
  }

  if (SENTENCE_START_PATTERN.test(normalized)) {
    return true;
  }

  if (/[.!?]/.test(normalized) && words.length >= 4) {
    return true;
  }

  return false;
};

const isBrandLikeVendor = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized.length > 40) {
    return false;
  }

  if (GENERIC_VENDOR_PATTERN.test(normalized)) {
    return false;
  }

  return !isLikelySentence(normalized);
};

const extractBrandFromSender = (sender?: string | null): string | undefined => {
  if (!sender) {
    return undefined;
  }

  const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
  if (displayName && !displayName.includes('@')) {
    const cleaned = normalizeWhitespace(displayName.replace(SUPPORT_SUFFIX_PATTERN, ''));
    if (cleaned && !isLikelySentence(cleaned)) {
      return cleaned.slice(0, 100);
    }

    const normalizedDisplayName = normalizeWhitespace(displayName);
    if (normalizedDisplayName && !isLikelySentence(normalizedDisplayName)) {
      return normalizedDisplayName.slice(0, 100);
    }
  }

  const emailMatch = sender.match(EMAIL_PATTERN);
  const domain = emailMatch?.[1];
  if (!domain) {
    return undefined;
  }

  const rootDomain = domain.split('.')[0] || '';
  if (!rootDomain) {
    return undefined;
  }

  return toTitleCase(rootDomain);
};

const extractBrandFromSubject = (subject?: string | null): string | undefined => {
  if (!subject) {
    return undefined;
  }

  const bracketMatch = subject.match(/^\[([^\]]+)\]/);
  if (bracketMatch?.[1]) {
    const candidate = normalizeWhitespace(bracketMatch[1]);
    if (isBrandLikeVendor(candidate)) {
      return candidate;
    }
  }

  const firstWord = normalizeWhitespace(subject).split(' ')[0] || '';
  if (firstWord && isBrandLikeVendor(firstWord)) {
    return firstWord;
  }

  return undefined;
};

export const resolveGmailMerchantLabel = ({
  vendor,
  sender,
  subject,
  fallback,
}: GmailMerchantInput): string => {
  const normalizedVendor = vendor ? normalizeWhitespace(vendor) : '';
  if (normalizedVendor && isBrandLikeVendor(normalizedVendor)) {
    return normalizedVendor;
  }

  const senderBrand = extractBrandFromSender(sender);
  if (senderBrand) {
    return senderBrand;
  }

  const subjectBrand = extractBrandFromSubject(subject);
  if (subjectBrand) {
    return subjectBrand;
  }

  if (normalizedVendor && !GENERIC_VENDOR_PATTERN.test(normalizedVendor)) {
    return normalizedVendor.slice(0, 28);
  }

  const normalizedFallback = fallback ? normalizeWhitespace(fallback) : '';
  if (normalizedFallback && !isLikelySentence(normalizedFallback)) {
    return normalizedFallback.slice(0, 28);
  }

  return 'Gmail Receipt';
};

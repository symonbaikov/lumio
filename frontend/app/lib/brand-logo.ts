const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'mail.com',
]);

const EMAIL_DOMAIN_REGEX = /@([a-z0-9.-]+\.[a-z]{2,})/i;

export const extractDomainFromSender = (sender: string): string | null => {
  if (!sender) {
    return null;
  }

  const match = sender.match(EMAIL_DOMAIN_REGEX);
  if (!match) {
    return null;
  }

  const domain = match[1]?.toLowerCase();
  if (!domain || GENERIC_DOMAINS.has(domain)) {
    return null;
  }

  return domain;
};

export const getClearbitLogoUrl = (domain: string): string => `https://logo.clearbit.com/${domain}`;

export const getReceiptLogoUrl = (sender: string): string | null => {
  const domain = extractDomainFromSender(sender);
  return domain ? getClearbitLogoUrl(domain) : null;
};

import { GmailReceiptParserService } from '../../../../src/modules/gmail/services/gmail-receipt-parser.service';
import { UniversalAmountParser } from '../../../../src/modules/parsing/services/universal-amount-parser.service';

describe('GmailReceiptParserService', () => {
  let service: GmailReceiptParserService;

  beforeEach(() => {
    service = new GmailReceiptParserService(new UniversalAmountParser());
  });

  it('skips generic page markers when extracting vendor', () => {
    const vendor = (service as any).extractVendor('Page 1 of 1\nGitHub\nReceipt');

    expect(vendor).toBe('GitHub');
  });

  it('falls back to sender name when vendor line is generic', () => {
    const vendor = (service as any).extractVendor('Receipt\nInvoice', 'GitHub');

    expect(vendor).toBe('GitHub');
  });

  it('prefers sender brand when pdf line is long sentence', () => {
    const vendor = (service as any).extractVendor(
      'We received payment for your sponsorship. Thanks for your support of Open Source Software!',
      'GitHub <noreply@github.com>',
    );

    expect(vendor).toBe('GitHub');
  });

  it('normalizes sender support suffix into brand', () => {
    const vendor = (service as any).extractVendor(
      'Page 1 of 1',
      'Bitwage Support <support@bitwage.com>',
    );

    expect(vendor).toBe('Bitwage');
  });

  it('extracts brand from sender email domain when display name is absent', () => {
    const vendor = (service as any).extractVendor('Invoice', '<billing@lidl.com>');

    expect(vendor).toBe('Lidl');
  });

  it('extracts USD amount and currency from amount due line', async () => {
    const parsed = await (service as any).extractAmountWithCurrency('Amount Due: $1,234.56');

    expect(parsed).toEqual({ amount: 1234.56, currency: 'USD' });
  });

  it('extracts KZT amount from a total line with KZT suffix', async () => {
    const parsed = await (service as any).extractAmountWithCurrency('TOTAL 90,000.00KZT');

    expect(parsed).toEqual({ amount: 90000, currency: 'KZT' });
  });

  it('extracts CZK amount and currency from localized total line', async () => {
    const parsed = await (service as any).extractAmountWithCurrency('Celkem: 1 500,00 CZK');

    expect(parsed).toEqual({ amount: 1500, currency: 'CZK' });
  });
});

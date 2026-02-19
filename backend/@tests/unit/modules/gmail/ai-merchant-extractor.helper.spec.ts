import { AiMerchantExtractor } from '../../../../src/modules/gmail/helpers/ai-merchant-extractor.helper';

describe('AiMerchantExtractor', () => {
  describe('isAvailable', () => {
    it('returns false when no API key is provided', () => {
      const extractor = new AiMerchantExtractor(undefined);
      expect(extractor.isAvailable()).toBe(false);
    });
  });

  describe('buildPrompt', () => {
    it('includes all provided fields in the prompt', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const prompt = (extractor as any).buildPrompt({
        pdfText: 'GitHub Inc\nReceipt #1234',
        emailBody: '<p>Thank you for your payment to GitHub</p>',
        sender: 'GitHub <noreply@github.com>',
        subject: '[GitHub] Payment receipt for January 2026',
        dateHeader: '2026-01-15',
      });

      expect(prompt).toContain('GitHub');
      expect(prompt).toContain('noreply@github.com');
      expect(prompt).toContain('Payment receipt');
      expect(prompt).toContain('2026-01-15');
    });

    it('handles missing optional fields gracefully', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const prompt = (extractor as any).buildPrompt({
        sender: 'billing@example.com',
        subject: 'Your receipt',
      });

      expect(prompt).toContain('billing@example.com');
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('null');
    });
  });

  describe('parseResponse', () => {
    it('extracts merchant from valid JSON response', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"GitHub","confidence":0.95}');

      expect(result).toEqual({ merchant: 'GitHub', confidence: 0.95 });
    });

    it('returns null for empty merchant', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"","confidence":0.5}');

      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('not json');

      expect(result).toBeNull();
    });

    it('rejects date-like merchant values', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse(
        '{"merchant":"Date2026-02-16 10:57AM PST","confidence":0.3}',
      );

      expect(result).toBeNull();
    });

    it('rejects low confidence results', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"GitHub","confidence":0.1}');

      expect(result).toBeNull();
    });
  });
});

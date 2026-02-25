import {
  generateTransactionFingerprint,
  normalizeForFingerprint,
} from '../../../src/common/utils/fingerprint.util';

describe('Fingerprint Utility', () => {
  describe('generateTransactionFingerprint', () => {
    it('should generate consistent fingerprints for identical inputs', () => {
      const input = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const fingerprint1 = generateTransactionFingerprint(input);
      const fingerprint2 = generateTransactionFingerprint(input);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(32);
      expect(fingerprint1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate different fingerprints for different workspace IDs', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, workspaceId: 'workspace-456' };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different amounts', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, amount: 1500.51 };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different dates', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, date: new Date('2024-01-16') };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different directions', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, direction: 'credit' as const };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should normalize date strings to YYYY-MM-DD format', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15T10:30:00.000Z'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = {
        ...input1,
        date: '2024-01-15',
      };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should normalize amounts to 2 decimal places', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, amount: 1500.5 };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should normalize merchant names to lowercase', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, merchant: 'TEST MERCHANT' };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should normalize currency to uppercase', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'kzt',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, currency: 'KZT' };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should truncate merchant names to 50 characters', () => {
      const longMerchant = 'A'.repeat(100);
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: longMerchant,
      };

      const input2 = { ...input1, merchant: longMerchant.substring(0, 50) };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should trim whitespace from merchant names', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: '  Test Merchant  ',
      };

      const input2 = { ...input1, merchant: 'Test Merchant' };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should handle different account numbers', () => {
      const input1 = {
        workspaceId: 'workspace-123',
        accountNumber: 'KZ123456789012345678',
        date: new Date('2024-01-15'),
        amount: 1500.5,
        currency: 'KZT',
        direction: 'debit' as const,
        merchant: 'Test Merchant',
      };

      const input2 = { ...input1, accountNumber: 'KZ987654321098765432' };

      const fingerprint1 = generateTransactionFingerprint(input1);
      const fingerprint2 = generateTransactionFingerprint(input2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('normalizeForFingerprint', () => {
    it('should convert to lowercase', () => {
      expect(normalizeForFingerprint('TEST STRING')).toBe('test string');
    });

    it('should trim whitespace', () => {
      expect(normalizeForFingerprint('  test string  ')).toBe('test string');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeForFingerprint('test    string   with   spaces')).toBe(
        'test string with spaces',
      );
    });

    it('should handle empty strings', () => {
      expect(normalizeForFingerprint('')).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      expect(normalizeForFingerprint('   ')).toBe('');
    });
  });
});

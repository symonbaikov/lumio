import { BaseAiHelper } from '@/common/helpers/base-ai.helper';
import { AiParseValidator } from '@/modules/parsing/helpers/ai-parse-validator.helper';
import type { ParsedStatement } from '@/modules/parsing/interfaces/parsed-statement.interface';

const mockFetch = jest.fn();
const mockExtractTextFromPdf = jest.fn();

jest.mock('@/common/utils/pdf-parser.util', () => ({
  extractTextFromPdf: (...args: unknown[]) => mockExtractTextFromPdf(...args),
}));

const mockIsAiEnabled = jest.fn().mockReturnValue(true);
const mockIsAiCircuitOpen = jest.fn().mockReturnValue(false);
const mockRecordAiSuccess = jest.fn();
const mockRecordAiFailure = jest.fn();
const mockWithAiConcurrency = jest.fn().mockImplementation(fn => fn());
const mockRedactSensitive = jest.fn().mockImplementation(value => value);

jest.mock('@/modules/parsing/helpers/ai-runtime.util', () => ({
  isAiEnabled: (...args: unknown[]) => mockIsAiEnabled(...args),
  isAiCircuitOpen: (...args: unknown[]) => mockIsAiCircuitOpen(...args),
  recordAiSuccess: (...args: unknown[]) => mockRecordAiSuccess(...args),
  recordAiFailure: (...args: unknown[]) => mockRecordAiFailure(...args),
  withAiConcurrency: (...args: unknown[]) => mockWithAiConcurrency(...args),
  redactSensitive: (...args: unknown[]) => mockRedactSensitive(...args),
}));

describe('AiParseValidator', () => {
  const originalFetch = global.fetch;
  const parsedStatement: ParsedStatement = {
    metadata: {
      accountNumber: 'KZ123',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T00:00:00.000Z'),
      currency: 'KZT',
    },
    transactions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_BASE_URL = 'http://localhost:11434';
    process.env.AI_MODEL = 'llama3.1';
    global.fetch = mockFetch;
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
    mockExtractTextFromPdf.mockResolvedValue('pdf text');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.AI_BASE_URL = undefined;
    process.env.AI_MODEL = undefined;
  });

  it('returns notes when AI responds with empty content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    } as Response);

    const validator = new AiParseValidator('fake-api-key');
    const result = await validator.reconcileFromPdf('/tmp/file.pdf', parsedStatement);

    expect(result).toEqual({
      corrected: parsedStatement,
      notes: ['AI returned empty content'],
    });
    expect(mockRecordAiFailure).toHaveBeenCalled();
  });

  it('extends BaseAiHelper', () => {
    const validator = new AiParseValidator('fake-api-key');

    expect(validator).toBeInstanceOf(BaseAiHelper);
  });

  it('reconciles even when the backend wraps JSON in a markdown code fence (regression)', async () => {
    const fourTx: ParsedStatement = {
      ...parsedStatement,
      transactions: [
        {
          transactionDate: new Date('2026-01-01T00:00:00.000Z'),
          counterpartyName: 'Test',
          paymentPurpose: 'Test',
          debit: 100,
          currency: 'KZT',
        },
      ],
    };
    const body = JSON.stringify({
      transactions: [{ date: '2026-01-01', amount: 100, counterparty_name: 'Fixed' }],
      notes: [],
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: `\`\`\`json\n${body}\n\`\`\`` } }] }),
    } as Response);

    const validator = new AiParseValidator('fake-api-key');
    const result = await validator.reconcileFromPdf('/tmp/file.pdf', fourTx);

    expect(result.corrected.transactions).toHaveLength(1);
    expect(result.corrected.transactions[0].counterpartyName).toBe('Fixed');
  });

  it('returns circuit-breaker note when AI is unavailable', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);

    const validator = new AiParseValidator('fake-api-key');
    const result = await validator.reconcileFromPdf('/tmp/file.pdf', parsedStatement);

    expect(result).toEqual({
      corrected: parsedStatement,
      notes: ['AI temporarily disabled (circuit breaker)'],
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  describe('undershoot guard', () => {
    const makeTx = (day: string) => ({
      transactionDate: new Date(`2026-01-${day}T00:00:00.000Z`),
      counterpartyName: 'Test Counterparty',
      paymentPurpose: 'Test purpose',
      debit: 100,
      currency: 'KZT',
    });

    const statementWithFourTx: ParsedStatement = {
      ...parsedStatement,
      transactions: [makeTx('01'), makeTx('02'), makeTx('03'), makeTx('04')],
    };

    const mockAiContent = (transactions: Array<Record<string, unknown>>) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ transactions, notes: [] }) } }],
        }),
      } as Response);
    };

    it('keeps the original parse when the AI returns far fewer rows than were parsed', async () => {
      mockAiContent([{ date: '2026-01-01', amount: 100, counterpartyName: 'Only one' }]);

      const validator = new AiParseValidator('fake-api-key');
      const result = await validator.reconcileFromPdf('/tmp/file.pdf', statementWithFourTx);

      expect(result.corrected.transactions).toBe(statementWithFourTx.transactions);
      expect(result.notes).toEqual([
        'AI reconciliation returned 1 transactions vs 4 parsed — keeping original parse',
      ]);
    });

    it('uses the AI result when it does not undershoot the original parse', async () => {
      mockAiContent([
        { date: '2026-01-01', amount: 100, counterparty_name: 'A' },
        { date: '2026-01-02', amount: 100, counterparty_name: 'B' },
        { date: '2026-01-03', amount: 100, counterparty_name: 'C' },
        { date: '2026-01-04', amount: 100, counterparty_name: 'D' },
      ]);

      const validator = new AiParseValidator('fake-api-key');
      const result = await validator.reconcileFromPdf('/tmp/file.pdf', statementWithFourTx);

      expect(result.corrected.transactions).toHaveLength(4);
      expect(result.corrected.transactions[0].counterpartyName).toBe('A');
    });
  });
});

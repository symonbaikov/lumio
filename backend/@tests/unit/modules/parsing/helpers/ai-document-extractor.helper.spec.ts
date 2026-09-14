import { AiDocumentExtractor } from '@/modules/parsing/helpers/ai-document-extractor.helper';

const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
        documentType: 'receipt',
        transactionType: 'expense',
        totalAmount: 45.99,
        currency: 'USD',
        date: '2026-01-15',
        vendor: 'Store ABC',
        tax: 3.5,
        lineItems: [
          { description: 'Item 1', amount: 20 },
          { description: 'Item 2', amount: 22.49 },
        ],
          }),
        },
      },
    ],
  }),
} as Response);

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

describe('AiDocumentExtractor', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_BASE_URL = 'http://localhost:11434';
    process.env.AI_MODEL = 'llama3.1';
    global.fetch = mockFetch;
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.AI_BASE_URL = '';
    process.env.AI_MODEL = undefined;
  });

  it('is available when API key is provided and AI is enabled', () => {
    const extractor = new AiDocumentExtractor('fake-api-key');
    expect(extractor.isAvailable()).toBe(true);
  });

  it('is not available without an AI endpoint', () => {
    process.env.AI_BASE_URL = '';
    const extractor = new AiDocumentExtractor(undefined);
    expect(extractor.isAvailable()).toBe(false);
  });

  it('extracts parsed fields from text', async () => {
    const extractor = new AiDocumentExtractor('fake-api-key');
    const result = await extractor.extractFromText('Store ABC\nTotal: $45.99');

    expect(result).toBeTruthy();
    expect(result?.totalAmount).toBe(45.99);
    expect(result?.transactionType).toBe('expense');
    expect(result?.vendor).toBe('Store ABC');
    expect(result?.currency).toBe('USD');
    expect(mockRecordAiSuccess).toHaveBeenCalled();
  });

  it('extracts the merchant address with normalized spacing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                totalAmount: 4590,
                vendor: 'Magnum',
                merchantAddress: '  г. Алматы,\n ул. Абая   10 ',
              }),
            },
          },
        ],
      }),
    } as Response);

    const extractor = new AiDocumentExtractor('fake-api-key');
    const result = await extractor.extractFromText('Magnum\nИТОГО 4590');

    expect(result?.merchantAddress).toBe('г. Алматы, ул. Абая 10');
  });

  it('drops a merchant address that is not a string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ totalAmount: 1, merchantAddress: { street: 'Абая' } }),
            },
          },
        ],
      }),
    } as Response);

    const extractor = new AiDocumentExtractor('fake-api-key');
    const result = await extractor.extractFromText('receipt');

    expect(result?.merchantAddress).toBeUndefined();
  });

  it('returns null when circuit breaker is open', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);
    const extractor = new AiDocumentExtractor('fake-api-key');
    const result = await extractor.extractFromText('some text');

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

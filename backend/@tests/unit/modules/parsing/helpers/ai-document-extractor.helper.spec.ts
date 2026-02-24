import { AiDocumentExtractor } from '@/modules/parsing/helpers/ai-document-extractor.helper';

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    text: () =>
      JSON.stringify({
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
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
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

describe('AiDocumentExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAiEnabled.mockReturnValue(true);
    mockIsAiCircuitOpen.mockReturnValue(false);
  });

  it('is available when API key is provided and AI is enabled', () => {
    const extractor = new AiDocumentExtractor('fake-api-key');
    expect(extractor.isAvailable()).toBe(true);
  });

  it('is not available without API key', () => {
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

  it('returns null when circuit breaker is open', async () => {
    mockIsAiCircuitOpen.mockReturnValue(true);
    const extractor = new AiDocumentExtractor('fake-api-key');
    const result = await extractor.extractFromText('some text');

    expect(result).toBeNull();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});

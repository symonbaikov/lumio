import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AI_CATEGORY_BATCH_SIZE,
  AiCategoryClassifier,
} from '../../../../../src/modules/classification/helpers/ai-category-classifier.helper';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

function createAiResponse(payload: unknown) {
  return {
    response: {
      text: () => JSON.stringify(payload),
    },
  };
}

describe('AiCategoryClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PARSING_ENABLED = 'true';
    process.env.AI_TIMEOUT_MS = '100';
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '100';
  });

  afterAll(() => {
    process.env.AI_TIMEOUT_MS = undefined;
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = undefined;
    process.env.AI_PARSING_ENABLED = undefined;
  });

  it('is unavailable without API key', () => {
    const classifier = new AiCategoryClassifier(undefined);
    expect(classifier.isAvailable()).toBe(false);
    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it('returns empty result for empty transaction list', async () => {
    const classifier = new AiCategoryClassifier('test-key');

    const result = await classifier.classifyBatch([], [{ id: 'cat-1', name: 'Rent' }]);

    expect(result).toEqual({ matches: [], failedCount: 0 });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('returns high-confidence matches mapped to category ids', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      createAiResponse({
        classifications: [
          { index: 0, category: 'Rent', confidence: 0.97 },
          { index: 1, category: 'Salary', confidence: 0.93 },
        ],
      }),
    );

    const classifier = new AiCategoryClassifier('test-key');
    const result = await classifier.classifyBatch(
      [
        { index: 0, counterpartyName: 'Landlord LLC', paymentPurpose: 'Monthly rent payment' },
        { index: 1, counterpartyName: 'Employer', paymentPurpose: 'Salary for January' },
      ],
      [
        { id: 'cat-rent', name: 'Rent' },
        { id: 'cat-salary', name: 'Salary' },
      ],
    );

    expect(result.failedCount).toBe(0);
    expect(result.matches).toEqual([
      {
        index: 0,
        categoryName: 'Rent',
        categoryId: 'cat-rent',
        confidence: 0.97,
      },
      {
        index: 1,
        categoryName: 'Salary',
        categoryId: 'cat-salary',
        confidence: 0.93,
      },
    ]);
  });

  it('filters out low-confidence and unknown categories', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      createAiResponse({
        classifications: [
          { index: 0, category: 'Rent', confidence: 0.89 },
          { index: 1, category: 'UnknownCategory', confidence: 0.99 },
          { index: 2, category: 'Utilities', confidence: 0.91 },
        ],
      }),
    );

    const classifier = new AiCategoryClassifier('test-key');
    const result = await classifier.classifyBatch(
      [
        { index: 0, counterpartyName: 'Landlord', paymentPurpose: 'rent' },
        { index: 1, counterpartyName: 'Store', paymentPurpose: 'something' },
        { index: 2, counterpartyName: 'Power Co', paymentPurpose: 'electricity bill' },
      ],
      [
        { id: 'cat-rent', name: 'Rent' },
        { id: 'cat-util', name: 'Utilities' },
      ],
    );

    expect(result.matches).toEqual([
      {
        index: 2,
        categoryName: 'Utilities',
        categoryId: 'cat-util',
        confidence: 0.91,
      },
    ]);
    expect(result.failedCount).toBe(2);
  });

  it('falls back when AI returns malformed JSON content', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'not-json',
      },
    });

    const classifier = new AiCategoryClassifier('test-key');
    const result = await classifier.classifyBatch(
      [{ index: 0, counterpartyName: 'Landlord', paymentPurpose: 'rent' }],
      [{ id: 'cat-rent', name: 'Rent' }],
    );

    expect(result).toEqual({ matches: [], failedCount: 1 });
  });

  it('splits large input into multiple chunks', async () => {
    mockGenerateContent.mockResolvedValue(createAiResponse({ classifications: [] }));

    const classifier = new AiCategoryClassifier('test-key');
    const transactions = Array.from({ length: AI_CATEGORY_BATCH_SIZE + 5 }, (_, index) => ({
      index,
      counterpartyName: `Counterparty ${index}`,
      paymentPurpose: `Purpose ${index}`,
    }));

    const result = await classifier.classifyBatch(transactions, [{ id: 'cat-1', name: 'Rent' }]);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result.failedCount).toBe(transactions.length);
  });
});

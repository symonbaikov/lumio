import { OcrService } from '@/modules/parsing/services/ocr.service';

const mockRecognize = jest.fn().mockResolvedValue({
  data: {
    text: 'Store ABC\nItem 1   $10.00\nItem 2   $20.00\nTotal    $30.00',
    confidence: 85,
    blocks: [],
  },
});

const mockTerminate = jest.fn().mockResolvedValue(undefined);

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: mockRecognize,
    terminate: mockTerminate,
  }),
}));

const mockSharpChain = {
  grayscale: jest.fn().mockReturnThis(),
  normalize: jest.fn().mockReturnThis(),
  sharpen: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')), // processed image
};

jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockSharpChain),
}));

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(() => {
    service = new OcrService();
    jest.clearAllMocks();
  });

  describe('isImageFile', () => {
    it('returns true for PNG', () => {
      expect(service.isImageFile('receipt.png')).toBe(true);
    });

    it('returns true for JPG', () => {
      expect(service.isImageFile('receipt.jpg')).toBe(true);
    });

    it('returns true for JPEG', () => {
      expect(service.isImageFile('receipt.jpeg')).toBe(true);
    });

    it('returns false for PDF', () => {
      expect(service.isImageFile('receipt.pdf')).toBe(false);
    });

    it('returns false for CSV', () => {
      expect(service.isImageFile('data.csv')).toBe(false);
    });
  });

  describe('extractTextFromImage', () => {
    it('extracts text from image buffer', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractTextFromImage(buffer);

      expect(result.text).toContain('Store ABC');
      expect(result.text).toContain('Total');
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockTerminate).toHaveBeenCalled();
    });

    it('preprocesses image when enabled', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractTextFromImage(buffer, { preprocess: true });

      expect(result.text).toBeTruthy();
      expect(result.preprocessed).toBe(true);
      expect(mockSharpChain.grayscale).toHaveBeenCalled();
      expect(mockSharpChain.normalize).toHaveBeenCalled();
      expect(mockSharpChain.sharpen).toHaveBeenCalled();
    });

    it('skips preprocessing when disabled', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractTextFromImage(buffer, { preprocess: false });

      expect(result.preprocessed).toBe(false);
      expect(mockSharpChain.grayscale).not.toHaveBeenCalled();
    });
  });

  describe('getSupportedImageExtensions', () => {
    it('returns supported extensions', () => {
      const extensions = service.getSupportedImageExtensions();

      expect(extensions).toContain('.png');
      expect(extensions).toContain('.jpg');
      expect(extensions).toContain('.jpeg');
      expect(extensions).toContain('.tiff');
      expect(extensions).toContain('.webp');
      expect(extensions).toContain('.bmp');
    });
  });
});

import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';

export interface OcrResult {
  text: string;
  confidence: number;
  language?: string;
  preprocessed: boolean;
}

export interface OcrOptions {
  languages?: string[];
  preprocess?: boolean;
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.tiff',
  '.tif',
  '.bmp',
  '.webp',
]);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
  }

  getSupportedImageExtensions(): string[] {
    return Array.from(SUPPORTED_IMAGE_EXTENSIONS);
  }

  async extractTextFromImage(imageBuffer: Buffer, options: OcrOptions = {}): Promise<OcrResult> {
    const { languages = ['eng', 'rus'], preprocess = true } = options;

    let processedBuffer = imageBuffer;
    if (preprocess) {
      processedBuffer = await this.preprocessImage(imageBuffer);
    }

    const { createWorker } = await import('tesseract.js');
    const langString = languages.join('+');
    const worker = await createWorker(langString);

    try {
      const { data } = await worker.recognize(processedBuffer);
      const text = (data?.text || '').trim();
      const confidence = (data?.confidence || 0) / 100;

      this.logger.debug(
        `OCR extracted ${text.length} chars with confidence ${confidence.toFixed(2)} (${langString})`,
      );

      return {
        text,
        confidence,
        language: langString,
        preprocessed: preprocess,
      };
    } finally {
      await worker.terminate();
    }
  }

  async extractTextFromScannedPdf(pdfBuffer: Buffer, options: OcrOptions = {}): Promise<OcrResult> {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(pdfBuffer);
    const existingText = (data.text || '').trim();

    if (existingText.length > 100) {
      return {
        text: existingText,
        confidence: 0.95,
        preprocessed: false,
      };
    }

    this.logger.debug('PDF has minimal text; trying OCR fallback path');

    try {
      return await this.extractTextFromImage(pdfBuffer, options);
    } catch (error) {
      this.logger.warn('OCR fallback for scanned PDF failed', error);

      return {
        text: existingText,
        confidence: 0.3,
        preprocessed: false,
      };
    }
  }

  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      const sharp = (await import('sharp')).default;

      return await sharp(buffer).grayscale().normalize().sharpen({ sigma: 1.5 }).toBuffer();
    } catch (error) {
      this.logger.warn('Image preprocessing failed; using original image', error);
      return buffer;
    }
  }
}

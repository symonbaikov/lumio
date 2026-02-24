import { BadRequestException } from '@nestjs/common';

export enum AllowedFileType {
  PDF = 'application/pdf',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS = 'application/vnd.ms-excel',
  CSV = 'text/csv',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JPG = 'image/jpeg',
  PNG = 'image/png',
  TIFF = 'image/tiff',
  BMP = 'image/bmp',
  WEBP = 'image/webp',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  // Check file type
  const allowedTypes = Object.values(AllowedFileType);
  if (!allowedTypes.includes(file.mimetype as AllowedFileType)) {
    throw new BadRequestException(
      `File type ${file.mimetype} is not allowed. Allowed types: PDF, XLSX, XLS, CSV, DOCX, JPG, PNG, TIFF, BMP, WEBP`,
    );
  }
}

export function getFileTypeFromMime(mimetype: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xlsx',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/tiff': 'image',
    'image/bmp': 'image',
    'image/webp': 'image',
  };

  return typeMap[mimetype] || 'unknown';
}

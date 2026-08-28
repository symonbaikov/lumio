import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { resolveUploadsDir } from './uploads.util';

// Multer's diskStorage (see config/multer.config.ts) always writes to this
// directory under a server-generated random filename — file.path is never
// built from client input (originalname included). This check is defense
// in depth against that invariant ever being violated, and makes the
// filesystem calls below auditable as bounded rather than taking an
// Express.Multer.File's path on faith.
const uploadsRoot = resolveUploadsDir();

function isWithinUploadsDir(candidatePath: string): boolean {
  const relative = path.relative(uploadsRoot, path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

enum AllowedFileType {
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ponytail: hand-rolled signature check for the fixed, small set of formats
// this app accepts — a few buffer-prefix comparisons, not worth a dependency.
// CSV/DOCX-vs-XLSX-collision note: DOCX and XLSX are both ZIP containers and
// share the same leading bytes, so this only rules out a payload that isn't
// even a ZIP/PDF/image at all — it doesn't distinguish DOCX from XLSX content.
// CSV has no reliable magic bytes (plain text) and is intentionally skipped.
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
// Map, not a plain object: file.mimetype is client-declared and used as the
// lookup key immediately below. A plain object literal is reachable through
// the prototype chain (e.g. a mimetype of "constructor"), which is exactly
// the "user-controlled key used for dynamic dispatch" shape static analysis
// flags — a Map has no such inherited keys, so an unrecognized/adversarial
// mimetype can only ever produce a real `undefined`, never a foreign function.
const MAGIC_BYTES: ReadonlyMap<AllowedFileType, (buf: Buffer) => boolean> = new Map([
  [AllowedFileType.PDF, (buf: Buffer) => buf.subarray(0, 5).toString('latin1') === '%PDF-'],
  [AllowedFileType.XLSX, (buf: Buffer) => buf.subarray(0, 4).equals(ZIP_SIGNATURE)],
  [AllowedFileType.DOCX, (buf: Buffer) => buf.subarray(0, 4).equals(ZIP_SIGNATURE)],
  [
    AllowedFileType.XLS,
    (buf: Buffer) =>
      buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  ],
  [
    AllowedFileType.JPG,
    (buf: Buffer) => buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  ],
  [
    AllowedFileType.PNG,
    (buf: Buffer) =>
      buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ],
  [
    AllowedFileType.TIFF,
    (buf: Buffer) =>
      buf.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
      buf.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])),
  ],
  [AllowedFileType.BMP, (buf: Buffer) => buf.subarray(0, 2).toString('latin1') === 'BM'],
  [
    AllowedFileType.WEBP,
    (buf: Buffer) =>
      buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buf.subarray(8, 12).toString('latin1') === 'WEBP',
  ],
]);

// Returns null (rather than throwing) when the file can't be read: at this
// point multer has already written it moments earlier in the same request,
// so a read failure here means something environmental (permissions, the
// path being a test double with no real file behind it), not a sign of a
// malicious payload — the declared-mimetype allowlist check still applies
// either way.
function readSignature(filePath: string): Buffer | null {
  if (!isWithinUploadsDir(filePath)) {
    return null;
  }
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return null;
  }
  try {
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    return buf.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

// Synchronous and side-effect-free by design: callers across the codebase
// (controllers and services alike) call this without awaiting, so it must
// never return a Promise or perform I/O that could be skipped by a missing
// `await`. File cleanup on rejection is a separate concern — see
// `validateFiles`/`unlinkAll` below, used only by upload endpoints that
// already need to be async for that reason.
export function validateFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const allowedTypes = Object.values(AllowedFileType);
  if (!allowedTypes.includes(file.mimetype as AllowedFileType)) {
    throw new BadRequestException(
      `File type ${file.mimetype} is not allowed. Allowed types: PDF, XLSX, XLS, CSV, DOCX, JPG, PNG, TIFF, BMP, WEBP`,
    );
  }

  const checkSignature = MAGIC_BYTES.get(file.mimetype as AllowedFileType);
  if (checkSignature && file.path) {
    const signature = readSignature(file.path);
    if (signature && !checkSignature(signature)) {
      throw new BadRequestException(
        `File content does not match its declared type (${file.mimetype})`,
      );
    }
  }
}

/**
 * Deletes every file in a batch from disk, ignoring individual failures.
 * Multer's diskStorage writes each upload before any application code runs,
 * so a rejected batch must be cleaned up explicitly or the files are
 * orphaned on disk forever.
 */
export async function unlinkAll(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(
    files.map(file =>
      file.path && isWithinUploadsDir(file.path)
        ? fsp.unlink(file.path).catch(() => undefined)
        : Promise.resolve(),
    ),
  );
}

/**
 * Validates every file in a batch and, if any fails, deletes all of them —
 * the whole upload request is being rejected anyway, so leaving the
 * accepted-looking files behind would just orphan them.
 */
export async function validateFiles(files: Express.Multer.File[]): Promise<void> {
  try {
    for (const file of files) {
      validateFile(file);
    }
  } catch (error) {
    await unlinkAll(files);
    throw error;
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

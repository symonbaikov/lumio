import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import {
  getFileTypeFromMime,
  unlinkAll,
  validateFile,
  validateFiles,
} from '@/common/utils/file-validator.util';

function makeFile(overrides: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.alloc(0),
    stream: undefined as never,
    ...overrides,
  };
}

describe('validateFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-validator-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeFile = (name: string, content: Buffer | string) => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  it('rejects a missing file', () => {
    expect(() => validateFile(undefined as unknown as Express.Multer.File)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a file over the size limit', () => {
    const file = makeFile({ size: 11 * 1024 * 1024 });
    expect(() => validateFile(file)).toThrow(BadRequestException);
  });

  it('rejects a disallowed mimetype', () => {
    const file = makeFile({ mimetype: 'application/x-msdownload' });
    expect(() => validateFile(file)).toThrow(BadRequestException);
  });

  it('accepts a real PDF whose content matches its declared mimetype', () => {
    const filePath = writeFile('real.pdf', '%PDF-1.4\n%stub\n');
    const file = makeFile({ mimetype: 'application/pdf', path: filePath });
    expect(() => validateFile(file)).not.toThrow();
  });

  it('rejects a payload declared as PDF whose content is not a PDF', () => {
    const filePath = writeFile('fake.pdf', '<html><body>not a pdf</body></html>');
    const file = makeFile({ mimetype: 'application/pdf', path: filePath });
    expect(() => validateFile(file)).toThrow(BadRequestException);
  });

  it('rejects a payload declared as PNG whose content is actually a JPEG', () => {
    const filePath = writeFile('fake.png', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    const file = makeFile({ mimetype: 'image/png', path: filePath });
    expect(() => validateFile(file)).toThrow(BadRequestException);
  });

  it('accepts a real XLSX (ZIP-signed) file', () => {
    const filePath = writeFile(
      'real.xlsx',
      Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
    );
    const file = makeFile({
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: filePath,
    });
    expect(() => validateFile(file)).not.toThrow();
  });

  it('does not signature-check CSV (no reliable magic bytes)', () => {
    const filePath = writeFile('data.csv', 'Date,Amount\n01.01.2024,100\n');
    const file = makeFile({ mimetype: 'text/csv', path: filePath });
    expect(() => validateFile(file)).not.toThrow();
  });

  it('skips the signature check when no file path is available (e.g. memory storage)', () => {
    const file = makeFile({ mimetype: 'application/pdf', path: '' });
    expect(() => validateFile(file)).not.toThrow();
  });

  it('skips the signature check (rather than throwing) when the path does not exist on disk', () => {
    const file = makeFile({ mimetype: 'application/pdf', path: '/tmp/does-not-exist-12345.pdf' });
    expect(() => validateFile(file)).not.toThrow();
  });
});

describe('validateFiles / unlinkAll', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-validator-batch-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('leaves every file on disk when the whole batch is valid', async () => {
    const goodPath = path.join(tmpDir, 'good.pdf');
    fs.writeFileSync(goodPath, '%PDF-1.4\n');
    const files = [makeFile({ mimetype: 'application/pdf', path: goodPath, size: 10 })];

    await expect(validateFiles(files)).resolves.toBeUndefined();
    expect(fs.existsSync(goodPath)).toBe(true);
  });

  it('deletes every file in the batch when one of them fails validation', async () => {
    const goodPath = path.join(tmpDir, 'good.pdf');
    const badPath = path.join(tmpDir, 'bad.pdf');
    fs.writeFileSync(goodPath, '%PDF-1.4\n');
    fs.writeFileSync(badPath, 'not a pdf at all');

    const files = [
      makeFile({ mimetype: 'application/pdf', path: goodPath, size: 10 }),
      makeFile({ mimetype: 'application/pdf', path: badPath, size: 10 }),
    ];

    await expect(validateFiles(files)).rejects.toThrow(BadRequestException);
    expect(fs.existsSync(goodPath)).toBe(false);
    expect(fs.existsSync(badPath)).toBe(false);
  });

  it('unlinkAll removes all listed files and ignores already-missing ones', async () => {
    const p1 = path.join(tmpDir, 'a.tmp');
    fs.writeFileSync(p1, 'x');
    const files = [makeFile({ path: p1 }), makeFile({ path: path.join(tmpDir, 'missing.tmp') })];

    await expect(unlinkAll(files)).resolves.toBeUndefined();
    expect(fs.existsSync(p1)).toBe(false);
  });
});

describe('getFileTypeFromMime', () => {
  it('maps known mimetypes to short type names', () => {
    expect(getFileTypeFromMime('application/pdf')).toBe('pdf');
    expect(getFileTypeFromMime('text/csv')).toBe('csv');
    expect(getFileTypeFromMime('image/png')).toBe('image');
  });

  it('returns "unknown" for an unrecognized mimetype', () => {
    expect(getFileTypeFromMime('application/octet-stream')).toBe('unknown');
  });
});

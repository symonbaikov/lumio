import exifr from 'exifr';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { toCaptureLocation } from '@/common/utils/capture-location.util';
import { readExifGps } from '@/common/utils/exif-gps.util';
import { UploadReceiptScanDto } from '@/modules/statements/dto/upload-receipt-scan.dto';

jest.mock('exifr', () => ({ __esModule: true, default: { gps: jest.fn() } }));

const gpsMock = exifr.gps as jest.Mock;

describe('toCaptureLocation', () => {
  it('rounds the point to about a metre and the accuracy to whole metres', () => {
    expect(toCaptureLocation({ latitude: 43.238312345, longitude: 76.945398765, accuracy: 24.6 }))
      .toEqual({ lat: 43.23831, lng: 76.9454, accuracyM: 25 });
  });

  it('omits accuracy when the client did not send it', () => {
    expect(toCaptureLocation({ latitude: 1, longitude: 2 })).toEqual({ lat: 1, lng: 2 });
  });

  it('treats half a point as no point', () => {
    expect(toCaptureLocation({ latitude: 43.2 })).toBeUndefined();
    expect(toCaptureLocation({})).toBeUndefined();
    expect(toCaptureLocation(undefined)).toBeUndefined();
  });

  it('rejects out-of-range coordinates', () => {
    expect(toCaptureLocation({ latitude: 91, longitude: 0 })).toBeUndefined();
  });
});

describe('capture location multipart fields', () => {
  it('coerces string fields to numbers', async () => {
    const dto = plainToInstance(UploadReceiptScanDto, {
      latitude: '43.2383',
      longitude: '76.9453',
      accuracy: '12',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.latitude).toBe(43.2383);
  });

  it('rejects a latitude beyond the pole', async () => {
    const dto = plainToInstance(UploadReceiptScanDto, { latitude: '91', longitude: '0' });

    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(['latitude']);
  });
});

describe('readExifGps', () => {
  beforeEach(() => gpsMock.mockReset());

  it('returns the rounded GPS tag of the photo', async () => {
    gpsMock.mockResolvedValue({ latitude: 43.238312345, longitude: 76.945398765 });

    await expect(readExifGps(Buffer.from('jpeg'))).resolves.toEqual({
      lat: 43.23831,
      lng: 76.9454,
    });
  });

  it('returns null when the photo has no GPS tag', async () => {
    gpsMock.mockResolvedValue(undefined);

    await expect(readExifGps(Buffer.from('jpeg'))).resolves.toBeNull();
  });

  it('ignores the 0,0 placeholder cameras write without a fix', async () => {
    gpsMock.mockResolvedValue({ latitude: 0, longitude: 0 });

    await expect(readExifGps(Buffer.from('jpeg'))).resolves.toBeNull();
  });

  it('returns null on unreadable files', async () => {
    gpsMock.mockRejectedValue(new Error('Unknown file format'));

    await expect(readExifGps(Buffer.from('not an image'))).resolves.toBeNull();
  });
});

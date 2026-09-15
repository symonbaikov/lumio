import { Receipt, ReceiptLocationSource } from '@/entities/receipt.entity';
import type { GeocodingService } from '@/modules/geocoding/geocoding.service';
import { ReceiptLocationService } from '@/modules/receipts/services/receipt-location.service';
import { createRepoMock } from '../../../helpers/create-repo-mock';

const buildReceipt = (overrides: Partial<Receipt> = {}): Receipt =>
  ({
    id: 'receipt-1',
    workspaceId: 'ws-1',
    metadata: {},
    parsedData: {},
    locationLat: null,
    locationLng: null,
    locationSource: null,
    locationAccuracyM: null,
    locationUpdatedAt: null,
    ...overrides,
  }) as Receipt;

describe('ReceiptLocationService', () => {
  let repository: ReturnType<typeof createRepoMock<Receipt>>;
  let geocode: jest.Mock;
  let service: ReceiptLocationService;

  beforeEach(() => {
    repository = createRepoMock<Receipt>();
    repository.save.mockImplementation(async (receipt: Receipt) => receipt);
    geocode = jest.fn().mockResolvedValue(null);
    service = new ReceiptLocationService(
      repository as never,
      { geocode } as unknown as GeocodingService,
    );
  });

  describe('applyAutoLocation', () => {
    it('never moves a point the user placed', async () => {
      geocode.mockResolvedValue({ lat: 43.2383, lng: 76.9453 });
      const updatedAt = new Date('2026-09-01T00:00:00Z');
      const receipt = buildReceipt({
        parsedData: { merchantAddress: 'г. Алматы, ул. Абая 10' },
        locationLat: 51.1,
        locationLng: 71.4,
        locationSource: ReceiptLocationSource.MANUAL,
        locationUpdatedAt: updatedAt,
      });

      await service.applyAutoLocation(receipt);

      expect(geocode).not.toHaveBeenCalled();
      expect(receipt).toMatchObject({
        locationLat: 51.1,
        locationLng: 71.4,
        locationSource: ReceiptLocationSource.MANUAL,
        locationUpdatedAt: updatedAt,
      });
    });

    it('prefers the geocoded merchant address over the capture point', async () => {
      geocode.mockResolvedValue({ lat: 43.2383, lng: 76.9453 });
      const receipt = buildReceipt({
        parsedData: { merchantAddress: 'г. Алматы, ул. Абая 10' },
        metadata: {
          captureLocation: {
            lat: 43.3,
            lng: 76.8,
            accuracyM: 20,
            source: 'device',
            capturedAt: '2026-09-13T10:00:00Z',
          },
        },
      });

      await service.applyAutoLocation(receipt);

      expect(geocode).toHaveBeenCalledWith('г. Алматы, ул. Абая 10');
      expect(receipt).toMatchObject({
        locationLat: 43.2383,
        locationLng: 76.9453,
        locationSource: ReceiptLocationSource.MERCHANT_ADDRESS,
        locationAccuracyM: null,
      });
      expect(receipt.locationUpdatedAt).toBeInstanceOf(Date);
    });

    it('falls back to the photo GPS when the address does not geocode', async () => {
      const receipt = buildReceipt({
        parsedData: { merchantAddress: 'somewhere 1' },
        metadata: {
          captureLocation: { lat: 43.3, lng: 76.8, source: 'exif', capturedAt: '2026-09-13' },
        },
      });

      await service.applyAutoLocation(receipt);

      expect(receipt).toMatchObject({
        locationLat: 43.3,
        locationLng: 76.8,
        locationSource: ReceiptLocationSource.EXIF,
        locationAccuracyM: null,
      });
    });

    it('uses the device point with its accuracy when nothing better exists', async () => {
      const receipt = buildReceipt({
        metadata: {
          captureLocation: {
            lat: 43.3,
            lng: 76.8,
            accuracyM: 35,
            source: 'device',
            capturedAt: '2026-09-13',
          },
        },
      });

      await service.applyAutoLocation(receipt);

      expect(geocode).not.toHaveBeenCalled();
      expect(receipt).toMatchObject({
        locationSource: ReceiptLocationSource.DEVICE,
        locationAccuracyM: 35,
      });
    });

    it('clears a stale automatic point when no source is left', async () => {
      const receipt = buildReceipt({
        locationLat: 43.3,
        locationLng: 76.8,
        locationSource: ReceiptLocationSource.DEVICE,
        locationAccuracyM: 35,
      });

      await service.applyAutoLocation(receipt);

      expect(receipt).toMatchObject({
        locationLat: null,
        locationLng: null,
        locationSource: null,
        locationAccuracyM: null,
      });
      expect(receipt.locationUpdatedAt).toBeInstanceOf(Date);
    });

    it('keeps the timestamp when the point did not change', async () => {
      geocode.mockResolvedValue({ lat: 43.2383, lng: 76.9453 });
      const updatedAt = new Date('2026-09-01T00:00:00Z');
      const receipt = buildReceipt({
        parsedData: { merchantAddress: 'г. Алматы, ул. Абая 10' },
        locationLat: 43.2383,
        locationLng: 76.9453,
        locationSource: ReceiptLocationSource.MERCHANT_ADDRESS,
        locationUpdatedAt: updatedAt,
      });

      await service.applyAutoLocation(receipt);

      expect(receipt.locationUpdatedAt).toBe(updatedAt);
    });
  });

  describe('setManual', () => {
    it('pins a rounded point inside the caller workspace', async () => {
      repository.findOne.mockResolvedValue(buildReceipt());

      const saved = await service.setManual('receipt-1', 'ws-1', {
        latitude: 43.238312345,
        longitude: 76.945398765,
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'receipt-1', workspaceId: 'ws-1' },
      });
      expect(saved).toMatchObject({
        locationLat: 43.23831,
        locationLng: 76.9454,
        locationSource: ReceiptLocationSource.MANUAL,
        locationAccuracyM: null,
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('returns null for a receipt from another workspace', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.setManual('receipt-1', 'ws-other', { latitude: 1, longitude: 2 }),
      ).resolves.toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('resetToAuto', () => {
    it('drops the manual point and recomputes from stored data', async () => {
      repository.findOne.mockResolvedValue(
        buildReceipt({
          locationLat: 51.1,
          locationLng: 71.4,
          locationSource: ReceiptLocationSource.MANUAL,
          metadata: {
            captureLocation: { lat: 43.3, lng: 76.8, source: 'device', capturedAt: '2026-09-13' },
          },
        }),
      );

      const saved = await service.resetToAuto('receipt-1', 'ws-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'receipt-1', workspaceId: 'ws-1' },
      });
      expect(saved).toMatchObject({
        locationLat: 43.3,
        locationLng: 76.8,
        locationSource: ReceiptLocationSource.DEVICE,
      });
    });

    it('returns null when the receipt is not in the workspace', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.resetToAuto('receipt-1', 'ws-other')).resolves.toBeNull();
    });
  });
});

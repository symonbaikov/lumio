import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isValidCoordinatePair,
  roundCoordinate,
} from '../../../common/utils/capture-location.util';
import { Receipt, ReceiptLocationSource } from '../../../entities/receipt.entity';
import { GeocodingService } from '../../geocoding/geocoding.service';

type ResolvedLocation = {
  lat: number;
  lng: number;
  source: ReceiptLocationSource;
  accuracyM: number | null;
};

@Injectable()
export class ReceiptLocationService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * Resolves the point from what the receipt already carries. Mutates the
   * entity; the caller saves it. A point the user placed is never replaced.
   */
  async applyAutoLocation(receipt: Receipt): Promise<void> {
    if (receipt.locationSource === ReceiptLocationSource.MANUAL) {
      return;
    }

    this.assign(receipt, await this.resolveAutoLocation(receipt));
  }

  async setManual(
    id: string,
    workspaceId: string,
    point: { latitude: number; longitude: number },
  ): Promise<Receipt | null> {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });
    if (!receipt) {
      return null;
    }

    this.assign(receipt, {
      lat: roundCoordinate(point.latitude),
      lng: roundCoordinate(point.longitude),
      source: ReceiptLocationSource.MANUAL,
      accuracyM: null,
    });
    return this.receiptRepository.save(receipt);
  }

  async resetToAuto(id: string, workspaceId: string): Promise<Receipt | null> {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });
    if (!receipt) {
      return null;
    }

    this.assign(receipt, await this.resolveAutoLocation(receipt));
    return this.receiptRepository.save(receipt);
  }

  // Store address first: it answers "where was this bought". The photo and the
  // device only say where the receipt was scanned, which may well be at home.
  private async resolveAutoLocation(receipt: Receipt): Promise<ResolvedLocation | null> {
    const address = receipt.parsedData?.merchantAddress;
    if (address) {
      const point = await this.geocodingService.geocode(address);
      if (point) {
        return { ...point, source: ReceiptLocationSource.MERCHANT_ADDRESS, accuracyM: null };
      }
    }

    const capture = receipt.metadata?.captureLocation;
    if (capture && isValidCoordinatePair(capture.lat, capture.lng)) {
      return {
        lat: capture.lat,
        lng: capture.lng,
        source:
          capture.source === 'exif' ? ReceiptLocationSource.EXIF : ReceiptLocationSource.DEVICE,
        accuracyM: capture.accuracyM ?? null,
      };
    }

    return null;
  }

  private assign(receipt: Receipt, next: ResolvedLocation | null): void {
    const lat = next?.lat ?? null;
    const lng = next?.lng ?? null;
    const source = next?.source ?? null;
    const changed =
      (receipt.locationLat ?? null) !== lat ||
      (receipt.locationLng ?? null) !== lng ||
      (receipt.locationSource ?? null) !== source;

    receipt.locationLat = lat;
    receipt.locationLng = lng;
    receipt.locationSource = source;
    receipt.locationAccuracyM = next?.accuracyM ?? null;
    if (changed) {
      receipt.locationUpdatedAt = new Date();
    }
  }
}

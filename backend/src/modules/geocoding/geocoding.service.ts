import { createHash } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { isValidCoordinatePair } from '../../common/utils/capture-location.util';

export type GeoPoint = { lat: number; lng: number };

type CachedGeocode = GeoPoint | { miss: true };

const DEFAULT_TIMEOUT_MS = 3000;
const HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_ADDRESS_LENGTH = 5;

/**
 * Address → point through a self-hosted Nominatim. Optional: with no
 * GEOCODER_URL every call returns null and receipts fall back to the photo or
 * device location. Never throws, and never logs the address it was given.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly baseUrl: string | null;
  private readonly timeoutMs: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    configService: ConfigService,
  ) {
    this.baseUrl = this.resolveBaseUrl(configService.get<string>('GEOCODER_URL'));
    const timeout = Number(configService.get<string>('GEOCODER_TIMEOUT_MS'));
    this.timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  }

  async geocode(address: string): Promise<GeoPoint | null> {
    if (!this.baseUrl) {
      return null;
    }

    const normalized = address.replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.length < MIN_ADDRESS_LENGTH) {
      return null;
    }

    // Hashed so plaintext addresses never sit in Redis key listings.
    const cacheKey = `geocode:v1:${createHash('sha256').update(normalized).digest('hex')}`;
    const cached = await this.readCache(cacheKey);
    if (cached) {
      return 'miss' in cached ? null : cached;
    }

    const result = await this.request(normalized);
    // Only a definite "no match" is remembered. A timeout or 5xx says nothing
    // about the address, and caching it would hide every receipt for a day.
    if (result !== 'error') {
      await this.writeCache(cacheKey, result ?? { miss: true }, result ? HIT_TTL_MS : MISS_TTL_MS);
    }
    return result === 'error' ? null : result;
  }

  private async request(query: string): Promise<GeoPoint | null | 'error'> {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' });

    try {
      // Plain fetch rather than fetchPublicUrl: the host comes from operator
      // config, never from a user, and a self-hosted geocoder sits on a private
      // Docker address that the SSRF guard would reject.
      const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Lumio' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        this.logger.warn(`Geocoding request failed: http_${response.status}`);
        return 'error';
      }

      const body = (await response.json()) as unknown;
      const first = Array.isArray(body) ? (body[0] as { lat?: unknown; lon?: unknown }) : null;
      if (!first) {
        return null;
      }

      const lat = Number(first.lat);
      const lng = Number(first.lon);
      return isValidCoordinatePair(lat, lng) ? { lat, lng } : null;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const reason = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network';
      this.logger.warn(`Geocoding request failed: ${reason}`);
      return 'error';
    }
  }

  private async readCache(key: string): Promise<CachedGeocode | null> {
    try {
      return (await this.cacheManager.get<CachedGeocode>(key)) ?? null;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: CachedGeocode, ttlMs: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs);
    } catch {
      // A cache outage only costs a repeated lookup.
    }
  }

  private resolveBaseUrl(raw: string | undefined): string | null {
    const value = raw?.trim();
    if (!value) {
      return null;
    }

    try {
      const { protocol } = new URL(value);
      if (protocol === 'http:' || protocol === 'https:') {
        return value.replace(/\/+$/, '');
      }
    } catch {
      // fall through to the warning below
    }

    this.logger.warn('GEOCODER_URL is not a valid http(s) URL; geocoding is disabled');
    return null;
  }
}

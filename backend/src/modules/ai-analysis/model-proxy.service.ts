import { createWriteStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ALLOWED_MODEL_IDS,
  MODEL_ASSET_KINDS,
  type ModelAssetKind,
  UPSTREAM_ORIGIN,
  expectedPathPrefix,
} from './model-proxy.constants';

export interface ResolvedAsset {
  /** Absolute path of the cached file, once it exists. */
  cachePath: string;
  upstreamUrl: string;
}

@Injectable()
export class ModelProxyService {
  private readonly logger = new Logger(ModelProxyService.name);

  /**
   * Validates the request and derives both the upstream URL and the cache path.
   * Throws NotFoundException for anything not explicitly allowed, so callers
   * cannot distinguish "unknown model" from "forbidden path" — and, critically,
   * no outbound request is made for a rejected request.
   */
  resolve(modelId: string, kind: string, remainderSegments: string[]): ResolvedAsset {
    if (!ALLOWED_MODEL_IDS.includes(modelId)) {
      throw new NotFoundException('Unknown model');
    }
    if (!MODEL_ASSET_KINDS.includes(kind as ModelAssetKind)) {
      throw new NotFoundException('Unknown asset kind');
    }

    const assetKind = kind as ModelAssetKind;
    const remainder = this.safeRelativePath(remainderSegments);

    if (!remainder.startsWith(expectedPathPrefix(assetKind, modelId))) {
      throw new NotFoundException('Asset is not part of this model');
    }

    return {
      cachePath: path.join(this.cacheRoot(), modelId, assetKind, remainder),
      upstreamUrl: `${UPSTREAM_ORIGIN[assetKind]}/${remainder}`,
    };
  }

  /**
   * Rejects traversal, absolute paths, and anything that normalises outside the
   * cache directory. Segments arrive already percent-decoded by the router, so
   * encoded traversal is covered by the same check.
   */
  private safeRelativePath(segments: string[]): string {
    if (segments.length === 0) {
      throw new NotFoundException('Empty asset path');
    }

    for (const segment of segments) {
      if (
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('\0') ||
        segment.includes('/') ||
        segment.includes('\\') ||
        path.isAbsolute(segment)
      ) {
        throw new NotFoundException('Invalid asset path');
      }
    }

    const joined = segments.join('/');
    if (path.posix.normalize(joined) !== joined) {
      throw new NotFoundException('Invalid asset path');
    }

    return joined;
  }

  cacheRoot(): string {
    return process.env.AI_MODEL_CACHE_ROOT || path.join(process.cwd(), '.local-models', 'llm');
  }

  async cachedSize(cachePath: string): Promise<number | null> {
    try {
      const stat = await fs.stat(cachePath);
      return stat.isFile() ? stat.size : null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches from upstream without following redirects off the allowed origin.
   * Returns the response so the caller can stream it to the client while
   * `cacheStream` writes the same bytes to disk.
   */
  async fetchUpstream(upstreamUrl: string): Promise<Response> {
    const response = await fetch(upstreamUrl, { redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      const target = location ? new URL(location, upstreamUrl) : null;
      const originAllowed =
        target !== null && Object.values(UPSTREAM_ORIGIN).includes(target.origin);

      if (!(target && originAllowed)) {
        this.logger.warn({
          type: 'model_proxy_redirect_blocked',
          upstreamUrl,
          location,
        });
        throw new NotFoundException('Asset unavailable');
      }

      return this.fetchUpstream(target.toString());
    }

    if (!response.ok) {
      throw new NotFoundException('Asset unavailable');
    }

    return response;
  }

  /**
   * Writes a stream to the cache via a temp file so a killed request never
   * leaves a truncated file that a later request would serve as complete.
   */
  async cacheStream(cachePath: string, body: ReadableStream<Uint8Array>): Promise<void> {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const tempPath = `${cachePath}.${process.pid}.part`;

    try {
      await pipeline(Readable.fromWeb(body as never), createWriteStream(tempPath));
      await fs.rename(tempPath, cachePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true });
      throw error;
    }
  }
}

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModelProxyService } from './model-proxy.service';

/**
 * Serves local-LLM weights and wasm to the browser.
 *
 * The response body is model data, not tenant data, but the route stays behind
 * the auth guard so the deployment is not an open proxy for anyone on the network.
 */
@Controller('ai-analysis/models')
@UseGuards(JwtAuthGuard)
export class ModelProxyController {
  constructor(private readonly modelProxyService: ModelProxyService) {}

  @Get(':modelId/:kind/*path')
  async getAsset(
    @Param('modelId') modelId: string,
    @Param('kind') kind: string,
    @Param('path') remainder: string[] | string,
    @Res() res: Response,
  ): Promise<void> {
    const segments = Array.isArray(remainder) ? remainder : [remainder];
    const { cachePath, upstreamUrl } = this.modelProxyService.resolve(modelId, kind, segments);

    // A cached file is served by Express so Range, ETag and conditional
    // requests work without reimplementing them here.
    if ((await this.modelProxyService.cachedSize(cachePath)) !== null) {
      res.sendFile(cachePath);
      return;
    }

    const upstream = await this.modelProxyService.fetchUpstream(upstreamUrl);
    if (!upstream.body) {
      res.status(502).end();
      return;
    }

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      // Without this the browser cannot show download progress.
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/octet-stream',
    );

    // One copy to the client, one to disk, so the next user of this deployment
    // does not hit the upstream at all.
    const [toClient, toCache] = upstream.body.tee();

    const cacheWrite = this.modelProxyService
      .cacheStream(cachePath, toCache)
      .catch(() => undefined);

    await pipeline(Readable.fromWeb(toClient as never), res);
    await cacheWrite;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomUUID } from 'node:crypto';
import { WebhookDelivery, WebhookDeliveryStatus } from '../../../entities/webhook-delivery.entity';
import { WebhookSubscription } from '../../../entities/webhook-subscription.entity';

const LOCK_ID = `processor-${process.env.RAILWAY_SERVICE_INSTANCE_ID ?? process.env.HOSTNAME ?? randomUUID()}`;
const HTTP_TIMEOUT_MS = parseInt(process.env.WEBHOOK_HTTP_TIMEOUT_MS ?? '10000', 10);

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private running = false;

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectRepository(WebhookSubscription)
    private readonly subRepo: Repository<WebhookSubscription>,
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const delivery = await this.claimNextDelivery();
      if (delivery) await this.processDelivery(delivery);
    } catch (err) {
      this.logger.warn(`Webhook processor tick failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.running = false;
    }
  }

  private async claimNextDelivery(): Promise<WebhookDelivery | null> {
    const result = await this.deliveryRepo.query(`
      UPDATE webhook_deliveries
      SET status = 'processing', locked_at = now(), locked_by = $1
      WHERE id = (
        SELECT id FROM webhook_deliveries
        WHERE (
          status IN ('pending', 'failed')
          AND attempt_count < max_attempts
          AND (next_attempt_at IS NULL OR next_attempt_at <= now())
        )
        OR (
          status = 'processing'
          AND locked_at < now() - interval '15 minutes'
        )
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [LOCK_ID]);
    return result[0]?.[0] ?? null;
  }

  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { id: delivery.subscriptionId } });
    if (!sub || !sub.isActive) {
      await this.deliveryRepo.save({
        ...delivery,
        status: WebhookDeliveryStatus.EXHAUSTED,
        lastError: sub ? 'Subscription is inactive' : 'Subscription not found',
      });
      return;
    }

    const payloadStr = JSON.stringify(delivery.payload);
    const signature = this.buildSignature(sub.secret, payloadStr);

    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      try {
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Lumio-Signature': signature,
            'X-Lumio-Event': delivery.event,
            'X-Lumio-Delivery': delivery.id,
          },
          body: payloadStr,
          signal: controller.signal,
        });
        responseCode = res.status;
        responseBody = (await res.text()).slice(0, 4096);
        success = res.status >= 200 && res.status < 300;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: any) {
      error = err?.message ?? String(err);
    }

    const attemptCount = delivery.attemptCount + 1;
    const maxAttempts = delivery.maxAttempts;
    let status: WebhookDeliveryStatus;
    let nextAttemptAt: Date | null = null;

    if (success) {
      status = WebhookDeliveryStatus.SUCCESS;
    } else if (attemptCount >= maxAttempts) {
      status = WebhookDeliveryStatus.EXHAUSTED;
    } else {
      status = WebhookDeliveryStatus.FAILED;
      nextAttemptAt = new Date(Date.now() + this.backoffMs(attemptCount));
    }

    await this.deliveryRepo.save({
      ...delivery,
      status,
      attemptCount,
      nextAttemptAt,
      lastAttemptedAt: new Date(),
      lastResponseCode: responseCode,
      lastResponseBody: responseBody,
      lastError: error,
      lockedAt: null,
      lockedBy: null,
    });

    if (!success) {
      this.logger.warn(
        `Delivery ${delivery.id} attempt ${attemptCount} failed: ${error ?? `HTTP ${responseCode}`}`,
      );
    }
  }

  private buildSignature(secret: string, payload: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  private backoffMs(attemptCount: number): number {
    return 30_000 * Math.pow(10, attemptCount - 1);
  }
}

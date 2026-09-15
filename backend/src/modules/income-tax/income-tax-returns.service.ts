import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IncomeTaxReturn, IncomeTaxReturnStatus } from '../../entities/income-tax-return.entity';
import type { IncomeTaxDraft } from './income-tax.types';
import { IncomeTaxDisclaimerService } from './income-tax-disclaimer.service';
import {
  buildIncomeTaxFileName,
  buildIncomeTaxPdf,
  buildIncomeTaxXlsx,
} from './income-tax-document';
import { IncomeTaxDraftService } from './income-tax-draft.service';

const UNIQUE_VIOLATION = '23505';

/**
 * Drafts, their finalization and their documents.
 *
 * A draft is recomputed from current data on every read and nothing is written
 * for it. Finalizing stores the whole draft as it stood, so the figures the user
 * took to their tax authority can be shown again later even after the
 * underlying transactions have changed.
 */
@Injectable()
export class IncomeTaxReturnsService {
  private readonly logger = new Logger(IncomeTaxReturnsService.name);

  constructor(
    @InjectRepository(IncomeTaxReturn)
    private readonly returnRepository: Repository<IncomeTaxReturn>,
    private readonly draftService: IncomeTaxDraftService,
    private readonly disclaimerService: IncomeTaxDisclaimerService,
  ) {}

  async getDraft(workspaceId: string, taxYear: number): Promise<IncomeTaxDraft> {
    const { pack } = await this.draftService.getContext(workspaceId, taxYear);
    const record = await this.returnRepository.findOne({
      where: { workspaceId, taxYear, formKey: pack.formKey },
    });

    if (record?.status === IncomeTaxReturnStatus.FINALIZED && record.snapshot) {
      return record.snapshot as unknown as IncomeTaxDraft;
    }
    return this.draftService.compute(workspaceId, taxYear);
  }

  async finalize(workspaceId: string, userId: string, taxYear: number): Promise<IncomeTaxDraft> {
    await this.disclaimerService.assertAccepted(userId);

    const { jurisdiction, pack } = await this.draftService.getContext(workspaceId, taxYear);
    const existing = await this.returnRepository.findOne({
      where: { workspaceId, taxYear, formKey: pack.formKey },
    });
    if (existing?.status === IncomeTaxReturnStatus.FINALIZED) {
      throw new ConflictException('This tax year has already been finalized');
    }

    const draft = await this.draftService.compute(workspaceId, taxYear);
    const finalizedAt = new Date();
    const snapshot: IncomeTaxDraft = {
      ...draft,
      status: 'finalized',
      finalizedAt: finalizedAt.toISOString(),
    };

    try {
      await this.returnRepository.save({
        ...(existing ?? {}),
        workspaceId,
        jurisdictionId: jurisdiction.id,
        taxYear,
        formKey: pack.formKey,
        status: IncomeTaxReturnStatus.FINALIZED,
        finalizedAt,
        finalizedBy: userId,
        snapshot: snapshot as unknown as Record<string, unknown>,
      });
    } catch (error) {
      // Two finalize requests racing for the same year: the unique index lets
      // exactly one through, and the other is the same conflict as above.
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('This tax year has already been finalized');
      }
      throw error;
    }

    this.logger.log(
      `Finalized income-tax draft ${pack.formKey} ${taxYear} for workspace ${workspaceId} ` +
        `(completeness ${draft.completeness.score})`,
    );
    return snapshot;
  }

  async reopen(workspaceId: string, taxYear: number): Promise<IncomeTaxDraft> {
    const { pack } = await this.draftService.getContext(workspaceId, taxYear);
    const existing = await this.returnRepository.findOne({
      where: { workspaceId, taxYear, formKey: pack.formKey },
    });
    if (existing?.status !== IncomeTaxReturnStatus.FINALIZED) {
      throw new BadRequestException('This tax year is not finalized');
    }

    await this.returnRepository.save({
      ...existing,
      status: IncomeTaxReturnStatus.DRAFT,
      finalizedAt: null,
      finalizedBy: null,
      snapshot: null,
    });
    return this.draftService.compute(workspaceId, taxYear);
  }

  async export(
    workspaceId: string,
    userId: string,
    taxYear: number,
    format: 'pdf' | 'xlsx',
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    // A document leaves the app and can be handed on; it should not exist
    // without the user having acknowledged what it is and is not.
    await this.disclaimerService.assertAccepted(userId);
    const draft = await this.getDraft(workspaceId, taxYear);

    if (format === 'pdf') {
      return {
        buffer: await buildIncomeTaxPdf(draft),
        fileName: buildIncomeTaxFileName(draft, 'pdf'),
        contentType: 'application/pdf',
      };
    }
    return {
      buffer: buildIncomeTaxXlsx(draft),
      fileName: buildIncomeTaxFileName(draft, 'xlsx'),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

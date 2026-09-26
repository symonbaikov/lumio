import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, Repository } from 'typeorm';
import { appError } from '../../common/errors/app-error';
import { normalizePagination } from '../../common/utils/pagination.util';
import { Client } from '../../entities/client.entity';
import { Invoice, InvoiceRecurrenceInterval, InvoiceStatus } from '../../entities/invoice.entity';
import { InvoiceLineItem } from '../../entities/invoice-line-item.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import {
  Payable,
  PayableDirection,
  PayableSource,
  PayableStatus,
} from '../../entities/payable.entity';
import { TaxRate } from '../../entities/tax-rate.entity';
import { LedgerPostingError, LedgerPostingService } from '../ledger/ledger-posting.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import type { InvoiceLineItemDto } from './dto/invoice-line-item.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { buildInvoicePdf } from './invoice-document';
import { advanceIssueDate, shiftDueDate } from './invoice-recurrence.util';

interface DraftInput {
  issueDate: string;
  dueDate: string;
  currency: string;
  notes: string | null;
  lineItems: InvoiceLineItemDto[];
  recurrenceInterval: InvoiceRecurrenceInterval | null;
  recurrenceEndDate: string | null;
  sourceRecurringInvoiceId: string | null;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Payable)
    private readonly payableRepository: Repository<Payable>,
    private readonly ledgerPostingService: LedgerPostingService,
  ) {}

  async create(workspaceId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    await this.assertClientInWorkspace(workspaceId, dto.clientId);
    return this.buildDraft(workspaceId, dto.clientId, {
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      currency: dto.currency || 'KZT',
      notes: dto.notes ?? null,
      lineItems: dto.lineItems,
      recurrenceInterval: dto.recurrenceInterval ?? null,
      recurrenceEndDate: dto.recurrenceEndDate ?? null,
      sourceRecurringInvoiceId: null,
    });
  }

  /** Clones a recurring template's line items into a fresh, unsent copy. */
  async cloneAsDraft(template: Invoice, lineItems: InvoiceLineItem[]): Promise<Invoice> {
    const issueDate = template.nextIssueDate;
    if (!issueDate) {
      throw new BadRequestException('Recurring invoice has no next issue date');
    }
    return this.buildDraft(template.workspaceId, template.clientId, {
      issueDate,
      dueDate: shiftDueDate(template.issueDate, template.dueDate, issueDate),
      currency: template.currency,
      notes: template.notes,
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRateId: item.taxRateId ?? undefined,
        categoryId: item.categoryId ?? undefined,
      })),
      recurrenceInterval: null,
      recurrenceEndDate: null,
      sourceRecurringInvoiceId: template.id,
    });
  }

  async findAll(workspaceId: string, filters: FilterInvoicesDto) {
    const { page, limit, skip } = normalizePagination(filters);
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.workspaceId = :workspaceId', { workspaceId })
      .andWhere('invoice.deletedAt IS NULL');

    if (filters.status) {
      queryBuilder.andWhere('invoice.status = :status', { status: filters.status });
    }
    if (filters.clientId) {
      queryBuilder.andWhere('invoice.clientId = :clientId', { clientId: filters.clientId });
    }
    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(invoice.invoiceNumber) LIKE :search OR LOWER(client.name) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('invoice.issueDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: await Promise.all(data.map(invoice => this.withEffectiveStatus(invoice))),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(id: string, workspaceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, workspaceId },
      relations: { client: true, lineItems: true },
      order: { lineItems: { sortOrder: 'ASC' } },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.withEffectiveStatus(invoice);
  }

  async getPdf(id: string, workspaceId: string): Promise<{ fileName: string; data: Buffer }> {
    // `fileData` is `select: false` on the entity; addSelect brings it back for this one read.
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .addSelect('invoice.fileData')
      .where('invoice.id = :id AND invoice.workspaceId = :workspaceId', { id, workspaceId })
      .getOne();
    if (!invoice?.fileData) {
      throw new NotFoundException('Invoice PDF not found');
    }
    return {
      fileName: `${invoice.invoiceNumber ?? 'invoice'}.pdf`,
      data: invoice.fileData,
    };
  }

  async update(id: string, workspaceId: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    return this.invoiceRepository.manager.transaction(async manager => {
      const invoices = manager.getRepository(Invoice);
      const invoice = await invoices.findOne({ where: { id, workspaceId } });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new ConflictException(appError('INVOICE_NOT_DRAFT'));
      }

      if (dto.clientId) {
        await this.assertClientInWorkspace(workspaceId, dto.clientId);
      }
      this.applyDraftFields(invoice, dto);
      await invoices.save(invoice);

      if (dto.lineItems) {
        await this.replaceLineItems(manager, invoice.id, dto.lineItems);
      }
      return this.recalculateTotals(manager, invoice.id);
    });
  }

  /**
   * Assigns the invoice number, books the accrual entry (unless the ledger is
   * not enabled for this workspace), generates the PDF and opens the
   * receivable — all in one transaction, so none of it is left half-done.
   */
  async send(id: string, workspaceId: string, userId: string): Promise<Invoice> {
    return this.invoiceRepository.manager.transaction(async manager => {
      const invoices = manager.getRepository(Invoice);
      const invoice = await invoices.findOne({
        where: { id, workspaceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new ConflictException(appError('INVOICE_ALREADY_SENT'));
      }

      const lineItems = await manager.getRepository(InvoiceLineItem).find({
        where: { invoiceId: id },
        order: { sortOrder: 'ASC' },
      });
      if (lineItems.length === 0 || Number(invoice.total) <= 0) {
        throw new BadRequestException(appError('INVOICE_ZERO_TOTAL'));
      }
      const client = await manager.getRepository(Client).findOne({
        where: { id: invoice.clientId, workspaceId },
      });
      if (!client) {
        throw new BadRequestException(appError('INVOICE_CLIENT_NOT_FOUND'));
      }

      invoice.invoiceNumber = await this.nextInvoiceNumber(manager, workspaceId);

      try {
        const entry = await this.ledgerPostingService.postInvoice(manager, {
          workspaceId,
          entryDate: invoice.issueDate,
          currency: invoice.currency,
          lines: await this.postingLinesOf(manager, lineItems),
          memo: `Invoice ${invoice.invoiceNumber}`,
          userId,
        });
        invoice.journalEntryId = entry.id;
      } catch (error) {
        // Invoicing works whether or not the workspace has opted into the
        // experimental double-entry ledger; a missing rate or other posting
        // failure, by contrast, is a real problem and must stop the send.
        if (!(error instanceof LedgerPostingError && error.code === 'LEDGER_DISABLED')) {
          throw error;
        }
      }

      // Same fields PayablesService.create would set; inlined so the receivable
      // opens in this same transaction instead of a separate one.
      const payable = await manager.getRepository(Payable).save(
        manager.getRepository(Payable).create({
          workspaceId,
          createdById: userId,
          direction: PayableDirection.RECEIVABLE,
          vendor: client.name,
          amount: invoice.total,
          currency: invoice.currency,
          dueDate: this.parseDateOnly(invoice.dueDate),
          status: PayableStatus.TO_PAY,
          source: PayableSource.INVOICE,
          isRecurring: false,
          comment: invoice.invoiceNumber,
        }),
      );
      invoice.payableId = payable.id;

      const pdf = await buildInvoicePdf(invoice, client, lineItems);
      const fileSize = pdf.length;
      const fileHash = createHash('sha256').update(pdf).digest('hex');
      // Written via `update`, not the entity object: `fileData` must never ride
      // along on the returned `Invoice` and get serialised into the response.
      await invoices.update({ id: invoice.id }, { fileData: pdf, fileSize, fileHash });
      invoice.fileSize = fileSize;
      invoice.fileHash = fileHash;

      invoice.status = InvoiceStatus.SENT;
      return invoices.save(invoice);
    });
  }

  async void(id: string, workspaceId: string, userId: string): Promise<Invoice> {
    return this.invoiceRepository.manager.transaction(async manager => {
      const invoices = manager.getRepository(Invoice);
      const invoice = await invoices.findOne({
        where: { id, workspaceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new ConflictException(appError('INVOICE_NOT_VOIDABLE'));
      }

      if (invoice.journalEntryId) {
        // Locked without its `lines` relation: Postgres refuses FOR UPDATE on
        // the nullable side of the outer join a relations-based fetch would
        // use. The lines are loaded separately, same as `reverseEntry` does.
        const entry = await manager.getRepository(JournalEntry).findOne({
          where: { id: invoice.journalEntryId, workspaceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (entry && entry.status === JournalEntryStatus.POSTED && !entry.reversalOfId) {
          entry.lines = await manager.getRepository(JournalLine).find({
            where: { entryId: entry.id },
            order: { lineNo: 'ASC' },
          });
          await this.ledgerPostingService.reverseWithin(manager, entry, { userId });
        }
      }
      if (invoice.payableId) {
        await manager
          .getRepository(Payable)
          .update({ id: invoice.payableId }, { status: PayableStatus.ARCHIVED });
      }

      invoice.status = InvoiceStatus.VOID;
      return invoices.save(invoice);
    });
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { id, workspaceId } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ConflictException(appError('INVOICE_NOT_DRAFT'));
    }
    await this.invoiceRepository.softRemove(invoice);
  }

  async getNumberingSettings(workspaceId: string): Promise<{ prefix: string }> {
    await this.invoiceRepository.manager.query(
      `INSERT INTO "invoice_counters" ("workspace_id") VALUES ($1) ON CONFLICT DO NOTHING`,
      [workspaceId],
    );
    const rows: Array<{ prefix: string }> = await this.invoiceRepository.manager.query(
      `SELECT "prefix" FROM "invoice_counters" WHERE "workspace_id" = $1`,
      [workspaceId],
    );
    return { prefix: rows[0]?.prefix ?? 'INV-' };
  }

  async updateNumberPrefix(workspaceId: string, prefix: string): Promise<{ prefix: string }> {
    const trimmed = prefix.trim().slice(0, 20);
    await this.invoiceRepository.manager.query(
      `INSERT INTO "invoice_counters" ("workspace_id", "prefix") VALUES ($1, $2)
         ON CONFLICT ("workspace_id") DO UPDATE SET "prefix" = $2`,
      [workspaceId, trimmed],
    );
    return { prefix: trimmed };
  }

  private async buildDraft(
    workspaceId: string,
    clientId: string,
    input: DraftInput,
  ): Promise<Invoice> {
    return this.invoiceRepository.manager.transaction(async manager => {
      const invoices = manager.getRepository(Invoice);
      const invoice = await invoices.save(
        invoices.create({
          workspaceId,
          clientId,
          status: InvoiceStatus.DRAFT,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency: input.currency,
          notes: input.notes,
          isRecurring: !!input.recurrenceInterval,
          recurrenceInterval: input.recurrenceInterval,
          nextIssueDate: input.recurrenceInterval
            ? advanceIssueDate(input.issueDate, input.recurrenceInterval)
            : null,
          recurrenceEndDate: input.recurrenceEndDate,
          sourceRecurringInvoiceId: input.sourceRecurringInvoiceId,
        }),
      );
      await this.replaceLineItems(manager, invoice.id, input.lineItems);
      return this.recalculateTotals(manager, invoice.id);
    });
  }

  private async replaceLineItems(
    manager: EntityManager,
    invoiceId: string,
    items: InvoiceLineItemDto[],
  ): Promise<void> {
    const repo = manager.getRepository(InvoiceLineItem);
    await repo.delete({ invoiceId });
    if (items.length === 0) {
      return;
    }
    await repo.insert(
      items.map((item, index) => ({
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRateId: item.taxRateId ?? null,
        categoryId: item.categoryId ?? null,
        sortOrder: index,
      })),
    );
  }

  private async recalculateTotals(manager: EntityManager, invoiceId: string): Promise<Invoice> {
    const lineItems = await manager.getRepository(InvoiceLineItem).find({
      where: { invoiceId },
      order: { sortOrder: 'ASC' },
    });
    const invoice = await manager.getRepository(Invoice).findOneOrFail({
      where: { id: invoiceId },
    });

    const rateById = await this.taxRatesByLineItems(manager, lineItems);
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of lineItems) {
      const net = this.round2(Number(item.quantity) * Number(item.unitPrice));
      const ratePct = item.taxRateId ? (rateById.get(item.taxRateId) ?? 0) : 0;
      subtotal += net;
      taxTotal += this.round2(net * (ratePct / 100));
    }

    invoice.subtotal = this.round2(subtotal);
    invoice.taxTotal = this.round2(taxTotal);
    invoice.total = this.round2(subtotal + taxTotal);
    const saved = await manager.getRepository(Invoice).save(invoice);
    saved.lineItems = lineItems;
    return saved;
  }

  /** Net amount and tax, per line item, for the ledger's accrual legs. */
  private async postingLinesOf(
    manager: EntityManager,
    lineItems: InvoiceLineItem[],
  ): Promise<Array<{ amount: number; taxAmount: number; categoryId: string | null }>> {
    const rateById = await this.taxRatesByLineItems(manager, lineItems);
    return lineItems.map(item => {
      const net = this.round2(Number(item.quantity) * Number(item.unitPrice));
      const ratePct = item.taxRateId ? (rateById.get(item.taxRateId) ?? 0) : 0;
      return {
        amount: net,
        taxAmount: this.round2(net * (ratePct / 100)),
        categoryId: item.categoryId,
      };
    });
  }

  private async taxRatesByLineItems(
    manager: EntityManager,
    lineItems: InvoiceLineItem[],
  ): Promise<Map<string, number>> {
    const taxRateIds = [
      ...new Set(lineItems.map(item => item.taxRateId).filter((id): id is string => !!id)),
    ];
    if (taxRateIds.length === 0) {
      return new Map();
    }
    const taxRates = await manager.getRepository(TaxRate).findBy({ id: In(taxRateIds) });
    return new Map(taxRates.map(rate => [rate.id, Number(rate.rate)]));
  }

  private async nextInvoiceNumber(manager: EntityManager, workspaceId: string): Promise<string> {
    await manager.query(
      `INSERT INTO "invoice_counters" ("workspace_id") VALUES ($1) ON CONFLICT DO NOTHING`,
      [workspaceId],
    );
    const rows: Array<{ prefix: string; invoice_no: string }> = await manager.query(
      `WITH taken AS (
         UPDATE "invoice_counters" SET "next_invoice_no" = "next_invoice_no" + 1
          WHERE "workspace_id" = $1
          RETURNING "prefix", "next_invoice_no" - 1 AS "invoice_no"
       )
       SELECT "prefix", "invoice_no" FROM taken`,
      [workspaceId],
    );
    return `${rows[0].prefix}${rows[0].invoice_no}`;
  }

  private async withEffectiveStatus(invoice: Invoice): Promise<Invoice> {
    if (
      !invoice.payableId ||
      invoice.status === InvoiceStatus.VOID ||
      invoice.status === InvoiceStatus.DRAFT
    ) {
      return invoice;
    }
    const payable = await this.payableRepository.findOne({
      where: { id: invoice.payableId },
      select: ['status'],
    });
    if (payable?.status === PayableStatus.PAID) {
      invoice.status = InvoiceStatus.PAID;
    } else if (payable?.status === PayableStatus.OVERDUE) {
      invoice.status = InvoiceStatus.OVERDUE;
    }
    return invoice;
  }

  private applyDraftFields(invoice: Invoice, dto: UpdateInvoiceDto): void {
    if (dto.clientId) {
      invoice.clientId = dto.clientId;
    }
    if (dto.issueDate !== undefined) {
      invoice.issueDate = dto.issueDate;
    }
    if (dto.dueDate !== undefined) {
      invoice.dueDate = dto.dueDate;
    }
    if (dto.currency !== undefined) {
      invoice.currency = dto.currency;
    }
    if (dto.notes !== undefined) {
      invoice.notes = dto.notes ?? null;
    }
    if (dto.recurrenceInterval !== undefined) {
      invoice.isRecurring = !!dto.recurrenceInterval;
      invoice.recurrenceInterval = dto.recurrenceInterval ?? null;
      invoice.nextIssueDate = dto.recurrenceInterval
        ? advanceIssueDate(invoice.issueDate, dto.recurrenceInterval)
        : null;
    }
    if (dto.recurrenceEndDate !== undefined) {
      invoice.recurrenceEndDate = dto.recurrenceEndDate ?? null;
    }
  }

  private async assertClientInWorkspace(workspaceId: string, clientId: string): Promise<void> {
    const exists = await this.clientRepository.exists({ where: { id: clientId, workspaceId } });
    if (!exists) {
      throw new BadRequestException(appError('INVOICE_CLIENT_NOT_FOUND'));
    }
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}

import * as fs from 'fs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { normalizeCurrency } from '../../../common/constants/currency.constants';
import { WorkspaceCurrencyService } from '../../../common/services/workspace-currency.service';
import { calculateFileHash } from '../../../common/utils/file-hash.util';
import { getFileTypeFromMime } from '../../../common/utils/file-validator.util';
import { normalizeFilename } from '../../../common/utils/filename.util';
import { Category, WorkspaceMember, WorkspaceRole } from '../../../entities';
import { ActorType, AuditAction, EntityType, Severity } from '../../../entities/audit-event.entity';
import { CategoryType } from '../../../entities/category.entity';
import { ReceiptStatus } from '../../../entities/receipt.entity';
import { BankName, FileType, Statement, StatementStatus } from '../../../entities/statement.entity';
import { TaxRate } from '../../../entities/tax-rate.entity';
import { Transaction, TransactionType } from '../../../entities/transaction.entity';
import { User } from '../../../entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { ReceiptsService } from '../../receipts/receipts.service';

@Injectable()
export class ReceiptStatementService {
  private static readonly AMOUNT_NOT_RECOGNIZED_MESSAGE =
    'Не удалось распознать сумму на чеке. Проверьте качество снимка или добавьте расход вручную.';

  constructor(
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly receiptsService: ReceiptsService,
    private readonly auditService: AuditService,
    private readonly workspaceCurrencyService: WorkspaceCurrencyService,
  ) {}

  async createFromReceiptScan(params: {
    user: User;
    workspaceId: string;
    files: Express.Multer.File[];
    language?: string;
  }): Promise<Statement[]> {
    const { user, workspaceId, files, language } = params;
    await this.ensureCanEditStatements(user.id, workspaceId);

    if (!files?.length) {
      throw new BadRequestException('No receipt files provided');
    }

    const results: Statement[] = [];

    for (const file of files) {
      const statement = await this.createStatementFromReceiptFile({
        user,
        workspaceId,
        file,
        language,
      });
      results.push(statement);
    }

    return results;
  }

  private async ensureCanEditStatements(userId: string, workspaceId: string): Promise<void> {
    if (!workspaceId) {
      return;
    }

    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      select: ['role', 'permissions'],
    });

    if (!membership) {
      return;
    }

    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) {
      return;
    }

    if (membership.permissions?.canEditStatements === false) {
      throw new ForbiddenException('Недостаточно прав для редактирования выписок');
    }
  }

  private normalizePositiveAmount(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  /**
   * Receipt OCR does not always report a grand total. When it is missing, fall back
   * to the sum of the extracted line items so the upload still yields a usable
   * expense. Such a total is reported as `derived` because it can omit tax, and the
   * resulting transaction is left unverified for the user to confirm.
   */
  private resolveReceiptAmount(parsed: {
    amount?: number;
    lineItems?: Array<{ description: string; amount: number }>;
  }): { amount: number | null; derived: boolean } {
    const reported = this.normalizePositiveAmount(parsed.amount);
    if (reported !== null) {
      return { amount: reported, derived: false };
    }

    const lineItemsTotal = (parsed.lineItems ?? []).reduce((sum, item) => {
      const itemAmount = this.normalizePositiveAmount(item?.amount);
      return itemAmount === null ? sum : sum + itemAmount;
    }, 0);

    const derivedAmount = this.normalizePositiveAmount(lineItemsTotal);
    return { amount: derivedAmount, derived: derivedAmount !== null };
  }

  private static readonly VENDOR_TO_BANK: { pattern: RegExp; bank: BankName }[] = [
    { pattern: /\bkaspi\b/i, bank: BankName.KASPI },
    { pattern: /\bкаспи/i, bank: BankName.KASPI },
    { pattern: /\bbereke\b/i, bank: BankName.BEREKE_NEW },
    { pattern: /\bбереке/i, bank: BankName.BEREKE_NEW },
    { pattern: /\bhapoalim\b/i, bank: BankName.HAPOALIM },
  ];

  private static detectBankFromVendor(vendor: string): BankName {
    for (const { pattern, bank } of ReceiptStatementService.VENDOR_TO_BANK) {
      if (pattern.test(vendor)) {
        return bank;
      }
    }
    return BankName.OTHER;
  }

  private resolveReceiptFailureMessage(receipt: {
    metadata?: Record<string, unknown> | null;
    parsedData?: Record<string, unknown> | null;
  }) {
    const metadataError = receipt.metadata?.processingError;
    if (typeof metadataError === 'string' && metadataError.trim()) {
      return metadataError;
    }

    const parsedIssues = receipt.parsedData?.validationIssues;
    if (Array.isArray(parsedIssues)) {
      const [firstIssue] = parsedIssues;
      if (typeof firstIssue === 'string' && firstIssue.trim()) {
        return firstIssue;
      }
    }

    return 'Receipt scan could not be processed';
  }

  private async createStatementFromReceiptFile(params: {
    user: User;
    workspaceId: string;
    file: Express.Multer.File;
    language?: string;
  }): Promise<Statement> {
    const { user, workspaceId, file, language } = params;
    const fileName = normalizeFilename(file.originalname);
    const fileType = getFileTypeFromMime(file.mimetype) as FileType;
    const fileHash = await calculateFileHash(file.path);

    const hashDuplicate = await this.statementRepository.findOne({
      where: { workspaceId, fileHash },
    });

    if (hashDuplicate) {
      throw new ConflictException({
        message: 'Такой чек уже загружен (дубликат файла)',
        duplicateStatementId: hashDuplicate.id,
      });
    }

    const fallbackCategory = await this.categoryRepository.findOne({
      where: {
        workspaceId,
        type: CategoryType.EXPENSE,
        isEnabled: true,
      },
    });

    if (!fallbackCategory) {
      throw new BadRequestException('No enabled expense category available for receipt scan');
    }

    const statement = this.statementRepository.create({
      userId: user.id,
      workspaceId,
      fileName,
      filePath: file.path,
      fileType,
      fileSize: file.size,
      fileHash,
      bankName: BankName.OTHER,
      status: StatementStatus.UPLOADED,
      currency: await this.workspaceCurrencyService.resolve(workspaceId),
      categoryId: fallbackCategory.id,
      parsingDetails: {
        detectedBy: 'receipt-scan',
        parserUsed: 'receipt-scan',
        parserVersion: '1',
      },
    });

    const savedStatement = (await this.statementRepository.save(statement)) as Statement;

    // OCR takes tens of seconds — far longer than the proxy/browser will wait. Run it
    // detached so the upload returns at once; the client polls the statement status.
    void this.processReceiptScan({
      statementId: savedStatement.id,
      user,
      workspaceId,
      file,
      language,
      fallbackCategoryId: fallbackCategory.id,
    }).catch((error: unknown) => this.markStatementFailed(savedStatement.id, error));

    return savedStatement;
  }

  private async processReceiptScan(params: {
    statementId: string;
    user: User;
    workspaceId: string;
    file: Express.Multer.File;
    language?: string;
    fallbackCategoryId: string;
  }): Promise<void> {
    const { statementId, user, workspaceId, file, language, fallbackCategoryId } = params;
    const fileName = normalizeFilename(file.originalname);

    const receipt = await this.receiptsService.createFromScan({
      userId: user.id,
      workspaceId,
      file,
      language,
    });

    if (receipt.status === ReceiptStatus.FAILED) {
      throw new BadRequestException(this.resolveReceiptFailureMessage(receipt));
    }

    const parsed = receipt.parsedData ?? {};
    const { amount: amountValue, derived: amountDerived } = this.resolveReceiptAmount(parsed);

    if (amountValue === null) {
      throw new BadRequestException(ReceiptStatementService.AMOUNT_NOT_RECOGNIZED_MESSAGE);
    }

    const merchant =
      String(parsed.vendor || receipt.subject || fileName).trim() || 'Unknown merchant';
    const detectedBankName = ReceiptStatementService.detectBankFromVendor(merchant);
    const workspaceCurrency = await this.workspaceCurrencyService.resolve(workspaceId);
    const currency = normalizeCurrency(parsed.currency, workspaceCurrency);
    const parsedDate = parsed.date ? new Date(parsed.date) : new Date();
    const transactionDate = new Date(parsedDate.toISOString().slice(0, 10));

    const category = parsed.categoryId
      ? await this.categoryRepository.findOne({
          where: {
            workspaceId,
            id: parsed.categoryId,
          },
        })
      : null;

    const categoryId = category?.id ?? fallbackCategoryId;

    const taxRate = await this.taxRateRepository.findOne({
      where: {
        workspaceId,
        isDefault: true,
        isEnabled: true,
      },
    });

    const validationWarnings = [...(parsed.validationIssues ?? [])];
    if (amountDerived) {
      validationWarnings.push('amount_derived_from_line_items');
    }

    await this.statementRepository.update(statementId, {
      bankName: detectedBankName,
      status: StatementStatus.COMPLETED,
      errorMessage: null,
      processedAt: new Date(),
      statementDateFrom: transactionDate,
      statementDateTo: transactionDate,
      totalTransactions: 1,
      totalDebit: amountValue,
      totalCredit: 0,
      currency,
      categoryId,
      parsingDetails: {
        detectedBy: 'receipt-scan',
        parserUsed: 'receipt-scan',
        parserVersion: '1',
        transactionsFound: 1,
        transactionsCreated: 1,
        metadataExtracted: {
          dateFrom: transactionDate.toISOString().slice(0, 10),
          dateTo: transactionDate.toISOString().slice(0, 10),
          currency,
        },
        validation: {
          passed: validationWarnings.length === 0,
          warnings: validationWarnings,
        },
        importPreview: {
          source: 'receipt-scan',
          merchant,
          description: merchant,
          attachments: 1,
          categoryId,
          taxRateId: taxRate?.id || null,
          taxRateLabel: taxRate
            ? `${taxRate.name} (${Number(taxRate.rate || 0).toFixed(0)}%)`
            : null,
          confidence: parsed.confidence ?? receipt.confidence,
          extractionMethod: receipt.extractionMethod,
        },
      },
    });

    await this.receiptsService.update(receipt.id, workspaceId, { statementId });

    try {
      const fileData = await fs.promises.readFile(file.path);
      await this.statementRepository.update(statementId, { fileData });
    } catch (error) {
      console.warn(
        `[Statements] Failed to persist receipt scan file in DB: ${(error as Error)?.message}`,
      );
    }

    const transactionType =
      parsed.transactionType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const isExpense = transactionType === TransactionType.EXPENSE;

    const transaction = this.transactionRepository.create({
      workspaceId,
      statementId,
      transactionDate,
      counterpartyName: merchant,
      paymentPurpose: merchant,
      debit: isExpense ? amountValue : null,
      credit: isExpense ? null : amountValue,
      amount: amountValue,
      currency,
      transactionType,
      categoryId,
      taxRateId: taxRate?.id || null,
      // A total summed from line items can omit tax — leave it for the user to confirm.
      isVerified: !amountDerived,
    });

    await this.transactionRepository.save(transaction);

    const processedStatement = await this.statementRepository.findOne({
      where: { id: statementId },
    });

    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      actorLabel: user.email || user.name || 'User',
      entityType: EntityType.STATEMENT,
      entityId: statementId,
      action: AuditAction.IMPORT,
      diff: { before: null, after: processedStatement },
      meta: {
        source: 'receipt-scan',
        amount: amountValue,
        currency,
        merchant,
        categoryId,
        taxRateId: taxRate?.id || null,
      },
      severity: Severity.INFO,
      isUndoable: false,
    });
  }

  /** Records a background scan failure on the statement so the client stops polling. */
  private async markStatementFailed(statementId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Receipt scan could not be processed';

    try {
      await this.statementRepository.update(statementId, {
        status: StatementStatus.ERROR,
        errorMessage: message,
        processedAt: new Date(),
      });
    } catch (updateError) {
      console.error(
        `[Statements] Failed to mark receipt statement ${statementId} as failed: ${
          (updateError as Error)?.message
        }`,
      );
    }
  }
}

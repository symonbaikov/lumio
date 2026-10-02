import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Category } from '../../../entities/category.entity';
import { Receipt } from '../../../entities/receipt.entity';
import { Transaction } from '../../../entities/transaction.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { ReceiptCategoryService } from './receipt-category.service';
import { groupLineItemsIntoParts, type SplitLineItem, type SplitPart } from './receipt-split.util';

export interface ReceiptSplitSuggestion {
  transactionId: string;
  total: number;
  currency: string;
  parts: Array<SplitPart & { categoryName: string | null }>;
  /** False when everything landed in one category: nothing to split. */
  splittable: boolean;
  /** The line items with the category the suggestion assigned to each. */
  items: SplitLineItem[];
}

/**
 * Turns a receipt's line items into a category split of the transaction it is
 * attached to: "Target, 80 €" becomes groceries 52 €, household 28 €.
 */
@Injectable()
export class ReceiptSplitService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly categoryService: ReceiptCategoryService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async suggest(receiptId: string, workspaceId: string): Promise<ReceiptSplitSuggestion> {
    const receipt = await this.receiptRepository.findOne({ where: { id: receiptId, workspaceId } });
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    if (!receipt.transactionId) {
      throw new BadRequestException('Approve the receipt first so there is a transaction to split');
    }
    const transaction = await this.transactionRepository.findOne({
      where: { id: receipt.transactionId, workspaceId },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.splitGroupId) {
      throw new BadRequestException('The transaction is already split');
    }
    const lines = (receipt.parsedData?.lineItems ?? []).filter(
      item => item.description?.trim() && Number(item.amount) > 0,
    );
    if (lines.length < 2) {
      throw new BadRequestException('The receipt needs at least two line items');
    }

    const categories = await this.categoryRepository.find({ where: { workspaceId } });
    const enabled = categories.filter(category => category.isEnabled !== false);
    const items = await this.categorise(receipt, lines, enabled);
    const fallback = receipt.parsedData?.categoryId ?? transaction.categoryId ?? null;
    const total = Math.abs(
      Number(transaction.amount) || Number(transaction.debit) || Number(transaction.credit) || 0,
    );
    const parts = groupLineItemsIntoParts(items, total, fallback);
    const nameOf = new Map(categories.map(category => [category.id, category.name]));

    return {
      transactionId: transaction.id,
      total,
      currency: transaction.currency,
      parts: parts.map(part => ({
        ...part,
        categoryName: part.categoryId ? (nameOf.get(part.categoryId) ?? null) : null,
      })),
      splittable: parts.length >= 2,
      items,
    };
  }

  /** Applies the suggestion through the ordinary split and remembers each line's category. */
  async apply(receiptId: string, workspaceId: string, userId: string) {
    const suggestion = await this.suggest(receiptId, workspaceId);
    if (!suggestion.splittable) {
      throw new BadRequestException('All line items fall into one category');
    }
    const vendor = (await this.receiptRepository.findOne({ where: { id: receiptId, workspaceId } }))
      ?.parsedData?.vendor;
    const transactions = await this.transactionsService.split(
      suggestion.transactionId,
      workspaceId,
      userId,
      {
        parts: suggestion.parts.map(part => ({
          amount: part.amount,
          categoryId: part.categoryId ?? undefined,
          paymentPurpose: `${vendor ? `${vendor}: ` : ''}${part.items.join(', ')}`.slice(0, 500),
        })),
      },
    );
    await this.receiptRepository.update(
      { id: receiptId, workspaceId },
      {
        parsedData: () =>
          `parsed_data || '${JSON.stringify({ lineItems: suggestion.items }).replace(/'/g, "''")}'::jsonb`,
      },
    );
    return { suggestion, transactions };
  }

  /** Keeps an existing category, then keywords, then the model, then the fallback. */
  private async categorise(
    receipt: Receipt,
    lines: NonNullable<Receipt['parsedData']>['lineItems'] & object,
    categories: Category[],
  ): Promise<SplitLineItem[]> {
    const known = new Set(categories.map(category => category.id));
    const items: SplitLineItem[] = (lines ?? []).map(line => ({
      description: line.description.trim(),
      amount: Number(line.amount),
      categoryId: line.categoryId && known.has(line.categoryId) ? line.categoryId : null,
    }));
    for (const item of items) {
      if (item.categoryId) continue;
      item.categoryId =
        this.categoryService.matchByKeywords(item.description, categories)?.id ?? null;
    }
    const pending = items.filter(item => !item.categoryId);
    if (pending.length > 0) {
      const matches = await this.categoryService.classifyDescriptions(
        receipt,
        pending.map(item => item.description),
        categories,
      );
      for (const [index, item] of pending.entries()) {
        item.categoryId = matches[index] ?? null;
      }
    }
    return items;
  }

  /** Loads the categories referenced by a receipt's split, for display. */
  async categoriesFor(workspaceId: string, ids: string[]): Promise<Category[]> {
    return ids.length ? this.categoryRepository.find({ where: { workspaceId, id: In(ids) } }) : [];
  }
}

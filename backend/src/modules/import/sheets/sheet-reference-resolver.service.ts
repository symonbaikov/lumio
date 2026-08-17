import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Category, CategoryType } from '../../../entities/category.entity';
import { Wallet } from '../../../entities/wallet.entity';
import { ClassificationService } from '../../classification/services/classification.service';

/** Trims and lowercases a sheet cell name for case-insensitive matching. */
const normalizeName = (name: string): string => name.trim().toLowerCase();

/** Category cache/result key: `${type}:${normalizedName}`. */
const categoryKey = (name: string, type: CategoryType): string => `${type}:${normalizeName(name)}`;

export interface ResolveCategoriesParams {
  workspaceId: string;
  userId: string;
  names: Array<{ name: string; type: CategoryType }>;
  createMissing: boolean;
}

export interface ResolveWalletsParams {
  workspaceId: string;
  names: string[];
}

export interface ResolveWalletsResult {
  resolved: Map<string, string | null>;
  warnings: string[];
}

/**
 * Resolves sheet-cell category and wallet names to workspace entity ids.
 *
 * Category resolution matches case-insensitively/trimmed against existing
 * workspace categories, and — when `createMissing` is true — delegates
 * creation to `ClassificationService.ensureCategory`, the single source of
 * truth for category creation. Wallet resolution never creates; an unknown
 * wallet name resolves to `null` with a warning, since wallets carry
 * balances and auto-creating one would corrupt net worth.
 */
@Injectable()
export class SheetReferenceResolverService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly classificationService: ClassificationService,
  ) {}

  /**
   * Resolves each `{ name, type }` pair to a category id, keyed by
   * `${type}:${trimmed-lowercased-name}` in the returned map. Duplicate
   * names (same key) are resolved once, so an import listing the same
   * category twice creates it at most once.
   */
  async resolveCategories(params: ResolveCategoriesParams): Promise<Map<string, string | null>> {
    const { workspaceId, userId, names, createMissing } = params;
    const result = new Map<string, string | null>();

    const existingCategories = await this.categoryRepository.find({ where: { workspaceId } });
    const existingByKey = new Map<string, string>();
    for (const category of existingCategories) {
      existingByKey.set(categoryKey(category.name, category.type), category.id);
    }

    const uniqueRequests = new Map<string, { name: string; type: CategoryType }>();
    for (const entry of names) {
      const key = categoryKey(entry.name, entry.type);
      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, entry);
      }
    }

    for (const [key, entry] of uniqueRequests) {
      const existingId = existingByKey.get(key);
      if (existingId) {
        result.set(key, existingId);
        continue;
      }

      if (!createMissing) {
        result.set(key, null);
        continue;
      }

      const createdId = await this.classificationService.ensureCategory(
        userId,
        entry.name.trim(),
        entry.type,
        undefined,
        workspaceId,
      );
      result.set(key, createdId ?? null);
    }

    return result;
  }

  /**
   * Resolves each wallet name to an existing workspace wallet id, keyed by
   * `trimmed-lowercased-name` in the returned map. Never creates a wallet:
   * an unmatched name resolves to `null` and adds a warning message.
   */
  async resolveWallets(params: ResolveWalletsParams): Promise<ResolveWalletsResult> {
    const { workspaceId, names } = params;
    const resolved = new Map<string, string | null>();
    const warnings: string[] = [];

    const existingWallets = await this.walletRepository.find({ where: { workspaceId } });
    const existingByName = new Map<string, string>();
    for (const wallet of existingWallets) {
      existingByName.set(normalizeName(wallet.name), wallet.id);
    }

    for (const name of names) {
      const key = normalizeName(name);
      if (resolved.has(key)) {
        continue;
      }

      const existingId = existingByName.get(key);
      if (existingId) {
        resolved.set(key, existingId);
        continue;
      }

      resolved.set(key, null);
      warnings.push(`Wallet "${name.trim()}" not found`);
    }

    return { resolved, warnings };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { appError } from '../../common/errors/app-error';
import { Category } from '../../entities/category.entity';
import { Payable, PayableDirection } from '../../entities/payable.entity';
import { Statement } from '../../entities/statement.entity';
import { StatementFavorite } from '../../entities/statement-favorite.entity';
import { Transaction } from '../../entities/transaction.entity';

export type SearchResultKind = 'transaction' | 'statement' | 'payable' | 'receivable' | 'category';

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/** Per-kind cap, so one noisy source can't crowd out the others. */
const PER_KIND_LIMIT = 5;
/** Shorter needles match nearly everything and make the query pointless. */
const MIN_QUERY_LENGTH = 2;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepo: Repository<Statement>,
    @InjectRepository(Payable)
    private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(StatementFavorite)
    private readonly favoriteRepo: Repository<StatementFavorite>,
  ) {}

  async search(workspaceId: string, rawQuery: string): Promise<SearchResponse> {
    const query = (rawQuery ?? '').trim();
    if (query.length < MIN_QUERY_LENGTH) {
      return { query, results: [] };
    }

    const needle = `%${query.toLowerCase()}%`;

    const [transactions, statements, payables, categories] = await Promise.all([
      this.searchTransactions(workspaceId, needle),
      this.searchStatements(workspaceId, needle),
      this.searchPayables(workspaceId, needle),
      this.searchCategories(workspaceId, needle),
    ]);

    return { query, results: [...transactions, ...statements, ...payables, ...categories] };
  }

  private async searchTransactions(workspaceId: string, needle: string): Promise<SearchResult[]> {
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .andWhere(
        '(LOWER(t.counterpartyName) LIKE :needle OR LOWER(t.paymentPurpose) LIKE :needle)',
        { needle },
      )
      .orderBy('t.transactionDate', 'DESC')
      .take(PER_KIND_LIMIT)
      .getMany();

    return rows.map(row => ({
      kind: 'transaction' as const,
      id: row.id,
      title: row.counterpartyName,
      subtitle: row.paymentPurpose || null,
      href: `/statements/transactions?highlight=${row.id}`,
    }));
  }

  private async searchStatements(workspaceId: string, needle: string): Promise<SearchResult[]> {
    const rows = await this.statementRepo
      .createQueryBuilder('s')
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .andWhere('LOWER(s.fileName) LIKE :needle', { needle })
      .orderBy('s.createdAt', 'DESC')
      .take(PER_KIND_LIMIT)
      .getMany();

    return rows.map(row => this.toStatementResult(row));
  }

  /** Latest uploads, newest first — what the search panel shows before anything is typed. */
  async recent(workspaceId: string): Promise<SearchResponse> {
    const rows = await this.statementRepo
      .createQueryBuilder('s')
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.createdAt', 'DESC')
      .take(PER_KIND_LIMIT)
      .getMany();

    return { query: '', results: rows.map(row => this.toStatementResult(row)) };
  }

  /** The user's starred statements in this workspace, most recently starred first. */
  async favorites(workspaceId: string, userId: string): Promise<SearchResponse> {
    const rows = await this.statementRepo
      .createQueryBuilder('s')
      .innerJoin(StatementFavorite, 'f', 'f.statementId = s.id AND f.userId = :userId', { userId })
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('f.createdAt', 'DESC')
      .getMany();

    return { query: '', results: rows.map(row => this.toStatementResult(row)) };
  }

  /** Idempotent: starring an already starred statement changes nothing. */
  async addFavorite(workspaceId: string, userId: string, statementId: string): Promise<void> {
    const visible = await this.statementRepo.exists({
      where: { id: statementId, workspaceId, deletedAt: IsNull() },
    });
    if (!visible) {
      throw new NotFoundException(appError('STATEMENT_NOT_FOUND'));
    }

    await this.favoriteRepo
      .createQueryBuilder()
      .insert()
      .into(StatementFavorite)
      .values({ userId, statementId })
      .orIgnore()
      .execute();
  }

  /** Scoped by the owner alone: a user can only ever remove their own star. */
  async removeFavorite(userId: string, statementId: string): Promise<void> {
    await this.favoriteRepo.delete({ userId, statementId });
  }

  private toStatementResult(row: Statement): SearchResult {
    return {
      kind: 'statement',
      id: row.id,
      title: row.fileName,
      subtitle: row.bankName ?? null,
      href: `/statements/${row.id}/view`,
    };
  }

  private async searchPayables(workspaceId: string, needle: string): Promise<SearchResult[]> {
    const rows = await this.payableRepo
      .createQueryBuilder('p')
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere("(LOWER(p.vendor) LIKE :needle OR LOWER(COALESCE(p.comment, '')) LIKE :needle)", {
        needle,
      })
      .orderBy('p.dueDate', 'ASC', 'NULLS LAST')
      .take(PER_KIND_LIMIT)
      .getMany();

    return rows.map(row => {
      const isReceivable = row.direction === PayableDirection.RECEIVABLE;
      return {
        kind: (isReceivable ? 'receivable' : 'payable') as SearchResultKind,
        id: row.id,
        title: row.vendor,
        subtitle: row.comment ?? null,
        href: isReceivable ? '/statements/receive' : '/statements/pay',
      };
    });
  }

  private async searchCategories(workspaceId: string, needle: string): Promise<SearchResult[]> {
    const rows = await this.categoryRepo
      .createQueryBuilder('c')
      .where('c.workspaceId = :workspaceId', { workspaceId })
      .andWhere('LOWER(c.name) LIKE :needle', { needle })
      .orderBy('c.name', 'ASC')
      .take(PER_KIND_LIMIT)
      .getMany();

    return rows.map(row => ({
      kind: 'category' as const,
      id: row.id,
      title: row.name,
      subtitle: null,
      href: '/categories',
    }));
  }
}

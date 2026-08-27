import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomTableRowComment } from '../../entities/custom-table-row-comment.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTable } from '../../entities/custom-table.entity';

export interface CommentView {
  id: string;
  body: string;
  resolvedAt: Date | null;
  createdAt: Date;
  author: { id: string; name: string } | null;
}

const MAX_BODY_LENGTH = 4000;

@Injectable()
export class CustomTableCommentsService {
  constructor(
    @InjectRepository(CustomTableRowComment)
    private readonly commentRepository: Repository<CustomTableRowComment>,
    @InjectRepository(CustomTable)
    private readonly tableRepository: Repository<CustomTable>,
    @InjectRepository(CustomTableRow)
    private readonly rowRepository: Repository<CustomTableRow>,
  ) {}

  /** Комментарий живёт внутри таблицы, поэтому проверяем и таблицу, и строку. */
  private async requireRow(
    workspaceId: string,
    tableId: string,
    rowId: string,
  ): Promise<CustomTableRow> {
    const table = await this.tableRepository
      .createQueryBuilder('table')
      .leftJoin('table.user', 'owner')
      .where('table.id = :tableId', { tableId })
      .andWhere('owner.workspaceId = :workspaceId', { workspaceId })
      .getOne();
    if (!table) {
      throw new NotFoundException('Таблица не найдена');
    }
    const row = await this.rowRepository.findOne({ where: { id: rowId, tableId } });
    if (!row) {
      throw new NotFoundException('Строка не найдена');
    }
    return row;
  }

  private toView(comment: CustomTableRowComment): CommentView {
    return {
      id: comment.id,
      body: comment.body,
      resolvedAt: comment.resolvedAt,
      createdAt: comment.createdAt,
      author: comment.user
        ? {
            id: comment.user.id,
            // У пользователя может не быть имени — тогда показываем почту.
            name: comment.user.name || comment.user.email || '—',
          }
        : null,
    };
  }

  async listComments(workspaceId: string, tableId: string, rowId: string): Promise<CommentView[]> {
    await this.requireRow(workspaceId, tableId, rowId);
    const comments = await this.commentRepository.find({
      where: { rowId, tableId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return comments.map(comment => this.toView(comment));
  }

  async addComment(
    userId: string,
    workspaceId: string,
    tableId: string,
    rowId: string,
    body: string,
  ): Promise<CommentView> {
    await this.requireRow(workspaceId, tableId, rowId);
    const trimmed = (body ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Комментарий пустой');
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      throw new BadRequestException('Комментарий слишком длинный');
    }

    const saved = await this.commentRepository.save(
      this.commentRepository.create({
        rowId,
        tableId,
        workspaceId,
        userId,
        body: trimmed,
      }),
    );
    const withAuthor = await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    return this.toView(withAuthor ?? saved);
  }

  async setResolved(
    workspaceId: string,
    commentId: string,
    resolved: boolean,
  ): Promise<CommentView> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, workspaceId },
      relations: ['user'],
    });
    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }
    comment.resolvedAt = resolved ? new Date() : null;
    await this.commentRepository.save(comment);
    return this.toView(comment);
  }

  async deleteComment(workspaceId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, workspaceId },
    });
    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }
    await this.commentRepository.delete({ id: commentId });
  }

  /** Счётчики для грида: чтобы было видно, где обсуждение уже идёт. */
  async countOpenByRow(workspaceId: string, tableId: string): Promise<Record<string, number>> {
    const rows = await this.commentRepository
      .createQueryBuilder('c')
      .select('c.rowId', 'row_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.tableId = :tableId', { tableId })
      .andWhere('c.workspaceId = :workspaceId', { workspaceId })
      .andWhere('c.resolvedAt IS NULL')
      .groupBy('c.rowId')
      .getRawMany<{ row_id: string; cnt: string }>();

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.row_id] = Number(row.cnt) || 0;
    }
    return result;
  }
}

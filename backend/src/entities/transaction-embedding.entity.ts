import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Workspace } from './workspace.entity';

/**
 * Vector index for transaction search, kept out of the transactions table.
 *
 * `transactions` is read on nearly every screen; a 384-element array per row
 * would be dragged along by queries that never look at it.
 */
@Entity('transaction_embeddings')
@Index('IDX_transaction_embeddings_workspace', ['workspaceId'])
export class TransactionEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  /** L2-normalised, so similarity is a dot product. */
  @Column({ type: 'real', array: true })
  vector: number[];

  /** Which model produced the vector, so a model change can invalidate rows. */
  @Column({ name: 'model_id', length: 128 })
  modelId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

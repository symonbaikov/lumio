import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum PayableStatus {
  TO_PAY = 'to_pay',
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  OVERDUE = 'overdue',
  ARCHIVED = 'archived',
}

export enum PayableSource {
  STATEMENT = 'statement',
  INVOICE = 'invoice',
  MANUAL = 'manual',
}

@Entity('payables')
@Index('IDX_payables_workspace_status', ['workspaceId', 'status'])
@Index('IDX_payables_workspace_due_date', ['workspaceId', 'dueDate'])
export class Payable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'varchar', length: 255 })
  vendor: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'KZT' })
  currency: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'enum',
    enum: PayableStatus,
    default: PayableStatus.TO_PAY,
  })
  status: PayableStatus;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_transaction_id' })
  linkedTransaction: Transaction | null;

  @Column({ name: 'linked_transaction_id', type: 'uuid', nullable: true })
  linkedTransactionId: string | null;

  @Column({
    type: 'enum',
    enum: PayableSource,
    default: PayableSource.MANUAL,
  })
  source: PayableSource;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'statement_id', type: 'uuid', nullable: true })
  statementId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

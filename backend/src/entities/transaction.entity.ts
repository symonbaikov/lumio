import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { Category } from './category.entity';
import { ImportSession } from './import-session.entity';
import { Statement } from './statement.entity';
import { TaxRate } from './tax-rate.entity';
import { Wallet } from './wallet.entity';
import { Workspace } from './workspace.entity';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('transactions')
@Index('IDX_transactions_workspace_date_amount', ['workspaceId', 'transactionDate', 'amount'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @ManyToOne(
    () => Statement,
    statement => statement.transactions,
    { nullable: true },
  )
  @JoinColumn({ name: 'statement_id' })
  statement: Statement | null;

  @Column({ name: 'statement_id', nullable: true })
  statementId: string | null;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: Date;

  @Column({ name: 'document_number', nullable: true })
  documentNumber: string | null;

  @Column({ name: 'counterparty_name' })
  counterpartyName: string;

  @Column({ name: 'counterparty_bin', nullable: true })
  counterpartyBin: string | null;

  @Column({ name: 'counterparty_account', nullable: true })
  counterpartyAccount: string | null;

  @Column({ name: 'counterparty_bank', nullable: true })
  counterpartyBank: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  debit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  credit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number | null;

  @Column({ default: 'KZT' })
  currency: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate: number | null;

  @Column({ name: 'amount_foreign', type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountForeign: number | null;

  @Column({ name: 'payment_purpose', type: 'text' })
  paymentPurpose: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => TaxRate, { nullable: true })
  @JoinColumn({ name: 'tax_rate_id' })
  taxRate: TaxRate | null;

  @Column({ name: 'tax_rate_id', nullable: true })
  taxRateId: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet | null;

  @Column({ name: 'wallet_id', nullable: true })
  walletId: string | null;

  @Column({ nullable: true })
  article: string | null;

  @Column({ name: 'activity_type', nullable: true })
  activityType: string | null;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_duplicate', default: false })
  isDuplicate: boolean;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'duplicate_of_id' })
  duplicateOf: Transaction | null;

  @Column({ name: 'duplicate_of_id', nullable: true })
  duplicateOfId: string | null;

  @Column({ name: 'duplicate_confidence', type: 'decimal', precision: 3, scale: 2, nullable: true })
  duplicateConfidence: number | null;

  @Column({ name: 'duplicate_match_type', length: 50, nullable: true })
  duplicateMatchType: string | null;

  @Column({ name: 'fingerprint', length: 64, nullable: true })
  fingerprint: string | null;

  @ManyToOne(() => ImportSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'import_session_id' })
  importSession: ImportSession | null;

  @Column({ name: 'import_session_id', nullable: true })
  importSessionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

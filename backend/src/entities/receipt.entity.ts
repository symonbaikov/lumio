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
import { Transaction } from './transaction.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum ReceiptStatus {
  NEW = 'new',
  PARSED = 'parsed',
  NEEDS_REVIEW = 'needs_review',
  DRAFT = 'draft',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export enum ReceiptSource {
  GMAIL = 'gmail',
  UPLOAD = 'upload',
  TELEGRAM = 'telegram',
  SCAN = 'scan',
}

@Entity('receipts')
@Index(['userId'])
@Index(['status'])
@Index(['gmailMessageId'])
@Index(['receivedAt'])
@Index(['duplicateOfId'])
@Index(['isDuplicate'])
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({
    name: 'source',
    type: 'enum',
    enum: ReceiptSource,
    default: ReceiptSource.GMAIL,
  })
  source: ReceiptSource;

  @Column({ name: 'gmail_message_id', nullable: true })
  gmailMessageId: string | null;

  @Column({ name: 'gmail_thread_id', nullable: true })
  gmailThreadId: string | null;

  @Column()
  subject: string;

  @Column()
  sender: string;

  @Column({ name: 'received_at', type: 'timestamp' })
  receivedAt: Date;

  @Column({
    type: 'enum',
    enum: ReceiptStatus,
    default: ReceiptStatus.DRAFT,
  })
  status: ReceiptStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    attachments?: Array<{
      id: string;
      filename: string;
      mimeType: string;
      size: number;
    }>;
    labels?: string[];
    snippet?: string;
    potentialDuplicates?: string[];
  };

  @Column({ type: 'jsonb', nullable: true, name: 'parsed_data' })
  parsedData: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    category?: string;
    categoryId?: string;
    tax?: number;
    taxRate?: number;
    subtotal?: number;
    lineItems?: Array<{
      description: string;
      amount: number;
    }>;
    transactionType?: 'income' | 'expense' | 'transfer' | 'unknown';
    confidence?: number;
    validationIssues?: string[];
  };

  @Column({ type: 'text', array: true, nullable: true, name: 'attachment_paths' })
  attachmentPaths: string[];

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'tax_amount' })
  taxAmount: number | null;

  @Column({ name: 'duplicate_of_id', type: 'uuid', nullable: true })
  duplicateOfId: string | null;

  @ManyToOne(() => Receipt, { nullable: true })
  @JoinColumn({ name: 'duplicate_of_id' })
  duplicateOf: Receipt | null;

  @Column({ name: 'is_duplicate', type: 'boolean', default: false })
  isDuplicate: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

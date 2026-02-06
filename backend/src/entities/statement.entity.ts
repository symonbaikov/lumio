import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { normalizeFilename } from '../common/utils/filename.util';
import { Category } from './category.entity';
import { Folder } from './folder.entity';
import { GoogleSheet } from './google-sheet.entity';
import { Tag } from './tag.entity';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum StatementStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PARSED = 'parsed',
  VALIDATED = 'validated',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum BankName {
  BEREKE_NEW = 'bereke_new',
  BEREKE_OLD = 'bereke_old',
  KASPI = 'kaspi',
  OTHER = 'other',
}

export enum FileType {
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
  IMAGE = 'image',
  DOCX = 'docx',
}

@Entity('statements')
export class Statement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => User,
    user => user.statements,
  )
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @ManyToOne(
    () => GoogleSheet,
    sheet => sheet.statements,
    { nullable: true },
  )
  @JoinColumn({ name: 'google_sheet_id' })
  googleSheet: GoogleSheet | null;

  @Column({ name: 'google_sheet_id', nullable: true })
  googleSheetId: string | null;

  @ManyToOne(() => Folder, { nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder | null;

  @Column({ name: 'folder_id', nullable: true })
  folderId: string | null;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_data', type: 'bytea', nullable: true, select: false })
  fileData: Buffer | null;

  @Column({
    name: 'file_type',
    type: 'enum',
    enum: FileType,
  })
  fileType: FileType;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'file_hash' })
  fileHash: string;

  @Column({
    name: 'bank_name',
    type: 'enum',
    enum: BankName,
  })
  bankName: BankName;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string | null;

  @Column({ name: 'statement_date_from', type: 'date', nullable: true })
  statementDateFrom: Date | null;

  @Column({ name: 'statement_date_to', type: 'date', nullable: true })
  statementDateTo: Date | null;

  @Column({
    type: 'enum',
    enum: StatementStatus,
    default: StatementStatus.UPLOADED,
  })
  status: StatementStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'total_transactions', default: 0 })
  totalTransactions: number;

  @Column({
    name: 'total_debit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalDebit: number;

  @Column({
    name: 'total_credit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalCredit: number;

  @Column({
    name: 'balance_start',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceStart: number | null;

  @Column({
    name: 'balance_end',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceEnd: number | null;

  @Column({ default: 'KZT' })
  currency: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'parsing_attempts', default: 0 })
  parsingAttempts: number;

  @Column({ name: 'parsing_details', type: 'jsonb', nullable: true })
  parsingDetails: {
    detectedBank?: string;
    detectedFormat?: string;
    detectedBy?: string;
    detectedEvidence?: string[];
    otherBankMentions?: string[];
    parserUsed?: string;
    parserVersion?: string;
    totalLinesProcessed?: number;
    transactionsFound?: number;
    transactionsCreated?: number;
    transactionsDeduplicated?: number;
    errors?: string[];
    warnings?: string[];
    metadataExtracted?: {
      accountNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      balanceStart?: number;
      balanceEnd?: number;
      currency?: string;
      rawHeader?: string;
      normalizedHeader?: string;
      periodLabel?: string;
      institution?: string;
      locale?: string;
    };
    validation?: {
      passed: boolean;
      warnings: string[];
      balanceCheck?: {
        expectedEnd?: number;
        actualEnd?: number;
        difference?: number;
        tolerance?: number;
      };
    };
    droppedSamples?: Array<{
      reason: string;
      transaction?: Record<string, any>;
    }>;
    crossStatementDuplicates?: {
      groups: number;
      marked: number;
    };
    importPreview?: Record<string, any>;
    importCommit?: Record<string, any>;
    processingTime?: number; // milliseconds
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
  } | null;

  // Relations
  @OneToMany(
    () => Transaction,
    transaction => transaction.statement,
  )
  transactions: Transaction[];

  @ManyToMany(
    () => Tag,
    tag => tag.statements,
    { cascade: true },
  )
  @JoinTable({
    name: 'statement_tags',
    joinColumn: { name: 'statement_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @AfterLoad()
  private normalizeFileNameAfterLoad() {
    if (this.fileName) {
      this.fileName = normalizeFilename(this.fileName);
    }
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

export enum BalanceAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
}

export enum BalanceAccountSubType {
  NON_CURRENT_ASSET = 'non_current_asset',
  CURRENT_ASSET = 'current_asset',
  CASH = 'cash',
  EQUITY = 'equity',
  BORROWED_CAPITAL = 'borrowed_capital',
}

export enum BalanceAutoSource {
  WALLETS = 'wallets',
  STATEMENTS = 'statements',
  WALLETS_AND_STATEMENTS = 'wallets_and_statements',
  TRANSACTIONS = 'transactions',
}

@Entity('balance_accounts')
@Unique('UQ_balance_accounts_workspace_code', ['workspaceId', 'code'])
export class BalanceAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(
    () => BalanceAccount,
    account => account.children,
    { nullable: true, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'parent_id' })
  parent: BalanceAccount | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @OneToMany(
    () => BalanceAccount,
    account => account.parent,
  )
  children: BalanceAccount[];

  @Column({ length: 80 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'name_en', length: 255, nullable: true })
  nameEn: string | null;

  @Column({ name: 'name_kk', length: 255, nullable: true })
  nameKk: string | null;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: BalanceAccountType,
  })
  accountType: BalanceAccountType;

  @Column({
    name: 'sub_type',
    type: 'enum',
    enum: BalanceAccountSubType,
  })
  subType: BalanceAccountSubType;

  @Column({ name: 'is_editable', default: true })
  isEditable: boolean;

  @Column({ name: 'is_auto_computed', default: false })
  isAutoComputed: boolean;

  @Column({
    name: 'auto_source',
    type: 'enum',
    enum: BalanceAutoSource,
    nullable: true,
  })
  autoSource: BalanceAutoSource | null;

  @Column({ default: 0 })
  position: number;

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  @Column({ name: 'is_expandable', default: false })
  isExpandable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

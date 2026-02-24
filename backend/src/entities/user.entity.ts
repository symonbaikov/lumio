import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthSession } from './auth-session.entity';
import { Branch } from './branch.entity';
import { Category } from './category.entity';
import type { DataEntryType } from './data-entry.entity';
import { GoogleSheet } from './google-sheet.entity';
import { Statement } from './statement.entity';
import { TelegramReport } from './telegram-report.entity';
import { Wallet } from './wallet.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { Workspace } from './workspace.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ name: 'locale', type: 'varchar', length: 8, default: 'ru' })
  locale: string;

  @Column({ name: 'time_zone', type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  @Column({ name: 'onboarding_completed_at', type: 'timestamptz', nullable: true, default: null })
  onboardingCompletedAt: Date | null;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ nullable: true })
  company: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ name: 'last_workspace_id', nullable: true })
  lastWorkspaceId: string | null;

  @Column({ name: 'google_id', nullable: true })
  googleId: string | null;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'telegram_id', nullable: true })
  telegramId: string | null;

  @Column({ name: 'telegram_chat_id', nullable: true })
  telegramChatId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: null,
  })
  permissions: string[] | null;

  @Column({
    name: 'data_entry_hidden_base_tabs',
    type: 'jsonb',
    nullable: false,
    default: () => "'[]'::jsonb",
  })
  dataEntryHiddenBaseTabs: DataEntryType[];

  // Relations
  @OneToMany(
    () => Statement,
    statement => statement.user,
  )
  statements: Statement[];

  @OneToMany(
    () => GoogleSheet,
    sheet => sheet.user,
  )
  googleSheets: GoogleSheet[];

  @OneToMany(
    () => TelegramReport,
    report => report.user,
  )
  telegramReports: TelegramReport[];

  @OneToMany(
    () => Category,
    category => category.user,
  )
  categories: Category[];

  @OneToMany(
    () => Branch,
    branch => branch.user,
  )
  branches: Branch[];

  @OneToMany(
    () => Wallet,
    wallet => wallet.user,
  )
  wallets: Wallet[];

  @OneToMany(
    () => WorkspaceMember,
    membership => membership.user,
  )
  workspaceMemberships: WorkspaceMember[];

  @OneToMany(
    () => AuthSession,
    authSession => authSession.user,
  )
  authSessions: AuthSession[];
}

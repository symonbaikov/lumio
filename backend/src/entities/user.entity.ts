import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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

export enum DateFormatPreference {
  /** Derive the date order from the interface language. */
  AUTO = 'auto',
  DMY = 'dmy',
  MDY = 'mdy',
  YMD = 'ymd',
}

export enum UiDensity {
  COMFORTABLE = 'comfortable',
  COMPACT = 'compact',
}

export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
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

  @Column({
    name: 'date_format',
    type: 'varchar',
    length: 8,
    default: DateFormatPreference.AUTO,
  })
  dateFormat: DateFormatPreference;

  /** 0 = Sunday … 6 = Saturday; null follows the interface language. */
  @Column({ name: 'first_day_of_week', type: 'smallint', nullable: true })
  firstDayOfWeek: number | null;

  @Column({ name: 'ui_density', type: 'varchar', length: 16, default: UiDensity.COMFORTABLE })
  uiDensity: UiDensity;

  /** Turns off non-essential transitions and animations across the interface. */
  @Column({ name: 'reduce_motion', type: 'boolean', default: false })
  reduceMotion: boolean;

  @Column({
    name: 'theme_preference',
    type: 'varchar',
    length: 16,
    default: ThemePreference.AUTO,
  })
  themePreference: ThemePreference;

  @Column({ name: 'onboarding_completed_at', type: 'timestamptz', nullable: true, default: null })
  onboardingCompletedAt: Date | null;

  /**
   * When the user accepted the no-warranty disclaimer. NULL means they have not
   * yet, which is the state every account starts in.
   */
  @Column({ name: 'disclaimer_accepted_at', type: 'timestamptz', nullable: true, default: null })
  disclaimerAcceptedAt: Date | null;

  /**
   * Which revision of the text they accepted. A consent record without this is
   * worthless the first time the wording changes, since there is no way to tell
   * what the user actually agreed to.
   */
  @Column({
    name: 'disclaimer_version',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  disclaimerVersion: string | null;

  /** Base32 TOTP secret, encrypted at rest. Set during setup, before 2FA is confirmed. */
  @Column({ name: 'two_factor_secret', type: 'text', nullable: true, select: false })
  twoFactorSecret: string | null;

  /** Non-null only after the user confirmed a code — 2FA is active from this moment. */
  @Column({ name: 'two_factor_enabled_at', type: 'timestamptz', nullable: true, default: null })
  twoFactorEnabledAt: Date | null;

  /** HMAC-SHA256 hashes of the unused recovery codes. */
  @Column({
    name: 'two_factor_recovery_codes',
    type: 'jsonb',
    nullable: false,
    default: () => "'[]'::jsonb",
    select: false,
  })
  twoFactorRecoveryCodes: string[];

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

  /** Set when the account is deleted; TypeORM hides these rows from every find. */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

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

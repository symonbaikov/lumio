import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

/**
 * A public blockchain address the workspace watches. Read-only by design:
 * we never hold a private key, a seed phrase or a signing session — only an
 * address anyone could read off a block explorer.
 */
@Entity('crypto_wallets')
@Unique('UQ_crypto_wallets_workspace_chain_address', ['workspaceId', 'chainId', 'address'])
export class CryptoWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  /** Always stored lowercase so the unique constraint catches case variants. */
  @Column({ type: 'varchar', length: 42 })
  address: string;

  /** EVM chain id. 1 = Ethereum mainnet, the only chain synced today. */
  @Column({ name: 'chain_id', type: 'int', default: 1 })
  chainId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  /** Last sync failure, kept so the UI can explain a stale wallet. */
  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'connected_by_user_id' })
  connectedByUser: User | null;

  @Column({ name: 'connected_by_user_id', nullable: true })
  connectedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

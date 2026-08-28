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
import { Transaction } from './transaction.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => User,
    user => user.wallets,
  )
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string | null;

  @Column({ name: 'bank_name', nullable: true })
  bankName: string | null;

  @Column({ default: 'KZT' })
  currency: string;

  @Column({ name: 'initial_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  initialBalance: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(
    () => Transaction,
    transaction => transaction.wallet,
  )
  transactions: Transaction[];
}

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
 * A member's own AI provider credentials, used by chat mode in place of the
 * workspace-wide ones. Scoped to (user, workspace): a personal key is entered
 * for the workspace the member is working in and never follows them into
 * another one.
 */
@Entity('user_ai_settings')
@Unique(['userId', 'workspaceId'])
export class UserAiSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config: Record<string, unknown>;

  @Column({ name: 'encrypted_secrets', type: 'jsonb', default: () => "'{}'::jsonb" })
  encryptedSecrets: Record<string, string>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

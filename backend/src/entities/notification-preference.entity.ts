import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_preferences')
@Unique('UQ_notification_preferences_user', ['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'statement_uploaded', type: 'boolean', default: true })
  statementUploaded: boolean;

  @Column({ name: 'import_committed', type: 'boolean', default: true })
  importCommitted: boolean;

  @Column({ name: 'category_changes', type: 'boolean', default: true })
  categoryChanges: boolean;

  @Column({ name: 'member_activity', type: 'boolean', default: true })
  memberActivity: boolean;

  @Column({ name: 'data_deleted', type: 'boolean', default: true })
  dataDeleted: boolean;

  @Column({ name: 'workspace_updated', type: 'boolean', default: true })
  workspaceUpdated: boolean;

  @Column({ name: 'parsing_errors', type: 'boolean', default: true })
  parsingErrors: boolean;

  @Column({ name: 'import_failures', type: 'boolean', default: true })
  importFailures: boolean;

  @Column({ name: 'uncategorized_items', type: 'boolean', default: true })
  uncategorizedItems: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

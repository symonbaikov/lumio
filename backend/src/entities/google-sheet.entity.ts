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
import { GoogleSheetRow } from './google-sheet-row.entity';
import { Statement } from './statement.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity('google_sheets')
export class GoogleSheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => User,
    user => user.googleSheets,
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

  @Column({ name: 'sheet_id' })
  sheetId: string;

  @Column({ name: 'sheet_name' })
  sheetName: string;

  @Column({ name: 'worksheet_name', nullable: true })
  worksheetName: string | null;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_sync', nullable: true })
  lastSync: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(
    () => Statement,
    statement => statement.googleSheet,
  )
  statements: Statement[];

  @OneToMany(
    () => GoogleSheetRow,
    row => row.googleSheet,
  )
  rows: GoogleSheetRow[];
}

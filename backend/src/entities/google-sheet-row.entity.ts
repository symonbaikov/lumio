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
import { GoogleSheet } from './google-sheet.entity';
import { User } from './user.entity';

@Entity('sheet_rows')
@Index('IDX_sheet_rows_unique', ['spreadsheetId', 'sheetName', 'rowNumber'], { unique: true })
export class GoogleSheetRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => GoogleSheet, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'google_sheet_id' })
  googleSheet?: GoogleSheet | null;

  @Column({ name: 'google_sheet_id', type: 'uuid', nullable: true })
  googleSheetId: string | null;

  @Column({ name: 'spreadsheet_id' })
  spreadsheetId: string;

  @Column({ name: 'sheet_name' })
  sheetName: string;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'col_b', type: 'text', nullable: true })
  colB: string | null;

  @Column({ name: 'col_c', type: 'text', nullable: true })
  colC: string | null;

  @Column({ name: 'col_f', type: 'text', nullable: true })
  colF: string | null;

  @Column({ name: 'last_edited_at', type: 'timestamp', nullable: true })
  lastEditedAt: Date | null;

  @Column({ name: 'edited_by', type: 'varchar', nullable: true })
  editedBy: string | null;

  @Column({ name: 'edited_column', type: 'int', nullable: true })
  editedColumn: number | null;

  @Column({ name: 'edited_cell', type: 'varchar', nullable: true })
  editedCell: string | null;

  @Column({ name: 'last_event_id', type: 'varchar', nullable: true })
  lastEventId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

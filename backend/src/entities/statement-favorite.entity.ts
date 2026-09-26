import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Statement } from './statement.entity';
import { User } from './user.entity';

/**
 * A statement one user starred for the Favorites tab of the search panel.
 *
 * Personal rather than a flag on `statements`: every workspace member keeps
 * their own list. The workspace comes from the statement, so a favourite
 * leaves the list with it for the trash and comes back when it is restored.
 */
@Entity('statement_favorites')
@Index('UQ_statement_favorites_user_statement', ['userId', 'statementId'], { unique: true })
@Index('IDX_statement_favorites_statement', ['statementId'])
export class StatementFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Statement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'statement_id' })
  statement: Statement;

  @Column({ name: 'statement_id', type: 'uuid' })
  statementId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

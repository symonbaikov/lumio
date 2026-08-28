import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

/**
 * Stores learned patterns from user corrections for ML-based auto-categorization.
 * Every time a user manually assigns/changes a category, we record it here.
 */
@Entity('category_learning')
@Index(['userId', 'categoryId'])
@Index(['userId', 'createdAt'])
@Index(['workspaceId', 'categoryId'])
@Index(['workspaceId', 'createdAt'])
export class CategoryLearning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  @Index()
  workspaceId: string;

  // CASCADE: паттерны удалённой категории бесполезны, а без FK классификатор
  // продолжал бы советовать несуществующие категории.
  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index()
  categoryId: string;

  /**
   * The payment purpose text that was categorized
   */
  @Column({ name: 'payment_purpose', type: 'text' })
  paymentPurpose: string;

  /**
   * The counterparty name that was categorized (optional)
   */
  @Column({ name: 'counterparty_name', type: 'text', nullable: true })
  counterpartyName: string | null;

  /**
   * How this pattern was learned
   */
  @Column({
    name: 'learned_from',
    type: 'enum',
    enum: ['manual_correction', 'bulk_assignment', 'auto_confirmed', 'ai_classification'],
    default: 'manual_correction',
  })
  learnedFrom: string;

  /**
   * Confidence score (0.0 to 1.0)
   * Higher = more confident this pattern is correct
   */
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
  })
  confidence: number;

  /**
   * Number of times this exact pattern was seen
   * Can be used to boost confidence
   */
  @Column({ type: 'int', default: 1 })
  occurrences: number;

  @CreateDateColumn()
  createdAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  workspaceId: string | null;

  @Column({ type: 'uuid' })
  @Index()
  categoryId: string;

  /**
   * The payment purpose text that was categorized
   */
  @Column({ type: 'text' })
  paymentPurpose: string;

  /**
   * The counterparty name that was categorized (optional)
   */
  @Column({ type: 'text', nullable: true })
  counterpartyName: string | null;

  /**
   * How this pattern was learned
   */
  @Column({
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

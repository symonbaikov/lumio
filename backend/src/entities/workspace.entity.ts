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
import { TaxJurisdiction } from './tax-jurisdiction.entity';
import { User } from './user.entity';
import { WorkspaceMember } from './workspace-member.entity';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'background_image' })
  backgroundImage: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string | null;

  /**
   * Tax jurisdiction this workspace files in. NULL means tax is not configured,
   * which is the state every pre-existing workspace starts in.
   */
  @ManyToOne(() => TaxJurisdiction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tax_jurisdiction_id' })
  taxJurisdiction: TaxJurisdiction | null;

  @Column({ name: 'tax_jurisdiction_id', nullable: true })
  taxJurisdictionId: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_favorite' })
  isFavorite: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown> | null;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @OneToMany(
    () => WorkspaceMember,
    member => member.workspace,
  )
  members: WorkspaceMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

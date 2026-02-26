# Pay Tab – Accounts Payable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full Accounts Payable system with a dedicated `Payable` entity, backend CRUD API, and a rich frontend UI (summary cards, filterable table, status management, transaction linking) — replacing the current localStorage-based stage filter.

**Architecture:** New `Payable` TypeORM entity with PostgreSQL migration. NestJS module (controller + service + DTOs) following the existing Branches pattern. Frontend replaces the current `StatementsListView` reuse in `/statements/pay/` with a dedicated payables view backed by API calls. Three data sources: auto-created from statement workflow, manual creation, and invoice upload. Side panel badge switches from localStorage count to API-driven count.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (backend), Next.js 14 App Router + Tailwind CSS + HeroUI/Mantine + lucide-react (frontend), Jest (testing), class-validator (DTOs), Axios via `apiClient` (data fetching).

---

## Phase 1 — Backend Foundation

### Task 1: Create the Payable entity

**Files:**
- Create: `backend/src/entities/payable.entity.ts`
- Modify: `backend/src/entities/index.ts`
- Test: `backend/@tests/unit/entities/payable.entity.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/entities/payable.entity.spec.ts`:

```typescript
import { Payable, PayableStatus, PayableSource } from '../../../src/entities/payable.entity';

describe('Payable entity', () => {
  it('should instantiate with default values', () => {
    const payable = new Payable();
    expect(payable).toBeDefined();
    expect(payable).toBeInstanceOf(Payable);
  });

  it('should have correct enum values for PayableStatus', () => {
    expect(PayableStatus.TO_PAY).toBe('to_pay');
    expect(PayableStatus.SCHEDULED).toBe('scheduled');
    expect(PayableStatus.PAID).toBe('paid');
    expect(PayableStatus.OVERDUE).toBe('overdue');
    expect(PayableStatus.ARCHIVED).toBe('archived');
  });

  it('should have correct enum values for PayableSource', () => {
    expect(PayableSource.STATEMENT).toBe('statement');
    expect(PayableSource.INVOICE).toBe('invoice');
    expect(PayableSource.MANUAL).toBe('manual');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/entities/payable.entity.spec.ts --no-cache`

Expected: FAIL — module `payable.entity` not found.

**Step 3: Write minimal implementation**

Create `backend/src/entities/payable.entity.ts`:

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Workspace } from './workspace.entity';
import { User } from './user.entity';

export enum PayableStatus {
  TO_PAY = 'to_pay',
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  OVERDUE = 'overdue',
  ARCHIVED = 'archived',
}

export enum PayableSource {
  STATEMENT = 'statement',
  INVOICE = 'invoice',
  MANUAL = 'manual',
}

@Entity('payables')
@Index('IDX_payables_workspace_status', ['workspaceId', 'status'])
@Index('IDX_payables_workspace_due_date', ['workspaceId', 'dueDate'])
export class Payable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'vendor', type: 'varchar', length: 255 })
  vendor: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'KZT' })
  currency: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'enum',
    enum: PayableStatus,
    default: PayableStatus.TO_PAY,
  })
  status: PayableStatus;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_transaction_id' })
  linkedTransaction: Transaction | null;

  @Column({ name: 'linked_transaction_id', type: 'uuid', nullable: true })
  linkedTransactionId: string | null;

  @Column({
    type: 'enum',
    enum: PayableSource,
    default: PayableSource.MANUAL,
  })
  source: PayableSource;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'statement_id', type: 'uuid', nullable: true })
  statementId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

Add to barrel export in `backend/src/entities/index.ts`:

```typescript
export * from './payable.entity';
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/entities/payable.entity.spec.ts --no-cache`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/entities/payable.entity.ts backend/src/entities/index.ts backend/@tests/unit/entities/payable.entity.spec.ts
git commit -m "feat(pay): add Payable entity with status and source enums"
```

---

### Task 2: Create the database migration

**Files:**
- Create: `backend/src/migrations/1763100000000-AddPayables.ts`

**Step 1: Write the migration**

Create `backend/src/migrations/1763100000000-AddPayables.ts`:

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayables1763100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "payable_status_enum" AS ENUM ('to_pay', 'scheduled', 'paid', 'overdue', 'archived')
    `);
    await queryRunner.query(`
      CREATE TYPE "payable_source_enum" AS ENUM ('statement', 'invoice', 'manual')
    `);

    // Create payables table
    await queryRunner.query(`
      CREATE TABLE "payables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "created_by_id" uuid,
        "vendor" varchar(255) NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'KZT',
        "due_date" date,
        "status" "payable_status_enum" NOT NULL DEFAULT 'to_pay',
        "linked_transaction_id" uuid,
        "source" "payable_source_enum" NOT NULL DEFAULT 'manual',
        "is_recurring" boolean NOT NULL DEFAULT false,
        "comment" text,
        "statement_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_payables" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payables_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payables_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payables_linked_transaction" FOREIGN KEY ("linked_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_status" ON "payables" ("workspace_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_due_date" ON "payables" ("workspace_id", "due_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payables_workspace_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payables_workspace_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payables"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payable_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payable_status_enum"`);
  }
}
```

**Step 2: Register migration**

Add the migration class import to the migrations barrel file or data-source configuration (check `backend/src/data-source.ts` for the exact pattern of migration registration).

**Step 3: Run migration**

Run: `cd backend && npm run migration:run`

Expected: Migration applies successfully, `payables` table created.

**Step 4: Commit**

```bash
git add backend/src/migrations/1763100000000-AddPayables.ts
git commit -m "feat(pay): add payables database migration"
```

---

### Task 3: Add Payable permissions and audit entity type

**Files:**
- Modify: `backend/src/common/enums/permissions.enum.ts`
- Modify: `backend/src/entities/audit-event.entity.ts`
- Modify: `backend/src/entities/notification.entity.ts`

**Step 1: Add permissions**

In `backend/src/common/enums/permissions.enum.ts`, add after the Wallets section:

```typescript
  // Payables
  PAYABLE_VIEW = 'payable.view',
  PAYABLE_CREATE = 'payable.create',
  PAYABLE_EDIT = 'payable.edit',
  PAYABLE_DELETE = 'payable.delete',
```

Update `ROLE_PERMISSIONS`:
- `admin`: already gets all via `Object.values(Permission)`
- `user` array: add `Permission.PAYABLE_VIEW`
- `viewer` array: add `Permission.PAYABLE_VIEW`

**Step 2: Add EntityType for audit**

In `backend/src/entities/audit-event.entity.ts`, add to the `EntityType` enum:

```typescript
  PAYABLE = 'payable',
```

**Step 3: Add NotificationType for payables**

In `backend/src/entities/notification.entity.ts`, add to `NotificationType` enum:

```typescript
  PAYABLE_DUE_SOON = 'payable.due_soon',
  PAYABLE_OVERDUE = 'payable.overdue',
  PAYABLE_MARKED_PAID = 'payable.marked_paid',
```

**Step 4: Commit**

```bash
git add backend/src/common/enums/permissions.enum.ts backend/src/entities/audit-event.entity.ts backend/src/entities/notification.entity.ts
git commit -m "feat(pay): add payable permissions, audit entity type, and notification types"
```

---

### Task 4: Create Payable DTOs

**Files:**
- Create: `backend/src/modules/payables/dto/create-payable.dto.ts`
- Create: `backend/src/modules/payables/dto/update-payable.dto.ts`
- Create: `backend/src/modules/payables/dto/payable-query.dto.ts`
- Test: `backend/@tests/unit/modules/payables/payables.dto.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/modules/payables/payables.dto.spec.ts`:

```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePayableDto } from '../../../../src/modules/payables/dto/create-payable.dto';
import { UpdatePayableDto } from '../../../../src/modules/payables/dto/update-payable.dto';

describe('Payable DTOs', () => {
  describe('CreatePayableDto', () => {
    it('should pass with valid required fields', async () => {
      const dto = plainToInstance(CreatePayableDto, {
        vendor: 'Acme Corp',
        amount: 1500.50,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail without vendor', async () => {
      const dto = plainToInstance(CreatePayableDto, {
        amount: 1500.50,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('vendor');
    });

    it('should fail without amount', async () => {
      const dto = plainToInstance(CreatePayableDto, {
        vendor: 'Acme Corp',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with all optional fields', async () => {
      const dto = plainToInstance(CreatePayableDto, {
        vendor: 'Acme Corp',
        amount: 500,
        currency: 'USD',
        dueDate: '2026-03-15',
        source: 'invoice',
        isRecurring: true,
        comment: 'Monthly rent',
        linkedTransactionId: '550e8400-e29b-41d4-a716-446655440000',
        statementId: '550e8400-e29b-41d4-a716-446655440001',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdatePayableDto', () => {
    it('should pass with no fields (all optional)', async () => {
      const dto = plainToInstance(UpdatePayableDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with status change', async () => {
      const dto = plainToInstance(UpdatePayableDto, {
        status: 'paid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.dto.spec.ts --no-cache`

Expected: FAIL — modules not found.

**Step 3: Write minimal implementation**

Create `backend/src/modules/payables/dto/create-payable.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PayableSource } from '../../../entities/payable.entity';

export class CreatePayableDto {
  @IsString()
  vendor: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(PayableSource)
  @IsOptional()
  source?: PayableSource;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsUUID()
  @IsOptional()
  linkedTransactionId?: string;

  @IsUUID()
  @IsOptional()
  statementId?: string;
}
```

Create `backend/src/modules/payables/dto/update-payable.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PayableStatus, PayableSource } from '../../../entities/payable.entity';

export class UpdatePayableDto {
  @IsString()
  @IsOptional()
  vendor?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(PayableStatus)
  @IsOptional()
  status?: PayableStatus;

  @IsEnum(PayableSource)
  @IsOptional()
  source?: PayableSource;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsUUID()
  @IsOptional()
  linkedTransactionId?: string;
}
```

Create `backend/src/modules/payables/dto/payable-query.dto.ts`:

```typescript
import { IsOptional, IsEnum, IsString, IsNumberString } from 'class-validator';
import { PayableStatus } from '../../../entities/payable.entity';

export class PayableQueryDto {
  @IsOptional()
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  dueDateFrom?: string;

  @IsOptional()
  @IsString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  filter?: 'overdue' | 'due_today' | 'due_this_week' | 'paid';

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.dto.spec.ts --no-cache`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/payables/dto/ backend/@tests/unit/modules/payables/payables.dto.spec.ts
git commit -m "feat(pay): add payable DTOs with validation"
```

---

### Task 5: Create PayablesService

**Files:**
- Create: `backend/src/modules/payables/payables.service.ts`
- Test: `backend/@tests/unit/modules/payables/payables.service.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/modules/payables/payables.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PayablesService } from '../../../../src/modules/payables/payables.service';
import { Payable, PayableStatus } from '../../../../src/entities/payable.entity';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    clone: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  })),
});

describe('PayablesService', () => {
  let service: PayablesService;
  let repository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    repository = mockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayablesService,
        {
          provide: getRepositoryToken(Payable),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<PayablesService>(PayablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payable', async () => {
      const dto = { vendor: 'Acme Corp', amount: 1500 };
      const workspaceId = 'ws-1';
      const userId = 'user-1';
      const payable = { id: 'p-1', ...dto, workspaceId, createdById: userId };

      repository.create.mockReturnValue(payable);
      repository.save.mockResolvedValue(payable);

      const result = await service.create(workspaceId, userId, dto as any);

      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId,
        createdById: userId,
      });
      expect(repository.save).toHaveBeenCalledWith(payable);
      expect(result).toEqual(payable);
    });
  });

  describe('findOne', () => {
    it('should return a payable by id and workspace', async () => {
      const payable = { id: 'p-1', workspaceId: 'ws-1', vendor: 'Test' };
      repository.findOne.mockResolvedValue(payable);

      const result = await service.findOne('p-1', 'ws-1');
      expect(result).toEqual(payable);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('p-999', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a payable', async () => {
      const existing = { id: 'p-1', workspaceId: 'ws-1', vendor: 'Old', amount: 100, status: PayableStatus.TO_PAY };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue({ ...existing, vendor: 'New' });

      const result = await service.update('p-1', 'ws-1', { vendor: 'New' } as any);
      expect(result.vendor).toBe('New');
    });
  });

  describe('markAsPaid', () => {
    it('should set status to PAID and link transaction', async () => {
      const existing = { id: 'p-1', workspaceId: 'ws-1', status: PayableStatus.TO_PAY };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation(entity => Promise.resolve(entity));

      const result = await service.markAsPaid('p-1', 'ws-1', 'txn-1');
      expect(result.status).toBe(PayableStatus.PAID);
      expect(result.linkedTransactionId).toBe('txn-1');
    });
  });

  describe('remove', () => {
    it('should soft-delete a payable', async () => {
      const existing = { id: 'p-1', workspaceId: 'ws-1' };
      repository.findOne.mockResolvedValue(existing);
      repository.softRemove.mockResolvedValue(existing);

      await service.remove('p-1', 'ws-1');
      expect(repository.softRemove).toHaveBeenCalledWith(existing);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.service.spec.ts --no-cache`

Expected: FAIL — `PayablesService` not found.

**Step 3: Write minimal implementation**

Create `backend/src/modules/payables/payables.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Payable, PayableStatus } from '../../entities/payable.entity';
import type { CreatePayableDto } from './dto/create-payable.dto';
import type { UpdatePayableDto } from './dto/update-payable.dto';
import type { PayableQueryDto } from './dto/payable-query.dto';

@Injectable()
export class PayablesService {
  constructor(
    @InjectRepository(Payable)
    private readonly payableRepository: Repository<Payable>,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreatePayableDto): Promise<Payable> {
    const payable = this.payableRepository.create({
      ...dto,
      workspaceId,
      createdById: userId,
    });
    return this.payableRepository.save(payable);
  }

  async findAll(
    workspaceId: string,
    query: PayableQueryDto,
  ): Promise<{ data: Payable[]; total: number; page: number; limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const qb = this.payableRepository
      .createQueryBuilder('payable')
      .where('payable.workspace_id = :workspaceId', { workspaceId });

    // Status filter
    if (query.status) {
      qb.andWhere('payable.status = :status', { status: query.status });
    }

    // Vendor search
    if (query.vendor) {
      qb.andWhere('payable.vendor ILIKE :vendor', { vendor: `%${query.vendor}%` });
    }

    // Due date range
    if (query.dueDateFrom) {
      qb.andWhere('payable.due_date >= :dueDateFrom', { dueDateFrom: query.dueDateFrom });
    }
    if (query.dueDateTo) {
      qb.andWhere('payable.due_date <= :dueDateTo', { dueDateTo: query.dueDateTo });
    }

    // Shortcut filters
    if (query.filter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      switch (query.filter) {
        case 'overdue':
          qb.andWhere('payable.due_date < :today', { today: todayStr });
          qb.andWhere('payable.status != :paidStatus', { paidStatus: PayableStatus.PAID });
          qb.andWhere('payable.status != :archivedStatus', { archivedStatus: PayableStatus.ARCHIVED });
          break;
        case 'due_today':
          qb.andWhere('payable.due_date = :today', { today: todayStr });
          break;
        case 'due_this_week': {
          const endOfWeek = new Date(today);
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
          qb.andWhere('payable.due_date >= :today', { today: todayStr });
          qb.andWhere('payable.due_date <= :endOfWeek', {
            endOfWeek: endOfWeek.toISOString().slice(0, 10),
          });
          break;
        }
        case 'paid':
          qb.andWhere('payable.status = :paidStatus', { paidStatus: PayableStatus.PAID });
          break;
      }
    }

    qb.orderBy(`payable.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, workspaceId: string): Promise<Payable> {
    const payable = await this.payableRepository.findOne({
      where: { id, workspaceId },
    });
    if (!payable) {
      throw new NotFoundException(`Payable with id ${id} not found`);
    }
    return payable;
  }

  async update(id: string, workspaceId: string, dto: UpdatePayableDto): Promise<Payable> {
    const payable = await this.findOne(id, workspaceId);
    Object.assign(payable, dto);
    return this.payableRepository.save(payable);
  }

  async markAsPaid(id: string, workspaceId: string, linkedTransactionId?: string): Promise<Payable> {
    const payable = await this.findOne(id, workspaceId);
    payable.status = PayableStatus.PAID;
    if (linkedTransactionId) {
      payable.linkedTransactionId = linkedTransactionId;
    }
    return this.payableRepository.save(payable);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const payable = await this.findOne(id, workspaceId);
    await this.payableRepository.softRemove(payable);
  }

  async getSummary(workspaceId: string): Promise<{
    toPay: number;
    overdue: number;
    dueThisWeek: number;
    paidThisMonth: number;
    totalToPayAmount: number;
    totalOverdueAmount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);

    const qb = this.payableRepository.createQueryBuilder('p')
      .where('p.workspace_id = :workspaceId', { workspaceId })
      .andWhere('p.deleted_at IS NULL');

    const toPay = await qb.clone()
      .andWhere('p.status = :s', { s: PayableStatus.TO_PAY })
      .getCount();

    const overdue = await qb.clone()
      .andWhere('p.due_date < :today', { today: todayStr })
      .andWhere('p.status NOT IN (:...excluded)', { excluded: [PayableStatus.PAID, PayableStatus.ARCHIVED] })
      .getCount();

    const dueThisWeek = await qb.clone()
      .andWhere('p.due_date >= :today', { today: todayStr })
      .andWhere('p.due_date <= :endOfWeek', { endOfWeek: endOfWeekStr })
      .andWhere('p.status NOT IN (:...excluded)', { excluded: [PayableStatus.PAID, PayableStatus.ARCHIVED] })
      .getCount();

    const paidThisMonth = await qb.clone()
      .andWhere('p.status = :s', { s: PayableStatus.PAID })
      .andWhere('p.updated_at >= :startOfMonth', { startOfMonth: startOfMonthStr })
      .getCount();

    const totalToPayResult = await qb.clone()
      .andWhere('p.status = :s', { s: PayableStatus.TO_PAY })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne();

    const totalOverdueResult = await qb.clone()
      .andWhere('p.due_date < :today', { today: todayStr })
      .andWhere('p.status NOT IN (:...excluded)', { excluded: [PayableStatus.PAID, PayableStatus.ARCHIVED] })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne();

    return {
      toPay,
      overdue,
      dueThisWeek,
      paidThisMonth,
      totalToPayAmount: Number(totalToPayResult?.total ?? 0),
      totalOverdueAmount: Number(totalOverdueResult?.total ?? 0),
    };
  }

  async getCount(workspaceId: string): Promise<number> {
    return this.payableRepository
      .createQueryBuilder('p')
      .where('p.workspace_id = :workspaceId', { workspaceId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('p.status NOT IN (:...excluded)', { excluded: [PayableStatus.PAID, PayableStatus.ARCHIVED] })
      .getCount();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.service.spec.ts --no-cache`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/payables/payables.service.ts backend/@tests/unit/modules/payables/payables.service.spec.ts
git commit -m "feat(pay): add PayablesService with CRUD, summary, and filtering"
```

---

### Task 6: Create PayablesController

**Files:**
- Create: `backend/src/modules/payables/payables.controller.ts`
- Test: `backend/@tests/unit/modules/payables/payables.controller.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/modules/payables/payables.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PayablesController } from '../../../../src/modules/payables/payables.controller';
import { PayablesService } from '../../../../src/modules/payables/payables.service';
import { PayableStatus } from '../../../../src/entities/payable.entity';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  markAsPaid: jest.fn(),
  remove: jest.fn(),
  getSummary: jest.fn(),
  getCount: jest.fn(),
};

describe('PayablesController', () => {
  let controller: PayablesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayablesController],
      providers: [{ provide: PayablesService, useValue: mockService }],
    }).compile();

    controller = module.get<PayablesController>(PayablesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /payables', () => {
    it('should create a payable', async () => {
      const dto = { vendor: 'Acme', amount: 100 };
      const expected = { id: 'p-1', ...dto };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create('ws-1', { userId: 'u-1' } as any, dto as any);
      expect(mockService.create).toHaveBeenCalledWith('ws-1', 'u-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /payables', () => {
    it('should return paginated payables', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 25 };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('ws-1', {});
      expect(result).toEqual(expected);
    });
  });

  describe('GET /payables/summary', () => {
    it('should return summary counts', async () => {
      const summary = { toPay: 5, overdue: 2, dueThisWeek: 3, paidThisMonth: 10, totalToPayAmount: 5000, totalOverdueAmount: 2000 };
      mockService.getSummary.mockResolvedValue(summary);

      const result = await controller.getSummary('ws-1');
      expect(result).toEqual(summary);
    });
  });

  describe('GET /payables/count', () => {
    it('should return active payable count', async () => {
      mockService.getCount.mockResolvedValue(7);
      const result = await controller.getCount('ws-1');
      expect(result).toEqual({ count: 7 });
    });
  });

  describe('PUT /payables/:id', () => {
    it('should update a payable', async () => {
      const dto = { vendor: 'Updated' };
      const expected = { id: 'p-1', vendor: 'Updated' };
      mockService.update.mockResolvedValue(expected);

      const result = await controller.update('p-1', 'ws-1', dto as any);
      expect(result).toEqual(expected);
    });
  });

  describe('PUT /payables/:id/mark-paid', () => {
    it('should mark as paid', async () => {
      const expected = { id: 'p-1', status: PayableStatus.PAID };
      mockService.markAsPaid.mockResolvedValue(expected);

      const result = await controller.markAsPaid('p-1', 'ws-1', { linkedTransactionId: 'txn-1' });
      expect(result).toEqual(expected);
    });
  });

  describe('DELETE /payables/:id', () => {
    it('should soft-delete a payable', async () => {
      mockService.remove.mockResolvedValue(undefined);
      await controller.remove('p-1', 'ws-1');
      expect(mockService.remove).toHaveBeenCalledWith('p-1', 'ws-1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.controller.spec.ts --no-cache`

Expected: FAIL — `PayablesController` not found.

**Step 3: Write minimal implementation**

Create `backend/src/modules/payables/payables.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../auth/guards/workspace-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { WorkspaceId } from '../auth/decorators/workspace-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { EntityType } from '../../entities/audit-event.entity';
import { PayablesService } from './payables.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { PayableQueryDto } from './dto/payable-query.dto';
import type { User } from '../../entities/user.entity';

@Controller('payables')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_CREATE)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  async create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePayableDto,
  ) {
    return this.payablesService.create(workspaceId, user.userId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: PayableQueryDto,
  ) {
    return this.payablesService.findAll(workspaceId, query);
  }

  @Get('summary')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async getSummary(@WorkspaceId() workspaceId: string) {
    return this.payablesService.getSummary(workspaceId);
  }

  @Get('count')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async getCount(@WorkspaceId() workspaceId: string) {
    const count = await this.payablesService.getCount(workspaceId);
    return { count };
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_VIEW)
  async findOne(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.findOne(id, workspaceId);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  async update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdatePayableDto,
  ) {
    return this.payablesService.update(id, workspaceId, dto);
  }

  @Put(':id/mark-paid')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_EDIT)
  @Audit({ entityType: EntityType.PAYABLE, includeDiff: true })
  async markAsPaid(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() body: { linkedTransactionId?: string },
  ) {
    return this.payablesService.markAsPaid(id, workspaceId, body.linkedTransactionId);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PAYABLE_DELETE)
  @Audit({ entityType: EntityType.PAYABLE })
  async remove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.payablesService.remove(id, workspaceId);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.controller.spec.ts --no-cache`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/payables/payables.controller.ts backend/@tests/unit/modules/payables/payables.controller.spec.ts
git commit -m "feat(pay): add PayablesController with CRUD, summary, and mark-paid endpoints"
```

---

### Task 7: Create PayablesModule and register in AppModule

**Files:**
- Create: `backend/src/modules/payables/payables.module.ts`
- Modify: `backend/src/app.module.ts`

**Step 1: Create the module**

Create `backend/src/modules/payables/payables.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payable } from '../../entities/payable.entity';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payable])],
  controllers: [PayablesController],
  providers: [PayablesService],
  exports: [PayablesService],
})
export class PayablesModule {}
```

**Step 2: Register in AppModule**

In `backend/src/app.module.ts`:

1. Add import at the top:
```typescript
import { PayablesModule } from './modules/payables/payables.module';
```

2. Add `Payable` to the `TypeOrmModule.forFeature([...])` array (root entity registration).

3. Add `PayablesModule` to the `imports: [...]` array.

**Step 3: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add backend/src/modules/payables/payables.module.ts backend/src/app.module.ts
git commit -m "feat(pay): register PayablesModule in AppModule"
```

---

## Phase 2 — Frontend Pay Tab UI

### Task 8: Create frontend API helpers for payables

**Files:**
- Create: `frontend/app/lib/payables-api.ts`

**Step 1: Write the API client helper**

Create `frontend/app/lib/payables-api.ts`:

```typescript
import apiClient from './api';

export interface Payable {
  id: string;
  workspaceId: string;
  createdById: string | null;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  status: PayableStatus;
  linkedTransactionId: string | null;
  source: PayableSource;
  isRecurring: boolean;
  comment: string | null;
  statementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayableStatus = 'to_pay' | 'scheduled' | 'paid' | 'overdue' | 'archived';
export type PayableSource = 'statement' | 'invoice' | 'manual';

export interface PayableSummary {
  toPay: number;
  overdue: number;
  dueThisWeek: number;
  paidThisMonth: number;
  totalToPayAmount: number;
  totalOverdueAmount: number;
}

export interface PayableListResponse {
  data: Payable[];
  total: number;
  page: number;
  limit: number;
}

export interface PayableQueryParams {
  status?: PayableStatus;
  vendor?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  filter?: 'overdue' | 'due_today' | 'due_this_week' | 'paid';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreatePayableParams {
  vendor: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  source?: PayableSource;
  isRecurring?: boolean;
  comment?: string;
  linkedTransactionId?: string;
  statementId?: string;
}

export interface UpdatePayableParams {
  vendor?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  status?: PayableStatus;
  source?: PayableSource;
  isRecurring?: boolean;
  comment?: string;
  linkedTransactionId?: string;
}

export async function fetchPayables(params?: PayableQueryParams): Promise<PayableListResponse> {
  const response = await apiClient.get('/payables', { params });
  return response.data;
}

export async function fetchPayable(id: string): Promise<Payable> {
  const response = await apiClient.get(`/payables/${id}`);
  return response.data;
}

export async function fetchPayableSummary(): Promise<PayableSummary> {
  const response = await apiClient.get('/payables/summary');
  return response.data;
}

export async function fetchPayableCount(): Promise<number> {
  const response = await apiClient.get('/payables/count');
  return response.data.count;
}

export async function createPayable(data: CreatePayableParams): Promise<Payable> {
  const response = await apiClient.post('/payables', data);
  return response.data;
}

export async function updatePayable(id: string, data: UpdatePayableParams): Promise<Payable> {
  const response = await apiClient.put(`/payables/${id}`, data);
  return response.data;
}

export async function markPayableAsPaid(
  id: string,
  linkedTransactionId?: string,
): Promise<Payable> {
  const response = await apiClient.put(`/payables/${id}/mark-paid`, { linkedTransactionId });
  return response.data;
}

export async function deletePayable(id: string): Promise<void> {
  await apiClient.delete(`/payables/${id}`);
}
```

**Step 2: Commit**

```bash
git add frontend/app/lib/payables-api.ts
git commit -m "feat(pay): add frontend API helpers for payables"
```

---

### Task 9: Create PaySummaryCards component

**Files:**
- Create: `frontend/app/(main)/statements/pay/components/PaySummaryCards.tsx`

**Step 1: Build the summary cards component**

Create `frontend/app/(main)/statements/pay/components/PaySummaryCards.tsx`:

```tsx
'use client';

import type { PayableSummary } from '@/app/lib/payables-api';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2 } from 'lucide-react';

interface Props {
  summary: PayableSummary | null;
  loading: boolean;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

interface SummaryCard {
  id: string;
  label: string;
  count: number;
  amount: number | null;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  filter: string | null;
}

export default function PaySummaryCards({ summary, loading, activeFilter, onFilterChange }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>
    );
  }

  const cards: SummaryCard[] = [
    {
      id: 'to_pay',
      label: 'To pay',
      count: summary.toPay,
      amount: summary.totalToPayAmount,
      icon: <Banknote className="h-4 w-4" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      filter: null,
    },
    {
      id: 'overdue',
      label: 'Overdue',
      count: summary.overdue,
      amount: summary.totalOverdueAmount,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      filter: 'overdue',
    },
    {
      id: 'due_this_week',
      label: 'Due this week',
      count: summary.dueThisWeek,
      amount: null,
      icon: <CalendarClock className="h-4 w-4" />,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      filter: 'due_this_week',
    },
    {
      id: 'paid_this_month',
      label: 'Paid this month',
      count: summary.paidThisMonth,
      amount: null,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      filter: 'paid',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(card => {
        const isActive = activeFilter === card.filter;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterChange(isActive ? null : card.filter)}
            className={`
              flex flex-col gap-1 rounded-xl border p-4 text-left transition-all
              ${isActive
                ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200 dark:border-blue-700 dark:bg-blue-950/20 dark:ring-blue-800'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
              }
            `}
          >
            <div className={`flex items-center gap-2 ${card.color}`}>
              <div className={`rounded-lg p-1.5 ${card.bgColor}`}>{card.icon}</div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {card.count}
              </span>
              {card.amount !== null && card.amount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'KZT',
                    maximumFractionDigits: 0,
                  }).format(card.amount)}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/pay/components/PaySummaryCards.tsx
git commit -m "feat(pay): add PaySummaryCards component"
```

---

### Task 10: Create PayablesTable component

**Files:**
- Create: `frontend/app/(main)/statements/pay/components/PayablesTable.tsx`

**Step 1: Build the table component**

Create `frontend/app/(main)/statements/pay/components/PayablesTable.tsx`:

```tsx
'use client';

import type { Payable, PayableStatus } from '@/app/lib/payables-api';
import { CheckCircle2, Edit3, Link2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  payables: Payable[];
  loading: boolean;
  onMarkAsPaid: (id: string) => void;
  onEdit: (payable: Payable) => void;
  onDelete: (id: string) => void;
  onLinkTransaction: (id: string) => void;
}

const STATUS_CONFIG: Record<
  PayableStatus,
  { label: string; className: string }
> = {
  to_pay: {
    label: 'To pay',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  archived: {
    label: 'Archived',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
};

const SOURCE_LABELS: Record<string, string> = {
  statement: 'Statement',
  invoice: 'Invoice',
  manual: 'Manual',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(payable: Payable): boolean {
  if (!payable.dueDate) return false;
  if (payable.status === 'paid' || payable.status === 'archived') return false;
  return new Date(payable.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

export default function PayablesTable({
  payables,
  loading,
  onMarkAsPaid,
  onEdit,
  onDelete,
  onLinkTransaction,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>
    );
  }

  if (payables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
          <CheckCircle2 className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No payables found
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Create a new payment obligation or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Vendor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Due date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Source</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payables.map(payable => {
            const statusConfig = STATUS_CONFIG[payable.status] || STATUS_CONFIG.to_pay;
            const overdue = isOverdue(payable);
            const menuOpen = openMenuId === payable.id;

            return (
              <tr
                key={payable.id}
                className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 dark:border-gray-800/50 dark:hover:bg-gray-900/30"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {payable.vendor}
                  </span>
                  {payable.isRecurring && (
                    <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      Recurring
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                  {formatCurrency(payable.amount, payable.currency)}
                </td>
                <td className={`px-4 py-3 ${overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {formatDate(payable.dueDate)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {SOURCE_LABELS[payable.source] || payable.source}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(menuOpen ? null : payable.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {payable.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => { onMarkAsPaid(payable.id); setOpenMenuId(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Mark as paid
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { onLinkTransaction(payable.id); setOpenMenuId(null); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Link2 className="h-4 w-4 text-blue-500" />
                          Link transaction
                        </button>
                        <button
                          type="button"
                          onClick={() => { onEdit(payable); setOpenMenuId(null); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { onDelete(payable.id); setOpenMenuId(null); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/pay/components/PayablesTable.tsx
git commit -m "feat(pay): add PayablesTable component with status colors and inline actions"
```

---

### Task 11: Create CreatePayableModal component

**Files:**
- Create: `frontend/app/(main)/statements/pay/components/CreatePayableModal.tsx`

**Step 1: Build the create/edit modal**

Create `frontend/app/(main)/statements/pay/components/CreatePayableModal.tsx`:

```tsx
'use client';

import type { Payable, CreatePayableParams, UpdatePayableParams } from '@/app/lib/payables-api';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  open: boolean;
  payable: Payable | null; // null = create mode, non-null = edit mode
  onClose: () => void;
  onSubmit: (data: CreatePayableParams | UpdatePayableParams) => Promise<void>;
}

export default function CreatePayableModal({ open, payable, onClose, onSubmit }: Props) {
  const isEdit = payable !== null;
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KZT');
  const [dueDate, setDueDate] = useState('');
  const [source, setSource] = useState<'manual' | 'invoice' | 'statement'>('manual');
  const [isRecurring, setIsRecurring] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payable) {
      setVendor(payable.vendor);
      setAmount(String(payable.amount));
      setCurrency(payable.currency);
      setDueDate(payable.dueDate ? payable.dueDate.slice(0, 10) : '');
      setSource(payable.source);
      setIsRecurring(payable.isRecurring);
      setComment(payable.comment || '');
    } else {
      setVendor('');
      setAmount('');
      setCurrency('KZT');
      setDueDate('');
      setSource('manual');
      setIsRecurring(false);
      setComment('');
    }
  }, [payable, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!vendor.trim() || !amount) return;

      setSubmitting(true);
      try {
        const data: CreatePayableParams | UpdatePayableParams = {
          vendor: vendor.trim(),
          amount: Number(amount),
          currency,
          ...(dueDate ? { dueDate } : {}),
          source,
          isRecurring,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        };
        await onSubmit(data);
        onClose();
      } finally {
        setSubmitting(false);
      }
    },
    [vendor, amount, currency, dueDate, source, isRecurring, comment, onSubmit, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit payable' : 'New payable'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vendor / Counterparty *
            </label>
            <input
              type="text"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              required
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount *
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="KZT">KZT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Source
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as any)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="manual">Manual</option>
                <option value="invoice">Invoice</option>
                <option value="statement">Statement</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Recurring
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder="Optional note..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !vendor.trim() || !amount}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/pay/components/CreatePayableModal.tsx
git commit -m "feat(pay): add CreatePayableModal component for create/edit flow"
```

---

### Task 12: Create the main PayView component

**Files:**
- Create: `frontend/app/(main)/statements/pay/components/PayView.tsx`

**Step 1: Build the orchestrating view component**

Create `frontend/app/(main)/statements/pay/components/PayView.tsx`:

```tsx
'use client';

import {
  type Payable,
  type PayableQueryParams,
  type PayableSummary,
  type CreatePayableParams,
  type UpdatePayableParams,
  fetchPayables,
  fetchPayableSummary,
  createPayable,
  updatePayable,
  markPayableAsPaid,
  deletePayable,
} from '@/app/lib/payables-api';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CreatePayableModal from './CreatePayableModal';
import PaySummaryCards from './PaySummaryCards';
import PayablesTable from './PayablesTable';

export default function PayView() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [summary, setSummary] = useState<PayableSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);

  const loadPayables = useCallback(async () => {
    setLoading(true);
    try {
      const params: PayableQueryParams = { page, limit: 25 };
      if (activeFilter) {
        params.filter = activeFilter as PayableQueryParams['filter'];
      }
      const result = await fetchPayables(params);
      setPayables(result.data);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load payables');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await fetchPayableSummary();
      setSummary(result);
    } catch {
      // Summary is non-critical, silently fail
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleFilterChange = useCallback((filter: string | null) => {
    setActiveFilter(filter);
    setPage(1);
  }, []);

  const handleCreate = useCallback(
    async (data: CreatePayableParams | UpdatePayableParams) => {
      await createPayable(data as CreatePayableParams);
      toast.success('Payable created');
      loadPayables();
      loadSummary();
    },
    [loadPayables, loadSummary],
  );

  const handleUpdate = useCallback(
    async (data: CreatePayableParams | UpdatePayableParams) => {
      if (!editingPayable) return;
      await updatePayable(editingPayable.id, data as UpdatePayableParams);
      toast.success('Payable updated');
      setEditingPayable(null);
      loadPayables();
      loadSummary();
    },
    [editingPayable, loadPayables, loadSummary],
  );

  const handleMarkAsPaid = useCallback(
    async (id: string) => {
      try {
        await markPayableAsPaid(id);
        toast.success('Marked as paid');
        loadPayables();
        loadSummary();
      } catch {
        toast.error('Failed to mark as paid');
      }
    },
    [loadPayables, loadSummary],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deletePayable(id);
        toast.success('Payable deleted');
        loadPayables();
        loadSummary();
      } catch {
        toast.error('Failed to delete payable');
      }
    },
    [loadPayables, loadSummary],
  );

  const handleEdit = useCallback((payable: Payable) => {
    setEditingPayable(payable);
    setModalOpen(true);
  }, []);

  const handleLinkTransaction = useCallback((id: string) => {
    // Phase 2: open a transaction picker modal
    toast('Transaction linking coming soon', { icon: 'i' });
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingPayable(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingPayable(null);
  }, []);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pay</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage your payment obligations
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New payable
        </button>
      </div>

      {/* Summary Cards */}
      <PaySummaryCards
        summary={summary}
        loading={summaryLoading}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Table */}
      <PayablesTable
        payables={payables}
        loading={loading}
        onMarkAsPaid={handleMarkAsPaid}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLinkTransaction={handleLinkTransaction}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreatePayableModal
        open={modalOpen}
        payable={editingPayable}
        onClose={handleCloseModal}
        onSubmit={editingPayable ? handleUpdate : handleCreate}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/pay/components/PayView.tsx
git commit -m "feat(pay): add PayView orchestrating component with full CRUD flow"
```

---

### Task 13: Wire up the Pay page and update side panel badge

**Files:**
- Modify: `frontend/app/(main)/statements/pay/page.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`

**Step 1: Replace the Pay page content**

Replace the contents of `frontend/app/(main)/statements/pay/page.tsx`:

```tsx
'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import PayView from './components/PayView';

export default function StatementsPayPage() {
  return (
    <>
      <StatementsSidePanel activeItem="pay" />
      <PayView />
    </>
  );
}
```

**Step 2: Update the side panel badge to use API count**

In `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`:

1. Add import at top:
```typescript
import { fetchPayableCount } from '@/app/lib/payables-api';
```

2. Inside the `loadStageCounts` async function, after computing `stageCounts` from statements, add:
```typescript
// Fetch real payable count from API (replaces localStorage-based count)
let payCount = 0;
try {
  payCount = await fetchPayableCount();
} catch {
  payCount = stageCounts.pay; // fallback to localStorage count
}
```

3. In the `setCounts` call, replace `...stageCounts` with explicit fields, using `payCount`:
```typescript
setCounts({
  submit: stageCounts.submit,
  approve: stageCounts.approve,
  pay: payCount,
  unapprovedCash: unapprovedCashCount,
});
```

**Step 3: Verify frontend compiles**

Run: `cd frontend && npx tsc --noEmit`

Expected: No type errors.

**Step 4: Commit**

```bash
git add frontend/app/(main)/statements/pay/page.tsx frontend/app/(main)/statements/components/StatementsSidePanel.tsx
git commit -m "feat(pay): wire PayView into pay page and switch badge to API-driven count"
```

---

## Phase 3 — Integration & Data Sources

### Task 14: Auto-create payable when statement moves to pay stage

**Files:**
- Modify: `frontend/app/lib/statement-workflow.ts`

**Step 1: Add payable creation on stage transition**

In `frontend/app/lib/statement-workflow.ts`, add a new exported function that wraps stage transition with payable auto-creation:

```typescript
import { createPayable } from './payables-api';
import apiClient from './api';

export async function setStatementStageWithPayable(
  statementId: string,
  stage: StatementStage,
): Promise<void> {
  setStatementStage(statementId, stage);

  // When moving to pay stage, auto-create a payable from statement data
  if (stage === 'pay') {
    try {
      const response = await apiClient.get(`/statements/${statementId}`);
      const statement = response.data;

      await createPayable({
        vendor: statement.bankName || 'Unknown vendor',
        amount: Math.abs(Number(statement.totalDebit || 0)),
        currency: statement.currency || 'KZT',
        source: 'statement',
        statementId,
        comment: `Auto-created from statement: ${statement.fileName || statementId}`,
      });
    } catch {
      // Non-blocking: payable creation failure should not block stage transition
      console.warn('Failed to auto-create payable for statement', statementId);
    }
  }
}
```

**Step 2: Update callers**

Find all places that call `setStatementStage` for the `pay` transition (in `StatementsListView.tsx` or similar) and replace with `setStatementStageWithPayable` when the next stage is `pay`.

**Step 3: Commit**

```bash
git add frontend/app/lib/statement-workflow.ts
git commit -m "feat(pay): auto-create payable when statement moves to pay stage"
```

---

### Task 15: Add i18n translations for Pay tab

**Files:**
- Modify: `frontend/app/(main)/statements/pay/page.content.ts` (create if not exists)

**Step 1: Add translations**

Create or update the content dictionary with pay-specific keys covering:
- Page title/subtitle
- Summary card labels (To pay, Overdue, Due this week, Paid this month)
- Action labels (Mark as paid, New payable, Edit, Delete, Link transaction)
- Empty state text
- Modal labels (Vendor, Amount, Currency, Due date, Source, Recurring, Comment)

Use the `next-intlayer` dictionary format with `en`, `ru`, `kk` locales matching the existing pattern in `frontend/app/(main)/statements/page.content.ts`.

**Step 2: Wire i18n into components**

Update `PayView`, `PaySummaryCards`, `PayablesTable`, and `CreatePayableModal` to use `useIntlayer()` for all user-facing strings instead of hardcoded English.

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/pay/page.content.ts
git commit -m "feat(pay): add i18n translations for Pay tab UI"
```

---

## Phase 4 — Notifications & Polish

### Task 16: Add overdue detection scheduled task

**Files:**
- Create: `backend/src/modules/payables/payables.scheduler.ts`
- Modify: `backend/src/modules/payables/payables.module.ts`
- Test: `backend/@tests/unit/modules/payables/payables.scheduler.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/modules/payables/payables.scheduler.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayablesScheduler } from '../../../../src/modules/payables/payables.scheduler';
import { Payable } from '../../../../src/entities/payable.entity';

describe('PayablesScheduler', () => {
  let scheduler: PayablesScheduler;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayablesScheduler,
        { provide: getRepositoryToken(Payable), useValue: mockRepository },
      ],
    }).compile();

    scheduler = module.get<PayablesScheduler>(PayablesScheduler);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('should mark overdue payables', async () => {
    await scheduler.markOverduePayables();
    expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.scheduler.spec.ts --no-cache`

Expected: FAIL — `PayablesScheduler` not found.

**Step 3: Write minimal implementation**

Create `backend/src/modules/payables/payables.scheduler.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Payable, PayableStatus } from '../../entities/payable.entity';

@Injectable()
export class PayablesScheduler {
  private readonly logger = new Logger(PayablesScheduler.name);

  constructor(
    @InjectRepository(Payable)
    private readonly payableRepository: Repository<Payable>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async markOverduePayables(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    const result = await this.payableRepository
      .createQueryBuilder()
      .update(Payable)
      .set({ status: PayableStatus.OVERDUE })
      .where('due_date < :today', { today })
      .andWhere('status = :status', { status: PayableStatus.TO_PAY })
      .andWhere('deleted_at IS NULL')
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} payables as overdue`);
    }
  }
}
```

Update `backend/src/modules/payables/payables.module.ts` to add the scheduler to providers:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payable } from '../../entities/payable.entity';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { PayablesScheduler } from './payables.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Payable])],
  controllers: [PayablesController],
  providers: [PayablesService, PayablesScheduler],
  exports: [PayablesService],
})
export class PayablesModule {}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/payables/payables.scheduler.spec.ts --no-cache`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/payables/payables.scheduler.ts backend/src/modules/payables/payables.module.ts backend/@tests/unit/modules/payables/payables.scheduler.spec.ts
git commit -m "feat(pay): add scheduled task to auto-mark overdue payables"
```

---

### Task 17: Final integration test and lint

**Files:**
- No new files

**Step 1: Run backend tests**

Run: `cd backend && npm run test`

Expected: All tests pass (including the new payable tests).

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`

Expected: Build succeeds without errors.

**Step 3: Run lint**

Run: `make lint`

Expected: No lint errors (or fix any that appear).

**Step 4: Run format**

Run: `make format`

Expected: All files formatted.

**Step 5: Final commit (if any formatting/lint fixes)**

```bash
git add -A
git commit -m "chore(pay): fix lint and format issues"
```

---

## Summary of API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `POST` | `/payables` | Create a new payable | `payable.create` |
| `GET` | `/payables` | List payables (filtered, paginated) | `payable.view` |
| `GET` | `/payables/summary` | Get summary card counts | `payable.view` |
| `GET` | `/payables/count` | Get active payable count (for badge) | `payable.view` |
| `GET` | `/payables/:id` | Get single payable | `payable.view` |
| `PUT` | `/payables/:id` | Update a payable | `payable.edit` |
| `PUT` | `/payables/:id/mark-paid` | Mark as paid + link transaction | `payable.edit` |
| `DELETE` | `/payables/:id` | Soft-delete a payable | `payable.delete` |

## Files Changed/Created Summary

### Backend (new)
- `backend/src/entities/payable.entity.ts` — TypeORM entity
- `backend/src/migrations/1763100000000-AddPayables.ts` — DB migration
- `backend/src/modules/payables/payables.module.ts` — NestJS module
- `backend/src/modules/payables/payables.controller.ts` — REST controller
- `backend/src/modules/payables/payables.service.ts` — Business logic
- `backend/src/modules/payables/payables.scheduler.ts` — Cron for overdue detection
- `backend/src/modules/payables/dto/create-payable.dto.ts` — Create DTO
- `backend/src/modules/payables/dto/update-payable.dto.ts` — Update DTO
- `backend/src/modules/payables/dto/payable-query.dto.ts` — Query/filter DTO

### Backend (modified)
- `backend/src/entities/index.ts` — Add Payable export
- `backend/src/entities/audit-event.entity.ts` — Add `PAYABLE` to EntityType
- `backend/src/entities/notification.entity.ts` — Add payable notification types
- `backend/src/common/enums/permissions.enum.ts` — Add PAYABLE_* permissions
- `backend/src/app.module.ts` — Register PayablesModule + Payable entity

### Backend (tests)
- `backend/@tests/unit/entities/payable.entity.spec.ts`
- `backend/@tests/unit/modules/payables/payables.dto.spec.ts`
- `backend/@tests/unit/modules/payables/payables.service.spec.ts`
- `backend/@tests/unit/modules/payables/payables.controller.spec.ts`
- `backend/@tests/unit/modules/payables/payables.scheduler.spec.ts`

### Frontend (new)
- `frontend/app/lib/payables-api.ts` — API client helpers
- `frontend/app/(main)/statements/pay/components/PayView.tsx` — Main view orchestrator
- `frontend/app/(main)/statements/pay/components/PaySummaryCards.tsx` — Summary cards
- `frontend/app/(main)/statements/pay/components/PayablesTable.tsx` — Data table
- `frontend/app/(main)/statements/pay/components/CreatePayableModal.tsx` — Create/edit modal

### Frontend (modified)
- `frontend/app/(main)/statements/pay/page.tsx` — Wire PayView
- `frontend/app/(main)/statements/components/StatementsSidePanel.tsx` — API-driven badge
- `frontend/app/lib/statement-workflow.ts` — Auto-create payable on stage transition
- `frontend/app/(main)/statements/pay/page.content.ts` — i18n translations

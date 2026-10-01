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
import { BalanceAccount } from './balance-account.entity';
import { Workspace } from './workspace.entity';

export enum InvestmentAssetClass {
  STOCK = 'stock',
  ETF = 'etf',
  FUND = 'fund',
  BOND = 'bond',
  CRYPTO = 'crypto',
  CASH = 'cash',
  REAL_ESTATE = 'real_estate',
  OTHER = 'other',
}

export enum InvestmentPriceSource {
  MANUAL = 'manual',
  AUTO = 'auto',
}

/**
 * One position in an investment or retirement account: a quantity at a price.
 * The account's value on the balance sheet is the sum of its holdings, written
 * as a balance snapshot whenever a holding or a price changes, so net worth
 * and the balance sheet never disagree with this table.
 */
@Entity('investment_holdings')
@Index('IDX_investment_holdings_workspace_account', ['workspaceId', 'accountId'])
export class InvestmentHolding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => BalanceAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: BalanceAccount;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  /** Ticker as the price source knows it (AAPL.US, VWCE.DE, BTC); null for a manual line. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  symbol: string | null;

  @Column({ length: 255 })
  name: string;

  @Column({
    name: 'asset_class',
    type: 'enum',
    enum: InvestmentAssetClass,
    enumName: 'investment_asset_class_enum',
    default: InvestmentAssetClass.OTHER,
  })
  assetClass: InvestmentAssetClass;

  @Column({ type: 'decimal', precision: 24, scale: 8, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  price: number;

  @Column({ name: 'price_currency', length: 10, default: 'USD' })
  priceCurrency: string;

  @Column({
    name: 'price_source',
    type: 'enum',
    enum: InvestmentPriceSource,
    enumName: 'investment_price_source_enum',
    default: InvestmentPriceSource.MANUAL,
  })
  priceSource: InvestmentPriceSource;

  @Column({ name: 'priced_at', type: 'timestamptz', nullable: true })
  pricedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

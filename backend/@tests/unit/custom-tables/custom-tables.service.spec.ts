import { AuditAction, EntityType, Severity } from '../../../src/entities/audit-event.entity';
import { CustomTableColumnType } from '../../../src/entities/custom-table-column.entity';
import { CustomTableSource } from '../../../src/entities/custom-table.entity';
import { TransactionType } from '../../../src/entities/transaction.entity';
import { CustomTablesService } from '../../../src/modules/custom-tables/custom-tables.service';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((value?: unknown) => value),
  delete: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const TABLE_ID = '11111111-1111-4111-8111-111111111111';

describe('CustomTablesService.createFromStatements', () => {
  it('creates a custom table from a single statement without throwing', async () => {
    const customTableRepository = createRepositoryMock();
    const categoryRepository = createRepositoryMock();
    const customTableColumnRepository = createRepositoryMock();
    const customTableRowRepository = createRepositoryMock();
    const customTableColumnStyleRepository = createRepositoryMock();
    const customTableCellStyleRepository = createRepositoryMock();
    const dataEntryRepository = createRepositoryMock();
    const dataEntryCustomFieldRepository = createRepositoryMock();
    const statementRepository = createRepositoryMock();
    const transactionRepository = createRepositoryMock();
    const userRepository = createRepositoryMock();
    const workspaceMemberRepository = createRepositoryMock();
    const auditService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
      createBatchEvents: jest.fn().mockResolvedValue(undefined),
    };

    const statementQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'statement-1',
          fileName: 'receipt-scan.pdf',
          createdAt: new Date('2026-03-29T00:00:00.000Z'),
        },
      ]),
    };

    statementRepository.createQueryBuilder.mockReturnValue(statementQueryBuilder);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    transactionRepository.find.mockResolvedValue([
      {
        id: 'tx-1',
        statementId: 'statement-1',
        transactionDate: new Date('2026-03-29T00:00:00.000Z'),
        counterpartyName: 'Magnum',
        paymentPurpose: 'Magnum',
        debit: 500,
        credit: null,
        currency: 'KZT',
        transactionType: TransactionType.EXPENSE,
        createdAt: new Date('2026-03-29T00:00:00.000Z'),
      },
    ]);

    customTableRepository.save.mockResolvedValue({
      id: 'table-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      name: 'Receipt export',
      description: 'Exported from receipt scan',
      source: CustomTableSource.MANUAL,
      categoryId: null,
    });

    customTableColumnRepository.save.mockImplementation(async values => values);
    customTableRowRepository.save.mockImplementation(async values => values);

    const service = new CustomTablesService(
      customTableRepository as never,
      categoryRepository as never,
      customTableColumnRepository as never,
      customTableRowRepository as never,
      customTableColumnStyleRepository as never,
      customTableCellStyleRepository as never,
      dataEntryRepository as never,
      dataEntryCustomFieldRepository as never,
      statementRepository as never,
      transactionRepository as never,
      userRepository as never,
      workspaceMemberRepository as never,
      auditService as never,
    );

    const result = await service.createFromStatements('user-1', 'workspace-1', {
      statementIds: ['statement-1'],
      name: 'Receipt export',
      description: 'Exported from receipt scan',
    });

    expect(result).toEqual({
      tableId: 'table-1',
      columnsCreated: 7,
      rowsCreated: 1,
    });
    expect(customTableRepository.save).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      name: 'Receipt export',
      description: 'Exported from receipt scan',
      source: CustomTableSource.MANUAL,
      categoryId: null,
    });
    expect(customTableColumnRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Дата', type: CustomTableColumnType.DATE, position: 0 }),
      expect.objectContaining({ title: 'Контрагент', type: CustomTableColumnType.TEXT, position: 1 }),
      expect.objectContaining({ title: 'Назначение', type: CustomTableColumnType.TEXT, position: 2 }),
      expect.objectContaining({ title: 'Дебет', type: CustomTableColumnType.NUMBER, position: 3 }),
      expect.objectContaining({ title: 'Кредит', type: CustomTableColumnType.NUMBER, position: 4 }),
      expect.objectContaining({ title: 'Валюта', type: CustomTableColumnType.TEXT, position: 5 }),
      expect.objectContaining({ title: 'Тип', type: CustomTableColumnType.TEXT, position: 6 }),
    ]);
    expect(customTableRowRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tableId: 'table-1',
        rowNumber: 1,
        data: expect.any(Object),
      }),
    ]);
    const savedRows = customTableRowRepository.save.mock.calls[0]?.[0] as Array<{
      data: Record<string, unknown>;
    }>;
    expect(Object.values(savedRows[0]?.data || {})).toEqual(
      expect.arrayContaining(['2026-03-29', 'Magnum', 500, null, 'KZT', 'Списание']),
    );
    expect(auditService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        actorId: 'user-1',
        entityType: EntityType.CUSTOM_TABLE,
        action: AuditAction.CREATE,
        severity: Severity.INFO,
      }),
    );
    expect(auditService.createBatchEvents).toHaveBeenCalled();
  });
});

const buildCustomTablesService = () => {
  const customTableRepository = createRepositoryMock();
  const categoryRepository = createRepositoryMock();
  const customTableColumnRepository = createRepositoryMock();
  const customTableRowRepository = createRepositoryMock();
  const customTableColumnStyleRepository = createRepositoryMock();
  const customTableCellStyleRepository = createRepositoryMock();
  const dataEntryRepository = createRepositoryMock();
  const dataEntryCustomFieldRepository = createRepositoryMock();
  const statementRepository = createRepositoryMock();
  const transactionRepository = createRepositoryMock();
  const userRepository = createRepositoryMock();
  const workspaceMemberRepository = createRepositoryMock();
  const auditService = {
    createEvent: jest.fn().mockResolvedValue(undefined),
    createBatchEvents: jest.fn().mockResolvedValue(undefined),
  };

  const service = new CustomTablesService(
    customTableRepository as never,
    categoryRepository as never,
    customTableColumnRepository as never,
    customTableRowRepository as never,
    customTableColumnStyleRepository as never,
    customTableCellStyleRepository as never,
    dataEntryRepository as never,
    dataEntryCustomFieldRepository as never,
    statementRepository as never,
    transactionRepository as never,
    userRepository as never,
    workspaceMemberRepository as never,
    auditService as never,
  );

  return {
    service,
    customTableRepository,
    customTableColumnRepository,
    customTableRowRepository,
    statementRepository,
    transactionRepository,
    workspaceMemberRepository,
    auditService,
  };
};

const mockRequireTable = (
  customTableRepository: ReturnType<typeof createRepositoryMock>,
  table: Record<string, unknown> = {},
) => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue({
      id: TABLE_ID,
      userId: 'user-1',
      workspaceId: 'workspace-1',
      name: 'March expenses',
      description: null,
      source: CustomTableSource.MANUAL,
      categoryId: null,
      ...table,
    }),
  };
  customTableRepository.createQueryBuilder.mockReturnValue(queryBuilder);
  return queryBuilder;
};

const mockMissingTable = (customTableRepository: ReturnType<typeof createRepositoryMock>) => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
  };
  customTableRepository.createQueryBuilder.mockReturnValue(queryBuilder);
  return queryBuilder;
};

const buildConversionColumns = () => [
  { id: 'col-date', key: 'date-key', title: 'Дата', type: CustomTableColumnType.DATE, position: 0 },
  {
    id: 'col-merchant',
    key: 'merchant-key',
    title: 'Контрагент',
    type: CustomTableColumnType.TEXT,
    position: 1,
  },
  {
    id: 'col-purpose',
    key: 'purpose-key',
    title: 'Описание',
    type: CustomTableColumnType.TEXT,
    position: 2,
  },
  {
    id: 'col-amount',
    key: 'amount-key',
    title: 'Сумма',
    type: CustomTableColumnType.NUMBER,
    position: 3,
  },
  {
    id: 'col-article',
    key: 'article-key',
    title: 'Статья',
    type: CustomTableColumnType.TEXT,
    position: 4,
  },
  {
    id: 'col-currency',
    key: 'currency-key',
    title: 'Валюта',
    type: CustomTableColumnType.TEXT,
    position: 5,
  },
];

const buildEnglishDebitColumns = () => [
  { id: 'col-date', key: 'date-key', title: 'Date', type: CustomTableColumnType.DATE, position: 0 },
  {
    id: 'col-merchant',
    key: 'merchant-key',
    title: 'Counterparty',
    type: CustomTableColumnType.TEXT,
    position: 1,
  },
  {
    id: 'col-purpose',
    key: 'purpose-key',
    title: 'Purpose',
    type: CustomTableColumnType.TEXT,
    position: 2,
  },
  {
    id: 'col-debit',
    key: 'debit-key',
    title: 'Debit',
    type: CustomTableColumnType.NUMBER,
    position: 3,
  },
  {
    id: 'col-article',
    key: 'article-key',
    title: 'Article',
    type: CustomTableColumnType.TEXT,
    position: 4,
  },
];

describe('CustomTablesService.convertToStatement', () => {
  const originalUploadsDir = process.env.UPLOADS_DIR;

  beforeEach(() => {
    process.env.UPLOADS_DIR = '/tmp/lumio-custom-table-tests';
  });

  afterEach(() => {
    process.env.UPLOADS_DIR = originalUploadsDir;
    jest.clearAllMocks();
  });

  it('creates one statement with expense transactions and article values from valid table rows', async () => {
    const {
      service,
      customTableRepository,
      customTableColumnRepository,
      customTableRowRepository,
      statementRepository,
      transactionRepository,
      workspaceMemberRepository,
    } = buildCustomTablesService();

    mockRequireTable(customTableRepository);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    customTableColumnRepository.find.mockResolvedValue(buildConversionColumns());
    customTableRowRepository.find.mockResolvedValue([
      {
        id: 'row-1',
        rowNumber: 1,
        data: {
          'date-key': '2026-03-29',
          'merchant-key': 'Magnum',
          'purpose-key': 'Office groceries',
          'amount-key': 500,
          'article-key': 'Office supplies',
          'currency-key': 'KZT',
        },
      },
      {
        id: 'row-2',
        rowNumber: 2,
        data: {
          'date-key': 'bad-date',
          'merchant-key': 'Invalid',
          'amount-key': 100,
        },
      },
    ]);

    statementRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    statementRepository.create.mockImplementation((value?: unknown) => value);
    statementRepository.save.mockImplementation(async value => ({
      id: 'generated-statement-1',
      ...(value as Record<string, unknown>),
    }));
    transactionRepository.create.mockImplementation((value?: unknown) => value);
    transactionRepository.save.mockImplementation(async values => values);

    const result = await service.convertToStatement('user-1', 'workspace-1', TABLE_ID);

    expect(result).toEqual({
      statementId: 'generated-statement-1',
      importedRows: 1,
      skippedRows: 1,
      warnings: [expect.stringContaining('row 2')],
    });
    expect(statementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        fileName: expect.stringContaining('March expenses'),
        totalTransactions: 1,
        totalDebit: 500,
        totalCredit: 0,
        currency: 'KZT',
      }),
    );
    expect(transactionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        workspaceId: 'workspace-1',
        statementId: 'generated-statement-1',
        counterpartyName: 'Magnum',
        paymentPurpose: 'Office groceries',
        debit: 500,
        amount: 500,
        currency: 'KZT',
        transactionType: TransactionType.EXPENSE,
        article: 'Office supplies',
        isVerified: true,
        fingerprint: expect.any(String),
      }),
    ]);
  });

  it('replaces prior generated transactions when converting the same table again', async () => {
    const {
      service,
      customTableRepository,
      customTableColumnRepository,
      customTableRowRepository,
      statementRepository,
      transactionRepository,
      workspaceMemberRepository,
    } = buildCustomTablesService();

    mockRequireTable(customTableRepository);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    customTableColumnRepository.find.mockResolvedValue(buildConversionColumns());
    customTableRowRepository.find.mockResolvedValue([
      {
        id: 'row-1',
        rowNumber: 1,
        data: {
          'date-key': '2026-03-30',
          'merchant-key': 'Taxi',
          'amount-key': 70,
          'article-key': 'Transport',
          'currency-key': 'KZT',
        },
      },
    ]);
    statementRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'generated-statement-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        fileName: 'old.csv',
        filePath: '/tmp/lumio-custom-table-tests/old.csv',
        parsingDetails: {
          importPreview: {
            source: 'custom-table-conversion',
            customTableId: TABLE_ID,
          },
        },
      }),
    });
    statementRepository.save.mockImplementation(async value => value);
    transactionRepository.create.mockImplementation((value?: unknown) => value);
    transactionRepository.save.mockImplementation(async values => values);

    const result = await service.convertToStatement('user-1', 'workspace-1', TABLE_ID);

    expect(result.statementId).toBe('generated-statement-1');
    expect(transactionRepository.delete).toHaveBeenCalledWith({ statementId: 'generated-statement-1' });
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('maps English column names and positive debit values to expense transactions', async () => {
    const {
      service,
      customTableRepository,
      customTableColumnRepository,
      customTableRowRepository,
      statementRepository,
      transactionRepository,
      workspaceMemberRepository,
    } = buildCustomTablesService();

    mockRequireTable(customTableRepository, { name: 'Imported expenses' });
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    customTableColumnRepository.find.mockResolvedValue(buildEnglishDebitColumns());
    customTableRowRepository.find.mockResolvedValue([
      {
        id: 'row-1',
        rowNumber: 1,
        data: {
          'date-key': '2026-04-01',
          'merchant-key': 'Vendor LLC',
          'purpose-key': 'Hosting',
          'debit-key': '1 234,50',
          'article-key': 'Infrastructure',
        },
      },
    ]);

    statementRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    statementRepository.create.mockImplementation((value?: unknown) => value);
    statementRepository.save.mockImplementation(async value => ({
      id: 'generated-statement-1',
      ...(value as Record<string, unknown>),
    }));
    transactionRepository.create.mockImplementation((value?: unknown) => value);
    transactionRepository.save.mockImplementation(async values => values);

    await service.convertToStatement('user-1', 'workspace-1', TABLE_ID);

    expect(transactionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        counterpartyName: 'Vendor LLC',
        paymentPurpose: 'Hosting',
        debit: 1234.5,
        amount: 1234.5,
        currency: 'KZT',
        transactionType: TransactionType.EXPENSE,
        article: 'Infrastructure',
      }),
    ]);
  });

  it('fails when all rows have invalid dates or non-positive amounts', async () => {
    const {
      service,
      customTableRepository,
      customTableColumnRepository,
      customTableRowRepository,
      statementRepository,
      transactionRepository,
      workspaceMemberRepository,
    } = buildCustomTablesService();

    mockRequireTable(customTableRepository);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });
    customTableColumnRepository.find.mockResolvedValue(buildConversionColumns());
    customTableRowRepository.find.mockResolvedValue([
      {
        id: 'row-1',
        rowNumber: 1,
        data: {
          'date-key': 'bad-date',
          'amount-key': 100,
        },
      },
      {
        id: 'row-2',
        rowNumber: 2,
        data: {
          'date-key': '2026-04-02',
          'amount-key': 0,
        },
      },
    ]);

    await expect(service.convertToStatement('user-1', 'workspace-1', TABLE_ID)).rejects.toMatchObject({ response: { code: 'TABLE_NO_VALID_ROWS_TO_CONVERT' } });
    expect(statementRepository.save).not.toHaveBeenCalled();
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('rejects tables outside the current workspace scope', async () => {
    const { service, customTableRepository, workspaceMemberRepository } = buildCustomTablesService();

    mockMissingTable(customTableRepository);
    workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });

    await expect(service.convertToStatement('user-1', 'workspace-2', TABLE_ID)).rejects.toMatchObject({ response: { code: 'TABLE_NOT_FOUND' } });
  });

  it('rejects users without statement edit permission', async () => {
    const {
      service,
      customTableRepository,
      customTableColumnRepository,
      customTableRowRepository,
      workspaceMemberRepository,
    } = buildCustomTablesService();

    mockRequireTable(customTableRepository);
    workspaceMemberRepository.findOne.mockResolvedValue({
      role: 'member',
      permissions: { canEditCustomTables: true, canEditStatements: false },
    });

    await expect(service.convertToStatement('user-1', 'workspace-1', TABLE_ID)).rejects.toMatchObject({ response: { code: 'STATEMENTS_EDIT_FORBIDDEN' } });
    expect(customTableColumnRepository.find).not.toHaveBeenCalled();
    expect(customTableRowRepository.find).not.toHaveBeenCalled();
  });
});

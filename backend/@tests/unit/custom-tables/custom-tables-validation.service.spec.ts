import { CustomTableColumnType } from '../../../src/entities/custom-table-column.entity';
import { CustomTablesService } from '../../../src/modules/custom-tables/custom-tables.service';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(async (v: unknown) => v),
  create: jest.fn((value?: unknown) => value),
  delete: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const TABLE_ID = '11111111-1111-4111-8111-111111111111';
const ROW_ID = '22222222-2222-4222-8222-222222222222';

const COLUMNS = [
  {
    key: 'inn',
    title: 'ИНН',
    type: CustomTableColumnType.TEXT,
    isRequired: true,
    isUnique: true,
  },
  {
    key: 'note',
    title: 'Комментарий',
    type: CustomTableColumnType.TEXT,
    isRequired: false,
    isUnique: false,
  },
];

function buildService(duplicateExists = false): {
  service: CustomTablesService;
} {
  const customTableRepository = createRepositoryMock();
  const customTableColumnRepository = createRepositoryMock();
  const customTableRowRepository = createRepositoryMock();
  const workspaceMemberRepository = createRepositoryMock();

  customTableRepository.createQueryBuilder.mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue({ id: TABLE_ID, name: 'Контрагенты' }),
  });
  customTableColumnRepository.find.mockResolvedValue(COLUMNS);
  workspaceMemberRepository.findOne.mockResolvedValue({ role: 'owner', permissions: {} });

  customTableRowRepository.createQueryBuilder.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn().mockResolvedValue(duplicateExists),
    getCount: jest.fn().mockResolvedValue(0),
    // Нумерация строк спрашивает максимум — в этих сценариях он не важен.
    getRawOne: jest.fn().mockResolvedValue({ max: '0' }),
  });
  customTableRowRepository.findOne.mockResolvedValue({
    id: ROW_ID,
    tableId: TABLE_ID,
    rowNumber: 1,
    data: { inn: '123' },
  });

  const service = new CustomTablesService(
    customTableRepository as never,
    createRepositoryMock() as never,
    customTableColumnRepository as never,
    customTableRowRepository as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    createRepositoryMock() as never,
    workspaceMemberRepository as never,
    { createEvent: jest.fn(), createBatchEvents: jest.fn() } as never,
  );

  return { service };
}

describe('row validation against column flags', () => {
  it('rejects a new row with a required column left empty', async () => {
    const { service } = buildService();

    await expect(
      service.createRow('u1', 'ws-1', TABLE_ID, { data: { inn: '   ', note: 'x' } } as never),
    ).rejects.toMatchObject({ response: { code: 'COLUMN_REQUIRED_VALUE' } });
  });

  it('rejects a value that already exists in a unique column', async () => {
    const { service } = buildService(true);

    await expect(
      service.createRow('u1', 'ws-1', TABLE_ID, { data: { inn: '123' } } as never),
    ).rejects.toMatchObject({ response: { code: 'VALUE_DUPLICATE_IN_TABLE' } });
  });

  it('rejects duplicates inside a single batch, which the database cannot see yet', async () => {
    const { service } = buildService(false);

    await expect(
      service.batchCreateRows('u1', 'ws-1', TABLE_ID, {
        rows: [{ data: { inn: '777' } }, { data: { inn: '777' } }],
      } as never),
    ).rejects.toMatchObject({ response: { code: 'VALUE_DUPLICATE_IN_BATCH' } });
  });

  it('allows a partial update that does not touch the required column', async () => {
    const { service } = buildService(false);

    await expect(
      service.updateRow('u1', 'ws-1', TABLE_ID, ROW_ID, { data: { note: 'y' } } as never),
    ).resolves.toBeDefined();
  });

  it('rejects clearing a required column through an update', async () => {
    const { service } = buildService(false);

    await expect(
      service.updateRow('u1', 'ws-1', TABLE_ID, ROW_ID, { data: { inn: '' } } as never),
    ).rejects.toMatchObject({ response: { code: 'COLUMN_REQUIRED_VALUE' } });
  });
});

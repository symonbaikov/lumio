import { PassThrough } from 'stream';
import { PayableStatus } from '@/entities/payable.entity';
import { ExportFormat } from '@/modules/payables/dto/filter-payables.dto';
import { PayablesController } from '@/modules/payables/payables.controller';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    createReadStream: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('PayablesController', () => {
  it('proxies CRUD, summary, status actions, and export to service', async () => {
    const fs = await import('fs');
    const stream = new PassThrough();
    const errorStream = new PassThrough();
    (fs.createReadStream as jest.Mock)
      .mockReturnValueOnce(stream)
      .mockReturnValueOnce(errorStream);

    const payablesService = {
      create: jest.fn(async () => ({ id: 'p1' })),
      findAll: jest.fn(async () => ({ data: [{ id: 'p1' }], total: 1, page: 1, limit: 20 })),
      getSummary: jest.fn(async () => ({ toPay: 100 })),
      findOne: jest.fn(async () => ({ id: 'p1' })),
      update: jest.fn(async () => ({ id: 'p1', vendor: 'New' })),
      markAsPaid: jest.fn(async () => ({ id: 'p1', status: PayableStatus.PAID })),
      archive: jest.fn(async () => ({ id: 'p1', status: PayableStatus.ARCHIVED })),
      remove: jest.fn(async () => undefined),
      exportData: jest.fn(async () => ({ filePath: '/tmp/p.csv', fileName: 'p.csv', contentType: 'text/csv' })),
    };
    const controller = new PayablesController(payablesService as any);
    const user = { id: 'user-1' } as any;
    const workspaceId = 'workspace-1';
    const res = new PassThrough() as any;
    res.setHeader = jest.fn();

    expect(await controller.create({ vendor: 'Acme', amount: 10 } as any, user, workspaceId)).toEqual({
      id: 'p1',
    });
    expect(await controller.findAll(workspaceId, { status: PayableStatus.TO_PAY } as any)).toEqual({
      data: [{ id: 'p1' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(await controller.getSummary(workspaceId, {})).toEqual({ toPay: 100 });
    expect(await controller.findOne('p1', workspaceId)).toEqual({ id: 'p1' });
    expect(await controller.update('p1', { vendor: 'New' } as any, user, workspaceId)).toEqual({
      id: 'p1',
      vendor: 'New',
    });
    expect(
      await controller.markAsPaid('p1', { linkedTransactionId: 'tx-1' } as any, user, workspaceId),
    ).toEqual({ id: 'p1', status: PayableStatus.PAID });
    expect(await controller.archive('p1', user, workspaceId)).toEqual({
      id: 'p1',
      status: PayableStatus.ARCHIVED,
    });
    expect(await controller.remove('p1', user, workspaceId)).toEqual({
      message: 'Payable deleted successfully',
    });
    await controller.export({ format: ExportFormat.CSV } as any, workspaceId, res);

    expect(payablesService.create).toHaveBeenCalledWith(workspaceId, 'user-1', {
      vendor: 'Acme',
      amount: 10,
    });
    expect(payablesService.findAll).toHaveBeenCalledWith(workspaceId, {
      status: PayableStatus.TO_PAY,
    });
    expect(payablesService.getSummary).toHaveBeenCalledWith(workspaceId, undefined);
    expect(payablesService.findOne).toHaveBeenCalledWith('p1', workspaceId);
    expect(payablesService.update).toHaveBeenCalledWith('p1', workspaceId, 'user-1', {
      vendor: 'New',
    });
    expect(payablesService.markAsPaid).toHaveBeenCalledWith('p1', workspaceId, 'user-1', {
      linkedTransactionId: 'tx-1',
    });
    expect(payablesService.archive).toHaveBeenCalledWith('p1', workspaceId, 'user-1');
    expect(payablesService.remove).toHaveBeenCalledWith('p1', workspaceId, 'user-1');
    expect(payablesService.exportData).toHaveBeenCalledWith(workspaceId, { format: ExportFormat.CSV });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(fs.createReadStream).toHaveBeenCalledWith('/tmp/p.csv');

    stream.emit('end');
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/p.csv');

    (fs.unlinkSync as jest.Mock).mockClear();
    await controller.export({ format: ExportFormat.CSV } as any, workspaceId, res);
    errorStream.emit('error', new Error('boom'));
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/p.csv');
  });
});

import { createRepoMock } from '../../../helpers/create-repo-mock';
import { TaxRatesService } from '@/modules/tax/tax-rates.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TaxRatesService', () => {
  let service: TaxRatesService;
  let repo: ReturnType<typeof createRepoMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = createRepoMock();
    repo.create.mockImplementation((input: unknown) => input);
    repo.save.mockImplementation(async (input: unknown) => input);
    service = new TaxRatesService(repo);
  });

  // ─── findAll ───────────────────────────────────────────────

  describe('findAll', () => {
    it('returns tax rates for workspace ordered by default, rate, name', async () => {
      const mockRates = [{ id: '1', name: 'VAT', rate: 20 }];
      repo.find.mockResolvedValue(mockRates);

      const result = await service.findAll('ws-1');
      expect(result).toEqual(mockRates);
      expect(repo.find).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        order: { isDefault: 'DESC', rate: 'ASC', name: 'ASC' },
      });
    });
  });

  // ─── findOne ───────────────────────────────────────────────

  describe('findOne', () => {
    it('returns tax rate by id and workspaceId', async () => {
      const mockRate = { id: 'rate-1', workspaceId: 'ws-1', name: 'VAT' };
      repo.findOne.mockResolvedValue(mockRate);

      const result = await service.findOne('rate-1', 'ws-1');
      expect(result).toEqual(mockRate);
    });

    it('throws NotFoundException when tax rate not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ────────────────────────────────────────────────

  describe('create', () => {
    it('creates a tax rate', async () => {
      repo.findOne.mockResolvedValue(null); // no duplicate
      const dto = { name: 'VAT 20%', rate: 20, isDefault: false };

      const result = await service.create('ws-1', dto);
      expect(result).toMatchObject({ workspaceId: 'ws-1', name: 'VAT 20%', rate: 20 });
    });

    it('trims the name', async () => {
      repo.findOne.mockResolvedValue(null);
      const dto = { name: '  VAT  ', rate: 10 };

      const result = await service.create('ws-1', dto);
      expect(result).toMatchObject({ name: 'VAT' });
    });

    it('throws BadRequestException for empty name', async () => {
      await expect(service.create('ws-1', { name: '   ', rate: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for duplicate name', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing', name: 'VAT' });
      await expect(service.create('ws-1', { name: 'VAT', rate: 20 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('unsets previous default when creating a new default', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.create('ws-1', { name: 'New Default', rate: 15, isDefault: true });
      expect(repo.update).toHaveBeenCalledWith(
        { workspaceId: 'ws-1', isDefault: true },
        { isDefault: false },
      );
    });

    it('defaults isEnabled to true', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create('ws-1', { name: 'VAT', rate: 20 });
      expect(result).toMatchObject({ isEnabled: true });
    });
  });

  // ─── update ────────────────────────────────────────────────

  describe('update', () => {
    it('updates tax rate fields', async () => {
      const existing = { id: 'rate-1', workspaceId: 'ws-1', name: 'Old', rate: 10 };
      repo.findOne
        .mockResolvedValueOnce(existing) // findOne in update
        .mockResolvedValueOnce(null); // duplicate check

      await service.update('rate-1', 'ws-1', { name: 'New Name', rate: 25 });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', rate: 25 }),
      );
    });

    it('throws NotFoundException for nonexistent rate', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('nope', 'ws-1', { rate: 5 })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for empty name on update', async () => {
      repo.findOne.mockResolvedValue({ id: 'rate-1', workspaceId: 'ws-1' });
      await expect(service.update('rate-1', 'ws-1', { name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for duplicate name from different rate', async () => {
      const existing = { id: 'rate-1', workspaceId: 'ws-1', name: 'Old' };
      repo.findOne
        .mockResolvedValueOnce(existing) // findOne
        .mockResolvedValueOnce({ id: 'rate-2', name: 'Taken' }); // duplicate

      await expect(service.update('rate-1', 'ws-1', { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows updating name to current name (same id)', async () => {
      const existing = { id: 'rate-1', workspaceId: 'ws-1', name: 'Same' };
      repo.findOne
        .mockResolvedValueOnce(existing) // findOne
        .mockResolvedValueOnce({ id: 'rate-1', name: 'Same' }); // same record

      await expect(service.update('rate-1', 'ws-1', { name: 'Same' })).resolves.toBeDefined();
    });

    it('unsets previous default when setting new default', async () => {
      const existing = { id: 'rate-1', workspaceId: 'ws-1', name: 'Rate' };
      repo.findOne.mockResolvedValue(existing);

      await service.update('rate-1', 'ws-1', { isDefault: true });
      expect(repo.update).toHaveBeenCalledWith(
        { workspaceId: 'ws-1', isDefault: true },
        { isDefault: false },
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────

  describe('remove', () => {
    it('removes a tax rate', async () => {
      const existing = { id: 'rate-1', workspaceId: 'ws-1' };
      repo.findOne.mockResolvedValue(existing);

      await service.remove('rate-1', 'ws-1');
      expect(repo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException for nonexistent rate', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createDefaultTaxRates ─────────────────────────────────

  describe('createDefaultTaxRates', () => {
    it('creates default rate when workspace has none', async () => {
      repo.count.mockResolvedValue(0);
      await service.createDefaultTaxRates('ws-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          name: 'Tax exempt (0%)',
          rate: 0,
          isDefault: true,
        }),
      );
    });

    it('skips when workspace already has tax rates', async () => {
      repo.count.mockResolvedValue(3);
      await service.createDefaultTaxRates('ws-1');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});

import type { Category } from '@/entities/category.entity';
import { CategoryType } from '@/entities/category.entity';
import type { Wallet } from '@/entities/wallet.entity';
import type { ClassificationService } from '@/modules/classification/services/classification.service';
import { SheetReferenceResolverService } from '@/modules/import/sheets/sheet-reference-resolver.service';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(async () => []),
    save: jest.fn(async (x: any) => x),
    create: jest.fn((x: any) => x),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('SheetReferenceResolverService', () => {
  let categoryRepository: Repository<Category> & Record<string, any>;
  let walletRepository: Repository<Wallet> & Record<string, any>;
  let classificationService: ClassificationService & Record<string, any>;
  let service: SheetReferenceResolverService;

  beforeEach(() => {
    categoryRepository = createRepoMock<Category>();
    walletRepository = createRepoMock<Wallet>();
    classificationService = {
      ensureCategory: jest.fn(async () => 'new-category-id'),
    } as unknown as ClassificationService & Record<string, any>;
    service = new SheetReferenceResolverService(
      categoryRepository as any,
      walletRepository as any,
      classificationService as any,
    );
  });

  describe('resolveCategories', () => {
    it('matches an existing category case-insensitively and trimmed, without creating', async () => {
      categoryRepository.find = jest.fn(async () => [
        { id: 'cat-eda', name: 'Еда', type: CategoryType.EXPENSE, workspaceId: 'ws1' },
      ]);

      const result = await service.resolveCategories({
        workspaceId: 'ws1',
        userId: 'u1',
        names: [{ name: '  еда  ', type: CategoryType.EXPENSE }],
        createMissing: true,
      });

      expect(result.get('expense:еда')).toBe('cat-eda');
      expect(classificationService.ensureCategory).not.toHaveBeenCalled();
    });

    it('creates a missing category via ClassificationService.ensureCategory when createMissing is true', async () => {
      categoryRepository.find = jest.fn(async () => []);
      classificationService.ensureCategory = jest.fn(async () => 'brand-new-id');

      const result = await service.resolveCategories({
        workspaceId: 'ws1',
        userId: 'u1',
        names: [{ name: 'Новая категория', type: CategoryType.EXPENSE }],
        createMissing: true,
      });

      expect(classificationService.ensureCategory).toHaveBeenCalledTimes(1);
      expect(classificationService.ensureCategory).toHaveBeenCalledWith(
        'u1',
        'Новая категория',
        CategoryType.EXPENSE,
        undefined,
        'ws1',
      );
      expect(result.get('expense:новая категория')).toBe('brand-new-id');
    });

    it('returns null and does not create when createMissing is false', async () => {
      categoryRepository.find = jest.fn(async () => []);

      const result = await service.resolveCategories({
        workspaceId: 'ws1',
        userId: 'u1',
        names: [{ name: 'Новая категория', type: CategoryType.EXPENSE }],
        createMissing: false,
      });

      expect(result.get('expense:новая категория')).toBeNull();
      expect(classificationService.ensureCategory).not.toHaveBeenCalled();
    });

    it('resolves the same name twice in one import to a single created category', async () => {
      categoryRepository.find = jest.fn(async () => []);
      classificationService.ensureCategory = jest.fn(async () => 'taxi-id');

      const result = await service.resolveCategories({
        workspaceId: 'ws1',
        userId: 'u1',
        names: [
          { name: 'Такси', type: CategoryType.EXPENSE },
          { name: '  такси', type: CategoryType.EXPENSE },
        ],
        createMissing: true,
      });

      expect(classificationService.ensureCategory).toHaveBeenCalledTimes(1);
      expect(result.get('expense:такси')).toBe('taxi-id');
    });
  });

  describe('resolveWallets', () => {
    it('matches an existing wallet case-insensitively and trimmed', async () => {
      walletRepository.find = jest.fn(async () => [
        { id: 'wallet-main', name: 'Основной счёт', workspaceId: 'ws1' },
      ]);

      const { resolved, warnings } = await service.resolveWallets({
        workspaceId: 'ws1',
        names: ['  ОСНОВНОЙ СЧЁТ  '],
      });

      expect(resolved.get('основной счёт')).toBe('wallet-main');
      expect(warnings).toHaveLength(0);
    });

    it('returns null and a warning for an unknown wallet name, never creating one', async () => {
      walletRepository.find = jest.fn(async () => []);

      const { resolved, warnings } = await service.resolveWallets({
        workspaceId: 'ws1',
        names: ['Неизвестный кошелёк'],
      });

      expect(resolved.get('неизвестный кошелёк')).toBeNull();
      expect(warnings.some(w => w.includes('Неизвестный кошелёк'))).toBe(true);
      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(walletRepository.create).not.toHaveBeenCalled();
    });

    it('never calls save or create on the wallet repository, matched or not', async () => {
      walletRepository.find = jest.fn(async () => [
        { id: 'wallet-main', name: 'Основной счёт', workspaceId: 'ws1' },
      ]);

      await service.resolveWallets({
        workspaceId: 'ws1',
        names: ['Основной счёт', 'Неизвестный'],
      });

      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(walletRepository.create).not.toHaveBeenCalled();
    });
  });
});

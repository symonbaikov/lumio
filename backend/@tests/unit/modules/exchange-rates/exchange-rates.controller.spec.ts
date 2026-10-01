import { ExchangeRatesController } from '@/modules/exchange-rates/exchange-rates.controller';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  const exchangeRatesService = {
    getRate: jest.fn(),
    getRateQuote: jest.fn(),
    bulkConvert: jest.fn(),
  } as any;
  const workspaceRepository = { findOne: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExchangeRatesController(exchangeRatesService, workspaceRepository);
  });

  describe('getRate', () => {
    it('returns rate for a currency pair', async () => {
      exchangeRatesService.getRateQuote.mockResolvedValue({ rate: 3.67, rateDate: '2025-06-15', stale: false });
      const result = await controller.getRate('USD', 'ILS');

      expect(result).toEqual({
        from: 'USD',
        to: 'ILS',
        rate: 3.67,
        date: null,
        rateDate: '2025-06-15',
        stale: false,
        missing: false,
      });
      expect(exchangeRatesService.getRateQuote).toHaveBeenCalledWith('USD', 'ILS', undefined);
    });

    it('passes date when provided', async () => {
      exchangeRatesService.getRateQuote.mockResolvedValue({ rate: 3.6, rateDate: '2025-06-15', stale: false });
      const result = await controller.getRate('USD', 'ILS', '2025-06-15');

      expect(result.date).toBe('2025-06-15');
      expect(exchangeRatesService.getRateQuote).toHaveBeenCalledWith(
        'USD',
        'ILS',
        new Date('2025-06-15'),
      );
    });

    it('says so when no rate exists instead of a silent 1', async () => {
      exchangeRatesService.getRateQuote.mockResolvedValue(null);
      const result = await controller.getRate('ZZX', 'USD');
      expect(result).toMatchObject({ rate: 1, missing: true, rateDate: null });
    });
  });

  describe('bulkConvert', () => {
    it('delegates to service with parsed dates', async () => {
      const mockResults = [
        { converted: 367, rate: 3.67, source: 'exchange-rates-service' },
      ];
      exchangeRatesService.bulkConvert.mockResolvedValue(mockResults);

      const dto = {
        items: [{ amount: 100, currency: 'USD', date: '2025-06-15' }],
        targetCurrency: 'ILS',
      };

      const result = await controller.bulkConvert(dto);

      expect(result).toEqual({ targetCurrency: 'ILS', results: mockResults });
      expect(exchangeRatesService.bulkConvert).toHaveBeenCalledWith(
        [{ amount: 100, currency: 'USD', date: new Date('2025-06-15') }],
        'ILS',
      );
    });

    it('handles items without date', async () => {
      exchangeRatesService.bulkConvert.mockResolvedValue([]);
      const dto = {
        items: [{ amount: 50, currency: 'EUR' }],
        targetCurrency: 'USD',
      };

      await controller.bulkConvert(dto);

      expect(exchangeRatesService.bulkConvert).toHaveBeenCalledWith(
        [{ amount: 50, currency: 'EUR', date: undefined }],
        'USD',
      );
    });
  });
});

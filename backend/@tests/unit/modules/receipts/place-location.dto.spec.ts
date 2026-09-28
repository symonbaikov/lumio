import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlaceSuggestionsDto } from '@/modules/receipts/dto/place-suggestions.dto';
import { UpdateReceiptLocationDto } from '@/modules/receipts/dto/update-receipt-location.dto';

const errorsOf = async <T extends object>(cls: new () => T, body: object) =>
  (await validate(plainToInstance(cls, body))).map((error) => error.property);

describe('PlaceSuggestionsDto', () => {
  const valid = {
    statementId: '6f1c2b8e-1d5a-4f0e-9a4b-2c7d8e9f0a1b',
    latitude: 43.73,
    longitude: 7.417,
    accuracy: 30,
  };

  it('accepts a fix for a statement', async () => {
    await expect(errorsOf(PlaceSuggestionsDto, valid)).resolves.toEqual([]);
    await expect(
      errorsOf(PlaceSuggestionsDto, { ...valid, accuracy: undefined }),
    ).resolves.toEqual([]);
  });

  it('rejects a missing or malformed point and a non-uuid statement', async () => {
    await expect(errorsOf(PlaceSuggestionsDto, { ...valid, latitude: 91 })).resolves.toEqual([
      'latitude',
    ]);
    await expect(
      errorsOf(PlaceSuggestionsDto, { ...valid, longitude: undefined }),
    ).resolves.toEqual(['longitude']);
    await expect(
      errorsOf(PlaceSuggestionsDto, { ...valid, statementId: '../receipts' }),
    ).resolves.toEqual(['statementId']);
  });
});

describe('UpdateReceiptLocationDto with a place', () => {
  const place = { name: 'Carrefour', category: 'shop', osmType: 'node', osmId: '274497719' };

  it('accepts a point with or without a picked place', async () => {
    await expect(
      errorsOf(UpdateReceiptLocationDto, { latitude: 1, longitude: 2 }),
    ).resolves.toEqual([]);
    await expect(
      errorsOf(UpdateReceiptLocationDto, { latitude: 1, longitude: 2, place }),
    ).resolves.toEqual([]);
  });

  it('validates the nested place', async () => {
    for (const bad of [
      { ...place, name: '' },
      { ...place, name: 'x'.repeat(201) },
      { ...place, osmType: 'area' },
      { ...place, osmId: '12; drop' },
    ]) {
      await expect(
        errorsOf(UpdateReceiptLocationDto, { latitude: 1, longitude: 2, place: bad }),
      ).resolves.toEqual(['place']);
    }
  });
});

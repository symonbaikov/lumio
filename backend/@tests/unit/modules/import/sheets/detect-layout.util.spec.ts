import { GoogleSheetsImportLayoutType } from '@/modules/custom-tables/dto/google-sheets-import-preview.dto';
import { detectLayout } from '@/modules/import/sheets/detect-layout.util';

describe('detectLayout', () => {
  it('returns FLAT for a normal transaction-list sheet', () => {
    const values: unknown[][] = [
      ['Date', 'Amount', 'Description'],
      ['2026-01-01', '-100', 'Groceries'],
      ['2026-01-02', '2000', 'Salary'],
    ];

    expect(detectLayout(values, 0)).toBe(GoogleSheetsImportLayoutType.FLAT);
  });

  it('returns MATRIX for a wide pivot sheet with a date header per column', () => {
    const header = [
      'Category',
      ...Array.from({ length: 14 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`),
    ];
    const rows = Array.from({ length: 10 }, (_, r) => [
      `Row ${r}`,
      ...Array.from({ length: 14 }, () => '10'),
    ]);
    const values = [header, ...rows];

    expect(detectLayout(values, 0)).toBe(GoogleSheetsImportLayoutType.MATRIX);
  });
});

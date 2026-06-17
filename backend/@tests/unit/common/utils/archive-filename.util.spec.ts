import { sanitizeArchiveEntryName } from '@/common/utils/filename.util';

describe('archive filename sanitization', () => {
  it.each([
    ['../../secret.pdf', 'secret.pdf'],
    ['..\\..\\secret.csv', 'secret.csv'],
    ['/absolute/path/report.xlsx', 'report.xlsx'],
    ['safe\u0000name.pdf', 'safe_name.pdf'],
  ])('normalizes unsafe ZIP entry basename %s', (input, expected) => {
    expect(sanitizeArchiveEntryName(input)).toBe(expected);
  });

  it('preserves ordinary non-ASCII filenames', () => {
    expect(sanitizeArchiveEntryName('Пример выписки.pdf')).toBe('Пример выписки.pdf');
  });
});

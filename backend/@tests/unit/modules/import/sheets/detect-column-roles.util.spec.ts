import { detectColumnRoles } from '../../../../../src/modules/import/sheets/detect-column-roles.util';

describe('detectColumnRoles', () => {
  it('maps a typical ru budget sheet', () => {
    const roles = detectColumnRoles([
      { title: 'Дата', samples: ['01.02.2024', '02.02.2024'] },
      { title: 'Описание', samples: ['Магнит', 'Такси'] },
      { title: 'Категория', samples: ['Еда', 'Транспорт'] },
      { title: 'Сумма', samples: ['-1 200,50', '-450'] },
    ]);
    expect(roles).toEqual(['date', 'description', 'category', 'amount']);
  });

  it('maps separate debit/credit columns', () => {
    const roles = detectColumnRoles([
      { title: 'Date', samples: ['2024-01-01'] },
      { title: 'Расход', samples: ['1200'] },
      { title: 'Приход', samples: ['', '5000'] },
    ]);
    expect(roles).toEqual(['date', 'debit', 'credit']);
  });

  it('falls back to content when headers are meaningless', () => {
    const roles = detectColumnRoles([
      { title: 'A', samples: ['01.02.2024', '02.02.2024'] },
      { title: 'B', samples: ['-1 200,50', '-450'] },
      { title: 'C', samples: ['Магнит', 'Такси'] },
    ]);
    expect(roles).toEqual(['date', 'amount', 'description']);
  });

  it('never assigns the same single-slot role twice', () => {
    const roles = detectColumnRoles([
      { title: 'Дата', samples: ['01.02.2024'] },
      { title: 'Дата оплаты', samples: ['03.02.2024'] },
    ]);
    expect(roles.filter((r) => r === 'date')).toHaveLength(1);
    expect(roles[1]).toBe('ignore');
  });

  it('never assigns the same single-slot role twice for a content-inferred role (amount)', () => {
    const roles = detectColumnRoles([
      { title: 'X', samples: ['-1 200,50', '-450'] },
      { title: 'Y', samples: ['100', '200'] },
    ]);
    expect(roles.filter((r) => r === 'amount')).toHaveLength(1);
    const ignoreCount = roles.filter((r) => r === 'ignore').length;
    expect(ignoreCount).toBe(1);
  });

  it('infers category from content when values repeat under a meaningless header', () => {
    const roles = detectColumnRoles([
      { title: 'X', samples: ['01.02.2024', '02.02.2024', '03.02.2024'] },
      { title: 'Y', samples: ['Еда', 'Транспорт', 'Еда', 'Еда', 'Транспорт'] },
    ]);
    expect(roles).toEqual(['date', 'category']);
  });

  it('returns ignore for a column with no signal at all (all-empty samples, meaningless header)', () => {
    const roles = detectColumnRoles([{ title: 'Z', samples: ['', '', ''] }]);
    expect(roles).toEqual(['ignore']);
  });

  it('resolves a header matching two keyword categories by picking the longer keyword match', () => {
    // "Дата сумма" contains both the "date" keyword "дата" (4 chars) and the "amount"
    // keyword "сумма" (5 chars); the longer, more specific match wins.
    const roles = detectColumnRoles([{ title: 'Дата сумма', samples: ['01.02.2024'] }]);
    expect(roles).toEqual(['amount']);
  });
});

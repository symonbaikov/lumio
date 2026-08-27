import { describe, expect, it } from 'vitest';
import * as xlsx from 'xlsx';
import { type ReadableTabularFile, TabularFileError, readTabularFile } from './tabularFileReader';

function makeFile(name: string, data: ArrayBuffer | string): ReadableTabularFile {
  const buffer =
    typeof data === 'string' ? (new TextEncoder().encode(data).buffer as ArrayBuffer) : data;
  return { name, size: buffer.byteLength, arrayBuffer: async () => buffer };
}

function xlsxFile(rows: unknown[][], name = 'book.xlsx'): ReadableTabularFile {
  const sheet = xlsx.utils.aoa_to_sheet(rows);
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, 'Sheet1');
  const buffer = xlsx.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return makeFile(name, buffer);
}

describe('readTabularFile', () => {
  it('reads an xlsx sheet into a row matrix', async () => {
    const file = xlsxFile([
      ['Дата', 'Сумма'],
      ['2026-01-15', 1500.5],
      ['2026-02-01', 20],
    ]);

    const rows = await readTabularFile(file);

    expect(rows[0]).toEqual(['Дата', 'Сумма']);
    expect(rows).toHaveLength(3);
    // Значения приходят строками — так же, как при вставке из буфера.
    expect(typeof rows[1][1]).toBe('string');
  });

  it('reads a csv file', async () => {
    const file = makeFile('data.csv', 'a,b\n1,2\n');

    const rows = await readTabularFile(file);

    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('drops fully empty rows instead of importing blanks', async () => {
    const file = xlsxFile([
      ['a', 'b'],
      ['', ''],
      ['1', '2'],
    ]);

    const rows = await readTabularFile(file);

    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('rejects an unsupported extension', async () => {
    await expect(readTabularFile(makeFile('notes.pdf', 'x'))).rejects.toMatchObject({
      reason: 'unsupported',
    });
  });

  it('rejects a file with no usable rows', async () => {
    await expect(readTabularFile(xlsxFile([['', '']]))).rejects.toBeInstanceOf(TabularFileError);
  });
});

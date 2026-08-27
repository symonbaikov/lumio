'use client';

/** Расширения, которые умеет разобрать readTabularFile. */
export const TABULAR_FILE_ACCEPT = '.csv,.tsv,.xlsx,.xls';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export class TabularFileError extends Error {
  constructor(
    message: string,
    readonly reason: 'too-large' | 'unsupported' | 'empty' | 'unreadable',
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'TabularFileError';
  }
}

/**
 * Ровно то, что нужно для чтения: настоящий File этому удовлетворяет.
 * Узкий тип заодно позволяет тестам не поднимать весь File API.
 */
export interface ReadableTabularFile {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function isSupported(fileName: string): boolean {
  return /\.(csv|tsv|xlsx|xls)$/i.test(fileName);
}

/**
 * Приводит CSV/XLSX к той же матрице строк, что даёт разбор буфера обмена,
 * чтобы импорт файлом шёл через готовый маппинг колонок, а не через свой.
 */
export async function readTabularFile(file: ReadableTabularFile): Promise<string[][]> {
  if (!isSupported(file.name)) {
    throw new TabularFileError('Формат файла не поддерживается', 'unsupported');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new TabularFileError('Файл слишком большой', 'too-large');
  }

  let rows: string[][];
  try {
    const xlsx = await import('xlsx');
    const buffer = await file.arrayBuffer();
    // raw: false — даты и числа приходят уже отформатированными строками,
    // как если бы их скопировали из таблицы руками.
    const workbook = xlsx.read(buffer, { type: 'array', cellDates: true, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new TabularFileError('В файле нет листов', 'empty');
    }
    const matrix = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    });
    rows = matrix.map(row =>
      (Array.isArray(row) ? row : []).map(cell =>
        cell === null || cell === undefined ? '' : String(cell).trim(),
      ),
    );
  } catch (error) {
    if (error instanceof TabularFileError) {
      throw error;
    }
    // cause сохраняем: без неё причина сбоя парсера теряется навсегда.
    throw new TabularFileError('Не удалось прочитать файл', 'unreadable', { cause: error });
  }

  // Полностью пустые строки в конце листа только мешают предпросмотру.
  const cleaned = rows.filter(row => row.some(cell => cell !== ''));
  if (!cleaned.length) {
    throw new TabularFileError('Файл не содержит данных', 'empty');
  }
  return cleaned;
}

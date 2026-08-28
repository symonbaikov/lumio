/**
 * Вычислитель формул колонок: арифметика над полями строки.
 *
 * Умышленно НЕ использует eval/new Function — выражение приходит от
 * пользователя и попадает в общий воркспейс, поэтому исполнять его как код
 * недопустимо. Здесь честный разбор: токенизация -> сортировочная станция ->
 * вычисление ОПЗ. Поддержки диапазонов и функций Excel нет и не планируется.
 */

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'field'; key: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' };

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

const MAX_EXPRESSION_LENGTH = 500;

/** Ссылка на колонку: [ключ] — скобки снимают вопрос о пробелах в ключе. */
const FIELD_RE = /^\[([^\]]{1,120})\]/;
const NUMBER_RE = /^\d+(?:\.\d+)?/;

export function tokenizeFormula(expression: string): Token[] {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new FormulaError('Formula is too long');
  }
  const tokens: Token[] = [];
  let rest = expression;

  while (rest.length) {
    const char = rest[0];

    if (char === ' ' || char === '\t') {
      rest = rest.slice(1);
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      rest = rest.slice(1);
      continue;
    }
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ kind: 'op', value: char });
      rest = rest.slice(1);
      continue;
    }
    const field = FIELD_RE.exec(rest);
    if (field) {
      tokens.push({ kind: 'field', key: field[1].trim() });
      rest = rest.slice(field[0].length);
      continue;
    }
    const num = NUMBER_RE.exec(rest);
    if (num) {
      tokens.push({ kind: 'number', value: Number(num[0]) });
      rest = rest.slice(num[0].length);
      continue;
    }
    throw new FormulaError(`Invalid character in formula: ${char}`);
  }

  return tokens;
}

/** Сортировочная станция: инфиксная запись -> обратная польская. */
function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.kind === 'number' || token.kind === 'field') {
      output.push(token);
      continue;
    }
    if (token.kind === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.kind === 'op' && PRECEDENCE[top.value] >= PRECEDENCE[token.value]) {
          output.push(stack.pop() as Token);
          continue;
        }
        break;
      }
      stack.push(token);
      continue;
    }
    if (token.value === '(') {
      stack.push(token);
      continue;
    }
    let matched = false;
    while (stack.length) {
      const top = stack.pop() as Token;
      if (top.kind === 'paren' && top.value === '(') {
        matched = true;
        break;
      }
      output.push(top);
    }
    if (!matched) {
      throw new FormulaError('Unbalanced parenthesis in formula');
    }
  }

  while (stack.length) {
    const top = stack.pop() as Token;
    if (top.kind === 'paren') {
      throw new FormulaError('Unbalanced parenthesis in formula');
    }
    output.push(top);
  }

  return output;
}

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') {
    // Пустая ячейка — ноль: иначе одна пустая клетка обнуляла бы всю колонку ошибкой.
    return 0;
  }
  if (typeof raw === 'boolean') {
    return raw ? 1 : 0;
  }
  const num = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(num)) {
    throw new FormulaError('Non-numeric value in formula');
  }
  return num;
}

/**
 * Вычисляет формулу для одной строки. Возвращает null, если посчитать нельзя —
 * ошибка в одной строке не должна ронять выдачу всей таблицы.
 */
export function evaluateFormula(
  expression: string,
  rowData: Record<string, unknown>,
): number | null {
  try {
    const rpn = toRpn(tokenizeFormula(expression));
    const stack: number[] = [];

    for (const token of rpn) {
      if (token.kind === 'number') {
        stack.push(token.value);
        continue;
      }
      if (token.kind === 'field') {
        stack.push(toNumber(rowData?.[token.key]));
        continue;
      }
      if (token.kind !== 'op') {
        throw new FormulaError('Invalid formula');
      }
      const right = stack.pop();
      const left = stack.pop();
      if (left === undefined || right === undefined) {
        throw new FormulaError('Invalid formula');
      }
      if (token.value === '/' && right === 0) {
        // Деление на ноль — пустая ячейка, а не Infinity в отчёте.
        return null;
      }
      const result =
        token.value === '+'
          ? left + right
          : token.value === '-'
            ? left - right
            : token.value === '*'
              ? left * right
              : left / right;
      stack.push(result);
    }

    if (stack.length !== 1) {
      throw new FormulaError('Invalid formula');
    }
    const value = stack[0];
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Проверка формулы при сохранении колонки: тут ошибку нужно показать. */
export function assertValidFormula(expression: string, knownKeys: string[]): void {
  const tokens = tokenizeFormula(expression);
  if (!tokens.length) {
    throw new FormulaError('Formula is empty');
  }
  const known = new Set(knownKeys);
  for (const token of tokens) {
    if (token.kind === 'field' && !known.has(token.key)) {
      throw new FormulaError(`Column not found: ${token.key}`);
    }
  }
  // Разбор в ОПЗ ловит непарные скобки и мусор в структуре.
  toRpn(tokens);
}

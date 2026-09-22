import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Грид читает состояние выделения из мутабельного объекта TanStack Table, а не
 * из пропов. React Compiler этого не видит: при смене rowSelection ни одна
 * ссылка в пропах не меняется, он отдаёт закешированный элемент, и чекбоксы
 * перестают перерисовываться (состояние при этом меняется — баг выглядит как
 * «галочки не ставятся»).
 *
 * Тест сторожит директиву, потому что поведенческим тестом это не поймать:
 * vitest не подключает babel-plugin-react-compiler, в jsdom баг не
 * воспроизводится.
 */
describe('grid opt-out from React Compiler', () => {
  it.each(['CustomTableTanStack.tsx', 'components/DesktopTableView.tsx'])(
    '%s keeps the "use no memo" directive',
    file => {
      const source = readFileSync(path.join(here, file), 'utf8');
      expect(source).toContain("'use no memo';");
    },
  );
});

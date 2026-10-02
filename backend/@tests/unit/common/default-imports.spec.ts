import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * The backend compiles without esModuleInterop, so `import x from 'pkg'` becomes
 * `pkg_1.default` at runtime. A CommonJS package without a `default` export is
 * then undefined in ts-node and in the build, while Jest (Babel, interop on)
 * hides it. Every default import of a package must resolve to a real default.
 */
const SRC = path.join(process.cwd(), 'src');
const DEFAULT_IMPORT = /^import (\w+) from '([^.'@][^']*|@[^/'][^']*)';$/gm;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('default imports of packages', () => {
  it('have a default export at runtime', () => {
    const imports = new Map<string, string[]>();
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(DEFAULT_IMPORT)) {
        const where = imports.get(match[2]) ?? [];
        where.push(path.relative(SRC, file));
        imports.set(match[2], where);
      }
    }
    const missing = [...imports.entries()]
      .filter(([specifier]) => (jest.requireActual(specifier) as { default?: unknown }).default === undefined)
      .map(([specifier, files]) => `${specifier} (${files.join(', ')})`);

    expect(missing).toEqual([]);
  });
});

#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const Dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(Dirname, '..');

const LOCALE_FILE = join(rootDir, 'frontend/app/lib/locale.ts');
const LOCALES_RE = /export const SUPPORTED_LOCALES\s*=\s*\[([\s\S]*?)\]/;

function getRequiredLocales() {
  const localeSource = readFileSync(LOCALE_FILE, 'utf8');
  const match = localeSource.match(LOCALES_RE);
  if (!match) {
    throw new Error(`Unable to parse SUPPORTED_LOCALES from ${LOCALE_FILE}`);
  }

  const raw = match[1];
  const locales = [...raw.matchAll(/'([^']+)'/g)].map(([, value]) => value);

  if (locales.length === 0) {
    throw new Error(`No locales found in ${LOCALE_FILE}`);
  }

  return locales;
}

function walkDir(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (['node_modules', '.intlayer', '.next'].includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      walkDir(fullPath, results);
      continue;
    }

    if (fullPath.includes('.content') && fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

function findMatchingBrace(content, openIdx) {
  let depth = 1;
  let i = openIdx + 1;

  while (i < content.length && depth > 0) {
    if (content[i] === '{') {
      depth += 1;
    } else if (content[i] === '}') {
      depth -= 1;
    }
    i += 1;
  }

  return i - 1;
}

function presentLocales(block) {
  const set = new Set();
  const re = /(?:^|[{,\n])\s*(\w+)\s*:/gm;
  let match;

  while ((match = re.exec(block)) !== null) {
    set.add(match[1]);
  }

  return set;
}

function collectChecks(files, requiredLocales) {
  const issues = [];
  const tCallRegex = /\bt\(\{/g;

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    let match;

    while ((match = tCallRegex.exec(content)) !== null) {
      const openBraceIdx = match.index + 2;
      const closeBraceIdx = findMatchingBrace(content, openBraceIdx);
      const block = content.substring(openBraceIdx, closeBraceIdx + 1);
      const available = presentLocales(block);
      const missing = requiredLocales.filter((locale) => !available.has(locale));

      if (missing.length > 0) {
        issues.push({
          filePath,
          missing,
        });
      }
    }
  }

  return issues;
}

function main() {
  const requiredLocales = getRequiredLocales();
  const allFiles = walkDir(join(rootDir, 'frontend/app'));
  const issues = collectChecks(allFiles, requiredLocales);

  if (issues.length === 0) {
    console.log(`✓ Intlayer locales complete across ${allFiles.length} content files.`);
    return;
  }

  console.log(`Missing locales found in ${issues.length} translation call(s):`);

  for (const issue of issues) {
    const relPath = issue.filePath.replace(rootDir + '/', '');
    console.log(`${relPath}: ${issue.missing.join(', ')}`);
  }

  process.exitCode = 1;
}

main();

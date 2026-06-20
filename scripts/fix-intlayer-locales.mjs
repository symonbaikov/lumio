#!/usr/bin/env node
/**
 * Codemod: Add missing locale keys to intlayer t() calls.
 * Handles both multiline and single-line t({...}) objects.
 * Preserves quote style of the source `en` value to avoid escaping issues.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

const REQUIRED_LOCALES = getRequiredLocales();

function walkDir(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (['node_modules', '.intlayer', '.next'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (
      (entry.name.includes('.content') && entry.name.endsWith('.ts')) ||
      entry.name === 'make-cloud-storage-content.ts'
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function findMatchingBrace(content, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  return i - 1;
}

/**
 * Extract the RAW source text for the en (or ru) value, INCLUDING its surrounding quotes.
 * This way we can paste it verbatim for new locales without any escaping issues.
 */
function extractEnRawSnippet(objStr) {
  for (const key of ['en', 'ru']) {
    // Match: `en: 'value'` or `en: "value"` or `en: \`value\``
    // Capture the full quote+value+quote as raw text
    const regex = new RegExp(
      `\\b${key}\\s*:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\`)`,
      's',
    );
    const m = objStr.match(regex);
    if (m) return m[1]; // e.g. `'hello'` or `"don't"` or `` `hi` ``
  }
  return null;
}

const allFiles = walkDir(join(rootDir, 'frontend/app'));
let totalFixed = 0;
let filesModified = 0;

for (const filePath of allFiles) {
  let content = readFileSync(filePath, 'utf8');
  const tCallRegex = /\bt\(\{/g;
  let match;
  const replacements = [];

  while ((match = tCallRegex.exec(content)) !== null) {
    const openBraceIdx = match.index + 2;
    const closeBraceIdx = findMatchingBrace(content, openBraceIdx);
    const objStr = content.substring(openBraceIdx, closeBraceIdx + 1);

    // Parse present locales
    const presentLocales = new Set();
    const localeRegex = /(?:^|[{,\n])\s*(\w+)\s*:/gm;
    let lm;
    while ((lm = localeRegex.exec(objStr)) !== null) {
      presentLocales.add(lm[1]);
    }

    const missing = REQUIRED_LOCALES.filter(l => !presentLocales.has(l));
    if (missing.length === 0) continue;

    // Get raw snippet including quotes, e.g. `'hello'` or `"don't"`
    const rawSnippet = extractEnRawSnippet(objStr);
    if (!rawSnippet) continue;

    const isMultiline = objStr.includes('\n');

    if (isMultiline) {
      const indentMatch = objStr.match(/\n(\s+)\w+\s*:/);
      const indent = indentMatch ? indentMatch[1] : '      ';

      const newEntries = missing.map(locale => `${indent}${locale}: ${rawSnippet},`).join('\n');

      const lastBraceMatch = objStr.match(/\n(\s*)\}$/);
      if (lastBraceMatch) {
        const newObj = objStr.replace(/\n(\s*)\}$/, `\n${newEntries}\n${lastBraceMatch[1]}}`);
        replacements.push({ start: openBraceIdx, end: closeBraceIdx, replacement: newObj });
      } else {
        // Closing } is on same line as last entry (e.g. `id: 'Jenis' }`)
        const newObj = objStr.replace(/\s*\}$/, `,\n${newEntries}\n    }`);
        replacements.push({ start: openBraceIdx, end: closeBraceIdx, replacement: newObj });
      }
    } else {
      // Single-line: convert to multiline
      // Extract all existing key:value pairs as raw text
      const pairRegex = /(\w+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`)/g;
      const pairs = [];
      let pm;
      while ((pm = pairRegex.exec(objStr)) !== null) {
        pairs.push({ key: pm[1], raw: pm[2] });
      }
      for (const locale of missing) {
        pairs.push({ key: locale, raw: rawSnippet });
      }
      const indent = '      ';
      const lines = pairs.map(p => `${indent}${p.key}: ${p.raw},`);
      const newObj = `{\n${lines.join('\n')}\n    }`;
      replacements.push({ start: openBraceIdx, end: closeBraceIdx, replacement: newObj });
    }
    totalFixed += missing.length;
  }

  if (replacements.length > 0) {
    for (let r = replacements.length - 1; r >= 0; r--) {
      const { start, end, replacement } = replacements[r];
      content = content.substring(0, start) + replacement + content.substring(end + 1);
    }
    writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`✓ ${filePath} — ${replacements.length} t() calls fixed`);
  }
}

console.log(`\nDone: ${totalFixed} missing locale entries added across ${filesModified} files.`);

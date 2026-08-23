/**
 * Records golden fixtures for the parsing suite.
 *
 *   npm run golden:record -- docs/statements-examples/kaspi/kaspi-bank.pdf kaspi
 *   npm run golden:record -- --all
 *
 * Copies the statement into `backend/golden/<bank>/` and writes the parser's
 * output next to it as `<file>.expected.json`.
 *
 * A recording is NOT a verified fixture. It captures whatever the parser does
 * today, bugs included — the existing kaspi fixture, for instance, has a table
 * header row recorded as a transaction. Always diff the printed reconciliation
 * against the real statement before committing, and delete rows the parser
 * invented rather than adjusting the expected totals to match them.
 *
 * Requires python3 with pdfplumber on PATH (same prerequisite as parsing).
 */
import * as fs from 'fs';
import * as path from 'path';
import { FileType } from '../src/entities/statement.entity';
import { ParserFactoryService } from '../src/modules/parsing/services/parser-factory.service';

const GOLDEN_ROOT = path.resolve(__dirname, '../golden');
const EXAMPLES_ROOT = path.resolve(__dirname, '../../docs/statements-examples');

function guessFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return FileType.XLSX;
  }
  if (ext === '.csv') {
    return FileType.CSV;
  }
  if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext)) {
    return FileType.IMAGE;
  }
  return FileType.PDF;
}

async function record(sourcePath: string, bank: string): Promise<boolean> {
  const factory = new ParserFactoryService();
  const fileType = guessFileType(sourcePath);

  const detected = await factory.detectBankAndFormat(sourcePath, fileType);
  const parser = await factory.getParser(detected.bankName, fileType, sourcePath);
  if (!parser) {
    console.error(`✗ ${sourcePath}: no parser (detected ${detected.bankName})`);
    return false;
  }

  const parsed = await parser.parse(sourcePath);

  const targetDir = path.join(GOLDEN_ROOT, bank);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, path.basename(sourcePath));
  fs.copyFileSync(sourcePath, targetFile);
  fs.writeFileSync(`${targetFile}.expected.json`, `${JSON.stringify(parsed, null, 2)}\n`);

  const debits = parsed.transactions.reduce((acc, t) => acc + (Number(t.debit) || 0), 0);
  const credits = parsed.transactions.reduce((acc, t) => acc + (Number(t.credit) || 0), 0);
  const { balanceStart, balanceEnd } = parsed.metadata;

  console.log(`✓ ${path.relative(GOLDEN_ROOT, targetFile)}`);
  console.log(`    parser:       ${parser.constructor.name}`);
  console.log(`    transactions: ${parsed.transactions.length}`);
  console.log(`    debit/credit: ${debits.toFixed(2)} / ${credits.toFixed(2)}`);

  if (balanceStart != null && balanceEnd != null) {
    const reconciled = balanceStart + credits - debits;
    const drift = Math.abs(reconciled - balanceEnd);
    const verdict = drift <= 0.01 ? 'reconciles' : `DRIFT ${drift.toFixed(2)} — review before commit`;
    console.log(`    balance:      ${balanceStart} -> ${balanceEnd} (${verdict})`);
    return drift <= 0.01;
  }

  console.log('    balance:      not reported by the statement — verify by hand');
  return true;
}

function collectExamples(): Array<{ file: string; bank: string }> {
  if (!fs.existsSync(EXAMPLES_ROOT)) {
    return [];
  }
  return fs
    .readdirSync(EXAMPLES_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(dir =>
      fs
        .readdirSync(path.join(EXAMPLES_ROOT, dir.name))
        .map(name => ({ file: path.join(EXAMPLES_ROOT, dir.name, name), bank: dir.name })),
    );
}

async function main() {
  const args = process.argv.slice(2);
  const targets =
    args[0] === '--all'
      ? collectExamples()
      : args.length === 2
        ? [{ file: path.resolve(args[0]), bank: args[1] }]
        : null;

  if (!targets) {
    console.error('usage: record-golden <statement-file> <bank> | record-golden --all');
    process.exit(2);
    return;
  }

  if (targets.length === 0) {
    console.error(`No statements found under ${EXAMPLES_ROOT}`);
    process.exit(1);
    return;
  }

  let clean = 0;
  for (const target of targets) {
    if (await record(target.file, target.bank)) {
      clean++;
    }
  }

  console.log(`\n${clean}/${targets.length} recordings reconcile against their stated balances.`);
  console.log('Review every fixture against the source statement before committing.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

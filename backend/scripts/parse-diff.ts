/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CURRENCY } from '../src/common/constants/currency.constants';
import { FileType } from '../src/entities/statement.entity';
import type {
  ParsedStatement,
  ParsedTransaction,
} from '../src/modules/parsing/interfaces/parsed-statement.interface';
import { ParserFactoryService } from '../src/modules/parsing/services/parser-factory.service';

type ParsedTransactionJson = Partial<ParsedTransaction> & {
  transactionDate?: string;
  date?: string;
};

function guessFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return FileType.PDF;
  if (ext === '.xlsx' || ext === '.xls') return FileType.XLSX;
  if (ext === '.csv') return FileType.CSV;
  return FileType.PDF;
}

function loadExpected(filePath: string): ParsedStatement {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const tx = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const metadata = parsed.metadata || {};
  return {
    metadata: {
      accountNumber: metadata.accountNumber || '',
      currency: metadata.currency || DEFAULT_CURRENCY,
      dateFrom: new Date(metadata.dateFrom || metadata.date_from || Date.now()),
      dateTo: new Date(metadata.dateTo || metadata.date_to || metadata.dateFrom || Date.now()),
      balanceStart: metadata.balanceStart ?? metadata.balance_start,
      balanceEnd: metadata.balanceEnd ?? metadata.balance_end,
    },
    transactions: tx.map((t: ParsedTransactionJson) => ({
      ...t,
      transactionDate: new Date(t.transactionDate || t.date || Date.now()),
    })),
  };
}

function summarize(transactions: ParsedTransaction[]) {
  const sum = (key: 'debit' | 'credit') =>
    transactions.reduce((acc, t) => acc + (Number(t[key]) || 0), 0);
  return {
    count: transactions.length,
    debit: Number(sum('debit').toFixed(2)),
    credit: Number(sum('credit').toFixed(2)),
  };
}

function diffTransactions(a: ParsedTransaction[], b: ParsedTransaction[]) {
  const key = (t: ParsedTransaction) => {
    const date = t.transactionDate
      ? new Date(t.transactionDate).toISOString().split('T')[0]
      : 'no-date';
    const amount = t.debit ?? t.credit ?? 0;
    return [
      date,
      amount.toFixed(2),
      (t.documentNumber || '').trim().toLowerCase(),
      (t.counterpartyName || '').trim().toLowerCase(),
    ].join('|');
  };

  const mapA = new Map<string, ParsedTransaction>();
  a.forEach(tx => mapA.set(key(tx), tx));
  const mapB = new Map<string, ParsedTransaction>();
  b.forEach(tx => mapB.set(key(tx), tx));

  const missing = Array.from(mapB.keys()).filter(k => !mapA.has(k));
  const extra = Array.from(mapA.keys()).filter(k => !mapB.has(k));

  return { missing, extra };
}

async function main() {
  const file = process.argv[2];
  const expectedPath = process.argv[3];
  if (!file || !expectedPath) {
    console.error('Usage: npm run parse:diff -- <file> <expected.json>');
    process.exit(1);
  }

  const filePath = path.resolve(file);
  const expectedFile = path.resolve(expectedPath);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(expectedFile)) {
    console.error(`Expected JSON not found: ${expectedFile}`);
    process.exit(1);
  }

  const fileType = guessFileType(filePath);
  const factory = new ParserFactoryService();
  const detect = await factory.detectBankAndFormat(filePath, fileType);
  const parser = await factory.getParser(detect.bankName, fileType, filePath);
  if (!parser) {
    throw new Error('No parser for file');
  }

  console.log(`[*] File: ${filePath}`);
  console.log(`[*] Detected bank=${detect.bankName} format=${detect.formatVersion || 'unknown'}`);
  console.log(
    `[*] Parser: ${parser.constructor.name} (version ${typeof parser.getVersion === 'function' ? parser.getVersion() : 'unknown'})`,
  );

  const parsed = await parser.parse(filePath);
  const expected = loadExpected(expectedFile);

  const sumActual = summarize(parsed.transactions);
  const sumExpected = summarize(expected.transactions);

  console.log('[*] Actual:', sumActual);
  console.log('[*] Expected:', sumExpected);
  console.log('[*] Δcount:', sumActual.count - sumExpected.count);
  console.log('[*] Δdebit:', (sumActual.debit - sumExpected.debit).toFixed(2));
  console.log('[*] Δcredit:', (sumActual.credit - sumExpected.credit).toFixed(2));

  const { missing, extra } = diffTransactions(parsed.transactions, expected.transactions);
  if (missing.length || extra.length) {
    console.log(`[!] Missing from actual (in expected): ${missing.length}`);
    missing.slice(0, 10).forEach(k => console.log(`   - ${k}`));
    if (missing.length > 10) console.log('   ...');

    console.log(`[!] Extra in actual (not in expected): ${extra.length}`);
    extra.slice(0, 10).forEach(k => console.log(`   + ${k}`));
    if (extra.length > 10) console.log('   ...');
  } else {
    console.log('[*] Transactions match by signature');
  }
}

main().catch(error => {
  console.error('[!] parse-diff failed:', error);
  process.exit(1);
});

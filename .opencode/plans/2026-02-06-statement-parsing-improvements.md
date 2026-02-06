# Statement Parsing Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix statement parsing to be fast, predictable, and show transactions immediately after upload without page reload.

**Architecture:** 
1. Auto-commit transactions immediately after parsing (remove preview mode)
2. Optimize PDF parsing by caching pdfplumber results and reducing redundant calls
3. Fix frontend to properly refresh data after upload
4. Improve Kaspi/Bereke parsers with comprehensive TDD

**Tech Stack:** NestJS, Next.js 14, Jest, pdfplumber (Python)

---

## Phase 1: Fix Transaction Display Issue (Critical)

### Task 1.1: Auto-commit transactions after parsing

**Files:**
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts:619-700`
- Test: `backend/@tests/unit/test/statement-processing.service.spec.ts`

**Problem:** Currently transactions are stored in `parsingDetails.importPreview.transactions` JSON blob instead of being committed to `transactions` table. The edit page queries `/transactions?statement_id=X` which returns nothing.

**Step 1: Write the failing test**

Add to `backend/@tests/unit/test/statement-processing.service.spec.ts`:

```typescript
describe('processStatement auto-commit', () => {
  it('should automatically create transactions in database after parsing', async () => {
    // Setup mock statement with parsed transactions
    const mockStatement = createMockStatement();
    const mockParsedResult = {
      metadata: { accountNumber: 'KZ123', currency: 'KZT', dateFrom: new Date(), dateTo: new Date() },
      transactions: [
        { transactionDate: new Date(), counterpartyName: 'Test', debit: 1000, paymentPurpose: 'Test payment' },
      ],
    };
    
    mockParserFactory.getParser.mockResolvedValue({
      parse: jest.fn().mockResolvedValue(mockParsedResult),
      canParse: jest.fn().mockResolvedValue(true),
    });
    
    const result = await service.processStatement(mockStatement.id);
    
    // Verify transactions were created in DB
    expect(mockTransactionRepository.save).toHaveBeenCalled();
    expect(result.totalTransactions).toBe(1);
    expect(result.status).toBe(StatementStatus.COMPLETED);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- --testPathPattern="statement-processing.service" -t "auto-commit"`
Expected: FAIL - transactions not created

**Step 3: Modify processStatementInternal to auto-commit**

In `backend/src/modules/parsing/services/statement-processing.service.ts`, replace preview mode with direct commit.

Find lines 619-700 and replace the preview session logic:

```typescript
// REPLACE THIS (around lines 619-670):
// addLog('info', 'Preparing preview import session...');
// const session = await this.importSessionService.createSession(...);
// const previewResult = await this.importSessionService.processImport(...);
// parsingDetails.importPreview = {...};
// parsingDetails.transactionsCreated = 0;

// WITH THIS:
addLog('info', 'Creating transactions in database...');

const { transactions: createdTransactions, duplicatesSkipped } = await this.createTransactions(
  statement,
  parsedStatement.transactions,
  statement.userId,
  majorityCategory.categoryId,
  addLog,
);

parsingDetails.transactionsCreated = createdTransactions.length;
parsingDetails.transactionsDeduplicated = duplicatesSkipped;

statement.totalTransactions = createdTransactions.length;
statement.totalDebit = createdTransactions.reduce((sum, t) => sum + (t.debit ?? 0), 0);
statement.totalCredit = createdTransactions.reduce((sum, t) => sum + (t.credit ?? 0), 0);
```

Also change the final status from PARSED to COMPLETED (around line 695):

```typescript
// Change:
// const finalStatus = StatementStatus.PARSED;
// To:
const finalStatus = StatementStatus.COMPLETED;
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- --testPathPattern="statement-processing.service"`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/statement-processing.service.ts backend/@tests/unit/test/statement-processing.service.spec.ts
git commit -m "feat(parsing): auto-commit transactions after parsing instead of preview mode"
```

---

### Task 1.2: Fix frontend modal close and data refresh

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx:488-518`

**Problem:** Modal closes but list doesn't refresh properly because `loadStatements` may not be awaited.

**Step 1: Modify handleUpload to properly refresh**

Find `handleUpload` function (around line 488) and modify:

```typescript
const handleUpload = async () => {
  if (uploadFiles.length === 0) {
    setUploadError(resolveLabel(t.uploadModal?.pickAtLeastOne, "Select at least one file"));
    return;
  }

  setUploading(true);
  setUploadError(null);

  const formData = new FormData();
  uploadFiles.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("allowDuplicates", allowDuplicates ? "true" : "false");

  try {
    await apiClient.post("/statements/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Close modal and clear files first
    setUploadModalOpen(false);
    setUploadFiles([]);
    
    // Show success toast
    toast.success(resolveLabel(t.uploadModal?.uploadedProcessing, "Files uploaded and processed successfully"));
    
    // Force refresh the statements list - await this call!
    await loadStatements({ page: 1, search, notifyOnCompletion: false });
    
  } catch (error) {
    console.error("Failed to upload statements:", error);
    setUploadError(resolveLabel(t.uploadModal?.uploadFailed, "Failed to upload files"));
  } finally {
    setUploading(false);
  }
};
```

**Step 2: Verify loadStatements updates state correctly**

Check that `loadStatements` with `notifyOnCompletion: false` still updates the statements state (not just when silent=false). Look around line 430-486.

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx
git commit -m "fix(frontend): properly refresh statements list after upload"
```

---

## Phase 2: Speed Up PDF Parsing

### Task 2.1: Cache pdfplumber results in parser factory

**Files:**
- Modify: `backend/src/modules/parsing/services/parser-factory.service.ts`
- Modify: `backend/src/modules/parsing/parsers/base.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/kaspi.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/bereke-new.parser.ts`
- Modify: `backend/src/modules/parsing/parsers/bereke-old.parser.ts`

**Problem:** PDF text is extracted multiple times:
1. During `detectBankAndFormat`
2. During `parser.canParse` (each parser reads PDF again)
3. During `parser.parse` (parser reads PDF again)

The `pdf-parser.util.ts` already has a cache, but calls still spawn Python unnecessarily.

**Step 1: Modify parser interface to accept cached text**

In `backend/src/modules/parsing/interfaces/parser.interface.ts`, add optional cached data parameter:

```typescript
export interface Parser {
  canParse(bankName: BankName, fileType: FileType, filePath: string, cachedText?: string): Promise<boolean>;
  parse(filePath: string, cachedText?: string): Promise<ParsedStatement>;
  getVersion?(): string;
}
```

**Step 2: Update BaseParser**

In `backend/src/modules/parsing/parsers/base.parser.ts`:

```typescript
abstract canParse(
  bankName: BankName, 
  fileType: FileType, 
  filePath: string, 
  cachedText?: string
): Promise<boolean>;

abstract parse(filePath: string, cachedText?: string): Promise<ParsedStatement>;
```

**Step 3: Update KaspiParser to use cached text**

In `backend/src/modules/parsing/parsers/kaspi.parser.ts`:

```typescript
async canParse(bankName: BankName, fileType: FileType, filePath: string, cachedText?: string): Promise<boolean> {
  if (bankName !== BankName.KASPI && bankName !== BankName.OTHER) {
    return false;
  }
  if (fileType !== FileType.PDF) {
    return false;
  }

  try {
    const text = (cachedText || await extractTextFromPdf(filePath)).toLowerCase();
    return text.includes('kaspi') || text.includes('каспи') || text.includes('caspkzka');
  } catch (error) {
    console.error('[KaspiParser] Error in canParse:', error);
    return false;
  }
}

async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
  console.log('[KaspiParser] Starting to parse file:', filePath);

  const text = cachedText || await extractTextFromPdf(filePath);
  const { rows: tableRows } = await extractTablesFromPdf(filePath);
  // ... rest of parse method
}
```

**Step 4: Update ParserFactoryService to pass cached text**

In `backend/src/modules/parsing/services/parser-factory.service.ts`:

```typescript
async getParser(
  bankName: BankName, 
  fileType: FileType, 
  filePath: string,
  cachedText?: string
): Promise<Parser | null> {
  for (const parser of this.parsers) {
    if (await parser.canParse(bankName, fileType, filePath, cachedText)) {
      return parser;
    }
  }
  return null;
}
```

**Step 5: Update statement-processing.service.ts to extract text once**

```typescript
// Around line 420-445, after detecting bank:
const cachedText = statement.fileType === FileType.PDF 
  ? await extractTextFromPdf(processingFilePath) 
  : undefined;

const parser = await this.parserFactory.getParser(
  bankName,
  statement.fileType,
  processingFilePath,
  cachedText,
);
```

**Step 6: Commit**

```bash
git add backend/src/modules/parsing/
git commit -m "perf(parsing): cache PDF text extraction to avoid redundant Python calls"
```

---

### Task 2.2: Increase parsing concurrency

**Files:**
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts:35-36`

**Step 1: Increase semaphore limit**

Change from:
```typescript
private static readonly parsingSemaphore = new Semaphore(
  parsePositiveInt(process.env.STATEMENT_PARSING_CONCURRENCY, 2),
);
```

To:
```typescript
private static readonly parsingSemaphore = new Semaphore(
  parsePositiveInt(process.env.STATEMENT_PARSING_CONCURRENCY, 5),
);
```

**Step 2: Commit**

```bash
git add backend/src/modules/parsing/services/statement-processing.service.ts
git commit -m "perf(parsing): increase default parsing concurrency from 2 to 5"
```

---

### Task 2.3: Disable AI reconciliation by default

**Files:**
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts:531-560`

**Problem:** AI reconciliation adds significant latency with Gemini API calls.

**Step 1: Check if AI is explicitly enabled**

Around line 531, change:
```typescript
// FROM:
if (this.aiValidator.isAvailable()) {

// TO:
const aiEnabled = process.env.AI_PARSING_ENABLED === '1' || process.env.AI_PARSING_ENABLED === 'true';
if (aiEnabled && this.aiValidator.isAvailable()) {
```

**Step 2: Update the else branch message**

```typescript
} else {
  addLog('info', 'AI reconciliation disabled (set AI_PARSING_ENABLED=1 to enable)');
  this.reportAi('validate', 'skipped');
}
```

**Step 3: Commit**

```bash
git add backend/src/modules/parsing/services/statement-processing.service.ts
git commit -m "perf(parsing): make AI reconciliation opt-in for faster parsing"
```

---

## Phase 3: Improve Kaspi Parser (TDD)

### Task 3.1: Create golden test fixtures for Kaspi

**Files:**
- Create: `backend/golden/kaspi/sample1.pdf`
- Create: `backend/golden/kaspi/sample1.expected.json`

**Step 1: Create golden directory and copy test file**

```bash
mkdir -p backend/golden/kaspi
cp docs/statements-examples/kaspi-bank.pdf backend/golden/kaspi/sample1.pdf
```

**Step 2: Run parser manually to see output**

```bash
cd backend && npx ts-node -e "
const { ParserFactoryService } = require('./dist/modules/parsing/services/parser-factory.service');
const { FileType } = require('./dist/entities/statement.entity');
const factory = new ParserFactoryService();
(async () => {
  const filePath = '../docs/statements-examples/kaspi-bank.pdf';
  const detected = await factory.detectBankAndFormat(filePath, 'pdf');
  const parser = await factory.getParser(detected.bankName, 'pdf', filePath);
  const result = await parser.parse(filePath);
  console.log(JSON.stringify(result, null, 2));
})();
"
```

**Step 3: Create expected JSON based on actual PDF content**

Create `backend/golden/kaspi/sample1.expected.json` with the structure:

```json
{
  "metadata": {
    "accountNumber": "KZ17722S000023921191",
    "currency": "KZT",
    "dateFrom": "2026-02-01",
    "dateTo": "2026-02-06",
    "balanceStart": 198420.54,
    "balanceEnd": 182220.70
  },
  "transactions": [
    {
      "transactionDate": "2026-02-01",
      "documentNumber": "80000001",
      "counterpartyName": "Example counterparty",
      "debit": 5000.00,
      "credit": null,
      "paymentPurpose": "Payment purpose text"
    }
  ]
}
```

**Step 4: Run golden tests**

```bash
GOLDEN_ENABLED=1 cd backend && npm run test -- --testPathPattern="parsing.golden"
```

**Step 5: Commit**

```bash
git add backend/golden/
git commit -m "test(kaspi): add golden test fixtures for Kaspi parser"
```

---

### Task 3.2: Create unit tests for Kaspi parser

**Files:**
- Create: `backend/@tests/unit/modules/parsing/parsers/kaspi.parser.spec.ts`

**Step 1: Create comprehensive unit test file**

```typescript
import { KaspiParser } from '@/modules/parsing/parsers/kaspi.parser';
import { BankName, FileType } from '@/entities/statement.entity';
import * as pdfParserUtil from '@/common/utils/pdf-parser.util';

jest.mock('@/common/utils/pdf-parser.util');

describe('KaspiParser', () => {
  let parser: KaspiParser;
  
  beforeEach(() => {
    parser = new KaspiParser();
    jest.clearAllMocks();
    // Disable AI extraction for deterministic tests
    process.env.AI_PARSING_ENABLED = '0';
  });

  describe('canParse', () => {
    it('returns true for Kaspi bank PDF', async () => {
      const result = await parser.canParse(
        BankName.KASPI, 
        FileType.PDF, 
        '/mock.pdf', 
        'kaspi bank выписка'
      );
      expect(result).toBe(true);
    });

    it('returns true when text contains каспи', async () => {
      const result = await parser.canParse(
        BankName.OTHER, 
        FileType.PDF, 
        '/mock.pdf', 
        'АО Каспи Банк выписка'
      );
      expect(result).toBe(true);
    });

    it('returns false for non-PDF files', async () => {
      const result = await parser.canParse(BankName.KASPI, FileType.XLSX, '/mock.xlsx', '');
      expect(result).toBe(false);
    });

    it('returns false for non-Kaspi bank', async () => {
      const result = await parser.canParse(
        BankName.BEREKE_NEW, 
        FileType.PDF, 
        '/mock.pdf', 
        'some other bank'
      );
      expect(result).toBe(false);
    });
  });

  describe('extractBalancesFromText', () => {
    it('extracts balances with spaces in numbers', () => {
      const text = 'Входящий остаток 198 420,54\nИсходящий остаток 182 220,70';
      const balances = parser['extractBalancesFromText'](text);
      
      expect(balances.start).toBe(198420.54);
      expect(balances.end).toBe(182220.70);
    });

    it('extracts balances without spaces', () => {
      const text = 'Входящий остаток 198420,54\nИсходящий остаток 182220,70';
      const balances = parser['extractBalancesFromText'](text);
      
      expect(balances.start).toBe(198420.54);
      expect(balances.end).toBe(182220.70);
    });

    it('returns null when balances not found', () => {
      const text = 'Some text without balances';
      const balances = parser['extractBalancesFromText'](text);
      
      expect(balances.start).toBeNull();
      expect(balances.end).toBeNull();
    });
  });

  describe('extractPeriodFromText', () => {
    it('extracts date range with dash separator', () => {
      const text = 'Период: 01.02.2026 - 06.02.2026';
      const period = parser['extractPeriodFromText'](text);
      
      expect(period.from?.toISOString().split('T')[0]).toBe('2026-02-01');
      expect(period.to?.toISOString().split('T')[0]).toBe('2026-02-06');
    });

    it('extracts single date period', () => {
      const text = 'Период: 01.02.2026';
      const period = parser['extractPeriodFromText'](text);
      
      expect(period.from?.toISOString().split('T')[0]).toBe('2026-02-01');
      expect(period.to?.toISOString().split('T')[0]).toBe('2026-02-01');
    });
  });

  describe('extractKaspiAccountNumber', () => {
    it('extracts Kaspi account number', () => {
      const text = 'Номер счета: KZ17722S000023921191';
      const account = parser['extractKaspiAccountNumber'](text);
      
      expect(account).toBe('KZ17722S000023921191');
    });
  });

  describe('parse', () => {
    it('parses complete Kaspi statement', async () => {
      const mockText = `
        Kaspi Bank
        Выписка по счету KZ17722S000023921191
        Период: 01.02.2026 - 06.02.2026
        Входящий остаток 198 420,54
        Исходящий остаток 182 220,70
        
        80000001
        01.02.2026 10:30:00
        5 000,00
        ТОО Example Company БИН/ИИН 123456789012
        KZ1234567890123456789
        CASPKZKA
        110
        Оплата за услуги
      `;
      
      jest.spyOn(pdfParserUtil, 'extractTextFromPdf').mockResolvedValue(mockText);
      jest.spyOn(pdfParserUtil, 'extractTablesFromPdf').mockResolvedValue({ 
        rows: [], 
        structured: [] 
      });
      
      const result = await parser.parse('/mock/file.pdf');
      
      expect(result.metadata.accountNumber).toBe('KZ17722S000023921191');
      expect(result.metadata.currency).toBe('KZT');
      expect(result.metadata.balanceStart).toBe(198420.54);
      expect(result.metadata.balanceEnd).toBe(182220.70);
      expect(result.transactions.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests**

```bash
cd backend && npm run test -- --testPathPattern="kaspi.parser.spec"
```

**Step 3: Commit**

```bash
git add backend/@tests/unit/modules/parsing/parsers/kaspi.parser.spec.ts
git commit -m "test(kaspi): add comprehensive unit tests for Kaspi parser"
```

---

### Task 3.3: Fix Kaspi parser based on test failures

**Files:**
- Modify: `backend/src/modules/parsing/parsers/kaspi.parser.ts`

**Step 1: Improve extractPeriodFromText for date ranges**

Replace the current implementation with:

```typescript
private extractPeriodFromText(text: string): { from: Date | null; to: Date | null } {
  // Try "Период: DD.MM.YYYY - DD.MM.YYYY"
  const rangeMatch = text.match(/Период:\s*(\d{2}\.\d{2}\.\d{4})\s*[-–—]\s*(\d{2}\.\d{2}\.\d{4})/i);
  if (rangeMatch) {
    return {
      from: this.normalizeDate(rangeMatch[1]),
      to: this.normalizeDate(rangeMatch[2]),
    };
  }

  // Try "Период: DD.MM.YYYY"
  const singleMatch = text.match(/Период:\s*(\d{2}\.\d{2}\.\d{4})/i);
  if (singleMatch) {
    const date = this.normalizeDate(singleMatch[1]);
    return { from: date, to: date };
  }

  // Try "за период с DD.MM.YYYY по DD.MM.YYYY"
  const altMatch = text.match(/за\s+период\s+с\s+(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})/i);
  if (altMatch) {
    return {
      from: this.normalizeDate(altMatch[1]),
      to: this.normalizeDate(altMatch[2]),
    };
  }

  return { from: null, to: null };
}
```

**Step 2: Improve balance extraction regex**

```typescript
private extractBalancesFromText(text: string): { start: number | null; end: number | null } {
  let start: number | null = null;
  let end: number | null = null;

  // More flexible regex for "Входящий остаток" (with or without colon)
  const startMatch = text.match(/Входящий\s+остаток[:\s]*([\d\s]+[,.][\d]+)/i);
  if (startMatch) {
    start = this.normalizeNumberValue(startMatch[1]);
  }

  // More flexible regex for "Исходящий остаток"
  const endMatch = text.match(/Исходящий\s+остаток[:\s]*([\d\s]+[,.][\d]+)/i);
  if (endMatch) {
    end = this.normalizeNumberValue(endMatch[1]);
  }

  return { start, end };
}
```

**Step 3: Run tests to verify fixes**

```bash
cd backend && npm run test -- --testPathPattern="kaspi.parser.spec"
```

**Step 4: Commit**

```bash
git add backend/src/modules/parsing/parsers/kaspi.parser.ts
git commit -m "fix(kaspi): improve balance and period extraction patterns"
```

---

## Phase 4: Improve Bereke Parser (TDD)

### Task 4.1: Create golden test fixtures for Bereke

**Step 1: Create golden directory and copy test file**

```bash
mkdir -p backend/golden/bereke
cp docs/statements-examples/bereke-bank.pdf backend/golden/bereke/sample1.pdf
```

**Step 2: Run parser to see output**

**Step 3: Create expected JSON**

**Step 4: Commit**

```bash
git add backend/golden/bereke/
git commit -m "test(bereke): add golden test fixtures for Bereke parser"
```

---

### Task 4.2: Create unit tests for Bereke parser

**Files:**
- Create: `backend/@tests/unit/modules/parsing/parsers/bereke-new.parser.spec.ts`

Similar structure to Kaspi parser tests.

---

### Task 4.3: Fix Bereke parser based on test failures

**Files:**
- Modify: `backend/src/modules/parsing/parsers/bereke-new.parser.ts`

---

## Phase 5: Frontend - Show Transactions Properly

### Task 5.1: Update edit page to load transactions correctly

**Files:**
- Modify: `frontend/app/(main)/statements/[id]/edit/page.tsx:219-261`

**Problem:** If auto-commit is implemented, transactions will be in DB. But the page might load before processing completes.

**Step 1: Add retry logic for transactions**

```typescript
const loadData = async () => {
  try {
    setLoading(true);
    setOptionsLoading(true);
    
    const [statementRes, transactionsRes, categoriesRes, branchesRes, walletsRes] =
      await Promise.all([
        apiClient.get(`/statements/${statementId}`),
        apiClient.get(`/transactions?statement_id=${statementId}&limit=1000`),
        apiClient.get('/categories'),
        apiClient.get('/branches'),
        apiClient.get('/wallets'),
      ]);

    const statementData = statementRes.data?.data || statementRes.data;
    setStatement(statementData);

    let transactionsData = transactionsRes.data.data || transactionsRes.data || [];
    
    // If statement says it has transactions but we got none, retry once
    if (transactionsData.length === 0 && statementData?.totalTransactions > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const retryRes = await apiClient.get(`/transactions?statement_id=${statementId}&limit=1000`);
      transactionsData = retryRes.data.data || retryRes.data || [];
    }
    
    setTransactions(transactionsData);
    setCategories(categoriesRes.data?.data || categoriesRes.data || []);
    setBranches(branchesRes.data?.data || branchesRes.data || []);
    setWallets(walletsRes.data?.data || walletsRes.data || []);

    // ... rest of the function
  } catch (err: any) {
    setError(err.response?.data?.error?.message || t.errors.loadData.value);
  } finally {
    setLoading(false);
    setOptionsLoading(false);
  }
};
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/[id]/edit/page.tsx
git commit -m "fix(frontend): add retry logic for loading transactions"
```

---

## Phase 6: E2E Testing

### Task 6.1: Add E2E test for full upload flow

**Files:**
- Modify: `backend/@tests/e2e/statements.e2e-spec.ts`

**Step 1: Add comprehensive E2E test**

```typescript
describe('Statement Upload and Parse E2E', () => {
  it('should upload PDF, parse, and create transactions automatically', async () => {
    const testPdfPath = path.resolve(__dirname, '../../golden/kaspi/sample1.pdf');
    
    // Skip if test file doesn't exist
    if (!fs.existsSync(testPdfPath)) {
      console.log('Skipping: golden test file not found');
      return;
    }
    
    const response = await request(app.getHttpServer())
      .post('/statements/upload')
      .attach('files', testPdfPath)
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-workspace-id', testWorkspaceId);
    
    expect(response.status).toBe(201);
    expect(response.body.data[0].status).toBe('completed');
    expect(response.body.data[0].totalTransactions).toBeGreaterThan(0);
    
    // Verify transactions are actually in database
    const statementId = response.body.data[0].id;
    const txResponse = await request(app.getHttpServer())
      .get(`/transactions?statement_id=${statementId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-workspace-id', testWorkspaceId);
    
    expect(txResponse.status).toBe(200);
    expect(txResponse.body.data.length).toBe(response.body.data[0].totalTransactions);
  });
});
```

**Step 2: Commit**

```bash
git add backend/@tests/e2e/statements.e2e-spec.ts
git commit -m "test(e2e): add statement upload and auto-commit test"
```

---

## Summary Checklist

| Phase | Task | Files | Priority |
|-------|------|-------|----------|
| 1.1 | Auto-commit transactions | statement-processing.service.ts | Critical |
| 1.2 | Fix frontend refresh | StatementsListView.tsx | Critical |
| 2.1 | Cache PDF extraction | parser-factory.service.ts, parsers | High |
| 2.2 | Increase concurrency | statement-processing.service.ts | Medium |
| 2.3 | Disable AI by default | statement-processing.service.ts | Medium |
| 3.1 | Kaspi golden tests | golden/kaspi/* | High |
| 3.2 | Kaspi unit tests | kaspi.parser.spec.ts | High |
| 3.3 | Fix Kaspi parser | kaspi.parser.ts | High |
| 4.1 | Bereke golden tests | golden/bereke/* | High |
| 4.2 | Bereke unit tests | bereke-new.parser.spec.ts | High |
| 4.3 | Fix Bereke parser | bereke-new.parser.ts | High |
| 5.1 | Fix edit page loading | edit/page.tsx | Medium |
| 6.1 | E2E test | statements.e2e-spec.ts | Low |

## Verification Commands

```bash
# Run all parser tests
cd backend && npm run test -- --testPathPattern="parsing"

# Run specific parser tests
cd backend && npm run test -- --testPathPattern="kaspi.parser"
cd backend && npm run test -- --testPathPattern="bereke"

# Run golden tests (requires test PDFs in golden/)
GOLDEN_ENABLED=1 cd backend && npm run test -- --testPathPattern="parsing.golden"

# Run E2E tests
cd backend && npm run test:e2e -- --testPathPattern="statements"

# Type check
cd backend && npm run typecheck
cd frontend && npm run typecheck

# Lint
make lint

# Manual verification
make dev
# 1. Upload a PDF via UI
# 2. Verify modal closes immediately
# 3. Verify statement appears in list with "Completed" status (no "Scanning...")
# 4. Click "View" to go to edit page
# 5. Verify transactions are displayed in the table
```

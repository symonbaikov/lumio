import { IsNull, Not } from 'typeorm';
import { AppDataSource } from '../src/data-source';
import { Receipt } from '../src/entities/receipt.entity';

const HELP_TEXT = `
Usage: npm run cleanup:gmail-receipts -- [--dry-run]

Options:
  --dry-run   Count Gmail receipts without deleting
  --help      Show this help
`;

async function cleanupGmailReceipts() {
  const args = new Set(process.argv.slice(2));

  if (args.has('--help') || args.has('-h')) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const isDryRun = args.has('--dry-run') || args.has('--dryrun');

  try {
    console.log('Initializing data source...');
    await AppDataSource.initialize();

    const receiptRepo = AppDataSource.getRepository(Receipt);

    const total = await receiptRepo.count({
      where: { gmailMessageId: Not(IsNull()) },
    });

    if (isDryRun) {
      console.log(`Dry run: ${total} Gmail receipts would be deleted.`);
      return;
    }

    if (total === 0) {
      console.log('No Gmail receipts found to delete.');
      return;
    }

    const result = await receiptRepo.delete({
      gmailMessageId: Not(IsNull()),
    });

    const deleted = result.affected ?? 0;
    console.log(`Deleted ${deleted} Gmail receipts.`);
  } catch (error) {
    console.error('Failed to cleanup Gmail receipts:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

cleanupGmailReceipts();

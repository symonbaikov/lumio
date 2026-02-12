import {
  Integration,
  Receipt,
  ReceiptJobStatus,
  ReceiptProcessingJob,
  ReceiptStatus,
} from '../../../../src/entities';
import { GmailReceiptProcessor } from '../../../../src/modules/gmail/gmail-receipt-processor';

describe('GmailReceiptProcessor', () => {
  it('marks receipt as needs_review when parser cannot extract amount', async () => {
    const jobRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    const receiptRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((payload) => payload),
      save: jest
        .fn()
        .mockImplementation(async (payload) => payload.id ? payload : { ...payload, id: 'receipt-1' }),
    };

    const integrationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'integration-1',
        workspaceId: 'workspace-1',
        connectedByUserId: 'user-1',
      } as Integration),
    };

    const gmailService = {
      getMessage: jest.fn().mockResolvedValue({
        threadId: 'thread-1',
        labelIds: ['INBOX'],
        snippet: 'snippet',
        payload: {
          headers: [
            { name: 'Subject', value: 'Receipt' },
            { name: 'From', value: 'PayU <noreply@payu.com>' },
            { name: 'Date', value: 'Thu, 01 Jan 2026 10:00:00 +0000' },
          ],
          parts: [
            {
              filename: 'receipt.pdf',
              mimeType: 'application/pdf',
              body: { attachmentId: 'att-1', size: 1234 },
            },
          ],
        },
      }),
      downloadAttachment: jest.fn().mockResolvedValue('/tmp/receipt.pdf'),
    };

    const parserService = {
      parseReceipt: jest.fn().mockResolvedValue({
        vendor: 'PayU',
        confidence: 0.5,
      }),
    };

    const duplicateService = {
      findPotentialDuplicates: jest.fn().mockResolvedValue([]),
    };

    const categoryService = {
      suggestCategory: jest.fn().mockResolvedValue(null),
    };

    const auditService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new GmailReceiptProcessor(
      jobRepository as any,
      receiptRepository as any,
      integrationRepository as any,
      gmailService as any,
      parserService as any,
      duplicateService as any,
      categoryService as any,
      auditService as any,
    );

    const job: ReceiptProcessingJob = {
      id: 'job-1',
      userId: 'user-1',
      receiptId: null,
      status: ReceiptJobStatus.PROCESSING,
      progress: 0,
      payload: {
        integrationId: 'integration-1',
        gmailMessageId: 'gmail-message-1',
      },
      result: null,
      error: null,
      lockedAt: new Date(),
      lockedBy: 'worker-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await (processor as any).processJob(job);

    const savedReceipt = receiptRepository.save.mock.calls[1][0] as Receipt;
    expect(savedReceipt.status).toBe(ReceiptStatus.NEEDS_REVIEW);
    expect((savedReceipt.parsedData as any)?.validationIssues).toEqual(['missing_amount']);
    expect(duplicateService.findPotentialDuplicates).not.toHaveBeenCalled();
    expect(job.status).toBe(ReceiptJobStatus.COMPLETED);
  });
});

import { Injectable } from '@nestjs/common';
import { Receipt } from '../../../entities';
import { ReceiptDuplicateService } from '../../receipts/services/receipt-duplicate.service';

@Injectable()
export class GmailReceiptDuplicateService {
  constructor(private readonly receiptDuplicateService: ReceiptDuplicateService) {}

  findPotentialDuplicates(receipt: Receipt): Promise<Receipt[]> {
    return this.receiptDuplicateService.findPotentialDuplicates(receipt);
  }

  markAsDuplicate(receiptId: string, originalId: string, userId: string): Promise<void> {
    return this.receiptDuplicateService.markAsDuplicate(receiptId, originalId, userId);
  }

  unmarkDuplicate(receiptId: string, userId: string): Promise<void> {
    return this.receiptDuplicateService.unmarkDuplicate(receiptId, userId);
  }
}

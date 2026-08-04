import { Injectable } from '@nestjs/common';
import type { ParsedTransaction } from '../interfaces/parsed-statement.interface';

export type StatementQualityLevel = 'ready' | 'review' | 'blocked';

export type StatementQualityReasonCode =
  | 'no_valid_transactions'
  | 'balance_mismatch'
  | 'dropped_transactions'
  | 'bank_detection_conflict'
  | 'ai_reconciled';

export interface StatementQualityInput {
  validTransactions: ParsedTransaction[];
  droppedCount: number;
  bankDetectionConflict: boolean;
  validationWarnings: string[];
  aiReconciled: boolean;
}

export interface StatementQualityReport {
  level: StatementQualityLevel;
  reasonCodes: StatementQualityReasonCode[];
  validTransactionCount: number;
  droppedTransactionCount: number;
}

@Injectable()
export class StatementQualityGate {
  evaluate(input: StatementQualityInput): StatementQualityReport {
    const reasonCodes: StatementQualityReasonCode[] = [];

    if (input.validTransactions.length === 0) {
      reasonCodes.push('no_valid_transactions');
    }
    if (input.validationWarnings.some(warning => warning.startsWith('Balance mismatch:'))) {
      reasonCodes.push('balance_mismatch');
    }
    if (input.droppedCount > 0) {
      reasonCodes.push('dropped_transactions');
    }
    if (input.bankDetectionConflict) {
      reasonCodes.push('bank_detection_conflict');
    }
    if (input.aiReconciled) {
      reasonCodes.push('ai_reconciled');
    }

    return {
      level: reasonCodes.includes('no_valid_transactions')
        ? 'blocked'
        : reasonCodes.length > 0
          ? 'review'
          : 'ready',
      reasonCodes,
      validTransactionCount: input.validTransactions.length,
      droppedTransactionCount: input.droppedCount,
    };
  }
}

import type { BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement } from './parsed-statement.interface';

export interface IParser {
  canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean>;
  parse(filePath: string, cachedText?: string): Promise<ParsedStatement>;
  getVersion?(): string;
}

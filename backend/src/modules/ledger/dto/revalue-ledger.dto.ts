import { IsString, Matches } from 'class-validator';

export class RevalueLedgerDto {
  /** The day whose rates foreign-currency balances are revalued at. */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
}

import { IsString, Matches } from 'class-validator';

export class EnableLedgerDto {
  /** ISO code; every booked amount is converted into it, so it is fixed once entries exist. */
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'baseCurrency must be a 3-letter ISO code' })
  baseCurrency: string;
}

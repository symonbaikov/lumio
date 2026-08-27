import { IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export class SetJurisdictionDto {
  /** ISO-3166-1 alpha-2 country code, e.g. 'KZ'. */
  @IsString()
  @Length(2, 2)
  code: string;

  /**
   * Day the new rate set takes over, defaulting to today. Rates of a previous
   * jurisdiction are closed off the day before, so history stays resolvable.
   */
  @IsISO8601()
  @IsOptional()
  effectiveFrom?: string;
}

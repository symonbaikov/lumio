import { IsUUID } from 'class-validator';

export class LinkContributionDto {
  @IsUUID()
  transactionId: string;

  @IsUUID()
  accountId: string;
}

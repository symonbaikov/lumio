import { IsOptional, IsUUID } from 'class-validator';

export class DetectTransfersDto {
  /** Limit the run to the rows of one statement; omitted means the whole workspace. */
  @IsOptional()
  @IsUUID('4')
  statementId?: string;
}

export class LinkTransferDto {
  /** The other leg of the transfer. */
  @IsUUID('4')
  otherId: string;
}

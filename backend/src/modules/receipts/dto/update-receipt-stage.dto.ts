import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { StatementStage } from '../../../entities/statement.entity';

export class UpdateReceiptStageDto {
  @ApiProperty({
    description: 'Receipts to move; one id for a single receipt, many for a bulk move.',
    type: [String],
    example: ['1f0c6a3e-5b8e-4d0c-9f3e-2b7a1c9d4e10'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  receiptIds: string[];

  @ApiProperty({
    enum: [StatementStage.SUBMIT, StatementStage.APPROVE],
    example: StatementStage.APPROVE,
    description: 'Receipts take part in Submit and Approve only; Pay is refused per receipt.',
  })
  @IsEnum(StatementStage)
  stage: StatementStage;
}

export class ReceiptStageSkipDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    enum: [
      'RECEIPT_NOT_FOUND',
      'RECEIPT_EDIT_FORBIDDEN',
      'INVALID_STAGE_TRANSITION',
      'MISSING_RECEIPT_DATA',
    ],
  })
  code: string;
}

export class UpdateReceiptStageResultDto {
  @ApiProperty({
    type: [String],
    description: 'Receipts now in the requested stage, including ones already there.',
  })
  updated: string[];

  @ApiProperty({ type: [ReceiptStageSkipDto] })
  skipped: ReceiptStageSkipDto[];
}

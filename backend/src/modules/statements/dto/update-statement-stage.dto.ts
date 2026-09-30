import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { StatementStage } from '../../../entities/statement.entity';

export class UpdateStatementStageDto {
  @ApiProperty({
    description: 'Statements to move; one id for a single statement, many for a bulk move.',
    type: [String],
    example: ['8e8490aa-a171-4f77-80fe-6a5e4055a845'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  statementIds: string[];

  @ApiProperty({ enum: StatementStage, example: StatementStage.APPROVE })
  @IsEnum(StatementStage)
  stage: StatementStage;
}

export class StatementStageSkipDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    enum: [
      'STATEMENT_NOT_FOUND',
      'STATEMENT_EDIT_FORBIDDEN',
      'INVALID_STAGE_TRANSITION',
      'UNCATEGORIZED_TRANSACTIONS',
    ],
  })
  code: string;
}

export class UpdateStatementStageResultDto {
  @ApiProperty({
    type: [String],
    description: 'Statements now in the requested stage, including ones already there.',
  })
  updated: string[];

  @ApiProperty({ type: [StatementStageSkipDto] })
  skipped: StatementStageSkipDto[];
}

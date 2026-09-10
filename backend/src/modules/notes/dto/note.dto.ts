import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NoteEntityType } from '../../../entities/note.entity';

/** Больше десятка адресатов в одной заметке — уже рассылка, а не обсуждение. */
const MAX_MENTIONS = 10;

export class NoteTargetDto {
  @IsEnum(NoteEntityType)
  entityType: NoteEntityType;

  @IsUUID()
  entityId: string;
}

export class ListNoteCountsDto {
  @IsEnum(NoteEntityType)
  entityType: NoteEntityType;

  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  @Type(() => String)
  entityIds: string[];
}

export class CreateNoteDto extends NoteTargetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MENTIONS)
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];
}

export class SetNoteResolvedDto {
  @IsBoolean()
  resolved: boolean;
}

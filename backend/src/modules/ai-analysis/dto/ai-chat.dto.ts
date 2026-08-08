import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AiChatRole } from '../../../entities';

/** Transcripts are long-form text; this caps a single turn at a sane size. */
const MESSAGE_MAX_LENGTH = 20000;
const TITLE_MAX_LENGTH = 255;
const MODEL_ID_MAX_LENGTH = 128;

export class CreateAiChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MODEL_ID_MAX_LENGTH)
  modelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_MAX_LENGTH)
  firstQuestion: string;
}

export class AppendAiChatMessageDto {
  @IsEnum(AiChatRole)
  role: AiChatRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_MAX_LENGTH)
  content: string;
}

export class RenameAiChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;
}

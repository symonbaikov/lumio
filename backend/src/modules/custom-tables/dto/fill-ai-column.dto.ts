import { ArrayMaxSize, IsArray, IsString, IsUUID, MinLength } from 'class-validator';

export class FillAiColumnDto {
  @IsString()
  @MinLength(1)
  columnKey: string;

  /** Заполняем только выбранные строки: запрос к модели стоит денег. */
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  rowIds: string[];
}

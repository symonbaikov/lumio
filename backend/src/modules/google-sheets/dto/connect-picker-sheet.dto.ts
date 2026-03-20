import { IsOptional, IsString } from 'class-validator';

export class ConnectPickerSheetDto {
  @IsString()
  spreadsheetId: string;

  @IsString()
  @IsOptional()
  sheetName?: string;

  @IsString()
  @IsOptional()
  worksheetName?: string;
}

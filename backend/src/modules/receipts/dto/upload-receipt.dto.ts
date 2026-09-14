import { IsOptional, IsString } from 'class-validator';
import { CaptureLocationFieldsDto } from './capture-location-fields.dto';

export class UploadReceiptDto extends CaptureLocationFieldsDto {
  @IsOptional()
  @IsString()
  language?: string;
}

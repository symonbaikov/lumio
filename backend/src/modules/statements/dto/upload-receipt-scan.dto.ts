import { IsOptional, IsString } from 'class-validator';
import { CaptureLocationFieldsDto } from '../../receipts/dto/capture-location-fields.dto';

export class UploadReceiptScanDto extends CaptureLocationFieldsDto {
  @IsOptional()
  @IsString()
  language?: string;
}

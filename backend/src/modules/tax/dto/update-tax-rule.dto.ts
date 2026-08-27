import { PartialType } from '@nestjs/swagger';
import { CreateTaxRuleDto } from './create-tax-rule.dto';

export class UpdateTaxRuleDto extends PartialType(CreateTaxRuleDto) {}

import { IsUUID } from 'class-validator';

export class AssignSubscriptionOwnerDto {
  @IsUUID()
  ownerId: string;
}

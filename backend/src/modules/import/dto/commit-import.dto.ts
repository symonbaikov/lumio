import {
  IsObject,
  IsOptional,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import type { ConflictResolutionMap } from '../services/import-session.service';

const RESOLUTIONS = ['skip', 'force_import', 'mark_duplicate'] as const;

/**
 * `ConflictResolutionMap` is keyed by transaction index, so there is no fixed
 * set of properties for a plain DTO to describe. This checks the shape the map
 * actually has: numeric keys, and values drawn from the three known actions.
 */
function IsConflictResolutionMap(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isConflictResolutionMap',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return false;
          }
          return Object.entries(value).every(
            ([key, action]) =>
              Number.isInteger(Number(key)) &&
              typeof action === 'string' &&
              (RESOLUTIONS as readonly string[]).includes(action),
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must map transaction indexes to one of: ${RESOLUTIONS.join(', ')}`;
        },
      },
    });
  };
}

export class CommitImportDto {
  @IsOptional()
  @IsObject()
  @IsConflictResolutionMap()
  resolutions?: ConflictResolutionMap;
}

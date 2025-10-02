import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Custom validator for features object
 * Ensures all values in the features object are boolean
 */
@ValidatorConstraint({ name: 'isFeaturesObject', async: false })
export class IsFeaturesObjectConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) {
      return true; // Allow null/undefined, will be handled by @IsOptional
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return false; // Must be an object, not array
    }

    // Check that all values are boolean (after transformation)
    for (const [key, val] of Object.entries(value)) {
      if (typeof val !== 'boolean') {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'features must be an object with boolean values only';
  }
}

/**
 * Custom validator for tags structure
 * Ensures tags object has primary (non-empty) and secondary (can be empty) arrays
 */
@ValidatorConstraint({ name: 'isTagsStructure', async: false })
export class IsTagsStructureConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) {
      return false; // Tags are required
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return false; // Must be an object
    }

    // Must have primary property
    if (!value.hasOwnProperty('primary') || !Array.isArray(value.primary)) {
      return false;
    }

    // Must have secondary property
    if (!value.hasOwnProperty('secondary') || !Array.isArray(value.secondary)) {
      return false;
    }

    // Primary must be non-empty array of strings
    if (value.primary.length === 0) {
      return false;
    }

    // All primary elements must be strings
    if (!value.primary.every((item: any) => typeof item === 'string')) {
      return false;
    }

    // All secondary elements must be strings (can be empty array)
    if (!value.secondary.every((item: any) => typeof item === 'string')) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'tags must be an object with primary (non-empty string array) and secondary (string array) properties';
  }
}

/**
 * Custom validator for update tags structure (more flexible)
 * Allows partial updates of tags object
 */
@ValidatorConstraint({ name: 'isUpdateTagsStructure', async: false })
export class IsUpdateTagsStructureConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) {
      return true; // Allow null/undefined for optional updates
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return false; // Must be an object
    }

    // If primary is provided, it must be array of strings
    if (value.hasOwnProperty('primary')) {
      if (!Array.isArray(value.primary)) {
        return false;
      }
      if (!value.primary.every((item: any) => typeof item === 'string')) {
        return false;
      }
    }

    // If secondary is provided, it must be array of strings
    if (value.hasOwnProperty('secondary')) {
      if (!Array.isArray(value.secondary)) {
        return false;
      }
      if (!value.secondary.every((item: any) => typeof item === 'string')) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'tags must be an object with optional primary and secondary string arrays';
  }
}

/**
 * Custom validator for search keywords array
 * Ensures each keyword is a string with max length 256
 */
@ValidatorConstraint({ name: 'isValidSearchKeywords', async: false })
export class IsValidSearchKeywordsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (!Array.isArray(value)) {
      return false;
    }

    if (value.length === 0) {
      return false; // Must be non-empty
    }

    // Each element must be string with max length 256
    for (const keyword of value) {
      if (typeof keyword !== 'string') {
        return false;
      }
      if (keyword.length > 256) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'searchKeywords must be a non-empty array of strings with max 256 characters each';
  }
}

/**
 * Custom validator for numeric ranges with business logic
 * Provides more detailed validation for rating, popularity, reviewCount
 */
@ValidatorConstraint({ name: 'isValidBusinessRange', async: false })
export class IsValidBusinessRangeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const [fieldName] = args.constraints;

    if (typeof value !== 'number') {
      return false;
    }

    switch (fieldName) {
      case 'popularity':
        return value >= 0 && value <= 1000000 && Number.isInteger(value);
      case 'rating':
        return value >= 0 && value <= 5;
      case 'reviewCount':
        return value >= 0 && value <= 1000000 && Number.isInteger(value);
      default:
        return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [fieldName] = args.constraints;

    switch (fieldName) {
      case 'popularity':
        return 'popularity must be an integer between 0 and 1,000,000';
      case 'rating':
        return 'rating must be a number between 0 and 5';
      case 'reviewCount':
        return 'reviewCount must be an integer between 0 and 1,000,000';
      default:
        return 'invalid business range validation';
    }
  }
}

// Decorator functions for easy use in DTOs

/**
 * Validates that the value is a proper features object with boolean values
 */
export function IsFeaturesObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFeaturesObjectConstraint,
    });
  };
}

/**
 * Validates that the value is a proper tags structure for create operations
 */
export function IsTagsStructure(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTagsStructureConstraint,
    });
  };
}

/**
 * Validates that the value is a proper tags structure for update operations
 */
export function IsUpdateTagsStructure(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUpdateTagsStructureConstraint,
    });
  };
}

/**
 * Validates search keywords array with business rules
 */
export function IsValidSearchKeywords(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSearchKeywordsConstraint,
    });
  };
}

/**
 * Validates business numeric ranges (popularity, rating, reviewCount)
 */
export function IsValidBusinessRange(
  fieldName: 'popularity' | 'rating' | 'reviewCount',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [fieldName],
      validator: IsValidBusinessRangeConstraint,
    });
  };
}

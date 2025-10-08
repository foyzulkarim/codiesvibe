import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';


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

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidatePhoneNumber, ValidateUrl } from '../utils/validation.utils';

/**
 * Validates Brazilian phone number
 */
@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments) {
    return ValidatePhoneNumber.isValid(phone);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Phone number must be a valid Brazilian phone number (e.g., 5511999999999)';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

/**
 * Validates webhook URL
 */
@ValidatorConstraint({ name: 'isWebhookUrl', async: false })
export class IsWebhookUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    return ValidateUrl.isValidWebhook(url);
  }

  defaultMessage(args: ValidationArguments) {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') {
      return 'Webhook URL must be a valid HTTPS URL';
    }
    return 'Webhook URL must be a valid URL';
  }
}

export function IsWebhookUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsWebhookUrlConstraint,
    });
  };
}

/**
 * Validates that value is not a SQL injection attempt
 */
@ValidatorConstraint({ name: 'isSafe', async: false })
export class IsSafeConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true;

    // Check for SQL injection patterns
    const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi;
    if (sqlPatterns.test(value)) return false;

    // Check for XSS patterns
    const xssPatterns = /<script|javascript:|onerror=|onload=/gi;
    if (xssPatterns.test(value)) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Input contains potentially malicious content';
  }
}

export function IsSafe(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeConstraint,
    });
  };
}

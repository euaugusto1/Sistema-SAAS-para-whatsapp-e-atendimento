import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SanitizeHtmlPipe {
  /**
   * Sanitizes HTML to prevent XSS attacks
   */
  static sanitize(value: string): string {
    if (!value) return value;

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

export class ValidatePhoneNumber {
  /**
   * Validates Brazilian phone number format
   */
  static isValid(phone: string): boolean {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Brazilian phone: 11 digits (with 9) or 10 digits (without 9)
    // Format: +55 11 99999-9999 or +55 11 9999-9999
    return /^55\d{10,11}$/.test(cleaned) || /^\d{10,11}$/.test(cleaned);
  }

  /**
   * Formats phone number to Evolution API format
   */
  static format(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Add country code if missing
    if (!cleaned.startsWith('55')) {
      return `55${cleaned}`;
    }

    return cleaned;
  }
}

export class ValidateUrl {
  /**
   * Validates URL format
   */
  static isValid(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates webhook URL (must be HTTPS in production)
   */
  static isValidWebhook(url: string): boolean {
    if (!this.isValid(url)) return false;

    const parsedUrl = new URL(url);

    // In production, require HTTPS
    if (process.env.NODE_ENV === 'production') {
      return parsedUrl.protocol === 'https:';
    }

    return true;
  }
}

export class ValidateEmail {
  /**
   * Validates email format
   */
  static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Removes SQL injection attempts
   */
  static sanitizeSql(value: string): string {
    if (!value) return value;

    // Remove common SQL injection patterns
    return value
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
      .replace(/[;'"\\]/g, '');
  }

  /**
   * Sanitizes filename to prevent path traversal
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return filename;

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  /**
   * Sanitizes all string fields in an object
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = SanitizeHtmlPipe.sanitize(sanitized[key]);
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key]);
      }
    }

    return sanitized;
  }
}

import { SetMetadata } from '@nestjs/common';

export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * Apply custom rate limiting to specific routes
 * @param options - Rate limit configuration
 * @example
 * @RateLimit({ windowMs: 60000, maxRequests: 10 })
 * async sendMessage() { ... }
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Strict rate limiting for sensitive operations
 * 5 requests per minute
 */
export const StrictRateLimit = () =>
  RateLimit({ windowMs: 60000, maxRequests: 5 });

/**
 * Moderate rate limiting for normal operations
 * 30 requests per minute
 */
export const ModerateRateLimit = () =>
  RateLimit({ windowMs: 60000, maxRequests: 30 });

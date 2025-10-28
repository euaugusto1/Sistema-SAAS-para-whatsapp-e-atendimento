import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public (bypasses authentication)
 * Use only for login, register, webhooks, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

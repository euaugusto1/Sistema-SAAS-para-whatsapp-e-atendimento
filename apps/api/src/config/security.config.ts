import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Strict rate limiting for sensitive endpoints
  strictRateLimitWindowMs: parseInt(process.env.STRICT_RATE_LIMIT_WINDOW_MS || '60000'),
  strictRateLimitMaxRequests: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS || '5'),
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
  
  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || 'change-me-in-production-32-chars',
  
  // Security Headers
  hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'), // 1 year
  
  // Input validation
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],
}));

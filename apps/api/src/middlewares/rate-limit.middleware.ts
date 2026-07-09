import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Global API Rate Limiter
 * Applies to all API requests: 100 requests per 15-minute window per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req: Request): string => {
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }
});

/**
 * Export Endpoint Rate Limiter
 * More restrictive for resource-heavy export operations:
 * 5 requests per 15-minute window per IP.
 */
export const exportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'EXPORT_RATE_LIMIT_EXCEEDED',
    message: 'Export rate limit exceeded. You can generate a maximum of 5 export files per 15 minutes.',
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req: Request): string => {
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }
});

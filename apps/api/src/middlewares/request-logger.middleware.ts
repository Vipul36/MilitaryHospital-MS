import morgan from 'morgan';

/**
 * HTTP Request Logger Middleware
 *
 * Uses Morgan for structured request logging:
 * - Development: colorized `:method :url :status :response-time ms`
 * - Production: Apache combined format for log aggregation
 *
 * Health-check requests are excluded to reduce log noise.
 */
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  {
    skip: (req) => req.url === '/api/v1/health',
  }
);

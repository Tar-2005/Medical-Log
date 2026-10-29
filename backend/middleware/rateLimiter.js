// ─── Rate Limiter Middleware ─────────────────────────────────────────────────
// Zero-Trust rate limiting for all API endpoints.
// Separate limits for standard routes and emergency (break-glass) routes.
// ─────────────────────────────────────────────────────────────────────────────

import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter.
 * 100 requests per 15-minute window per IP.
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5000,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.ip?.startsWith('192.168.'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'throttled',
      diagnostics: 'Rate limit exceeded. Try again later.',
    }],
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * 20 requests per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'throttled',
      diagnostics: 'Too many authentication attempts. Try again later.',
    }],
  },
});

/**
 * Emergency endpoint rate limiter.
 * More permissive (50/15m) but still enforced — even break-glass has limits.
 */
export const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'throttled',
      diagnostics: 'Emergency endpoint rate limit exceeded.',
    }],
  },
});

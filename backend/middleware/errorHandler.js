// ─── Global Error Handler Middleware ────────────────────────────────────────
// Catches all unhandled errors from Express routes and returns
// standardized FHIR-style OperationOutcome error responses.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom application error with HTTP status code support.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express error-handling middleware (must have 4 parameters).
 * Returns errors in FHIR OperationOutcome format.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the full error in non-production environments
  if (!isProduction) {
    console.error(`\n❌ [${req.method}] ${req.originalUrl}`);
    console.error(err.stack || err.message);
  }

  // FHIR OperationOutcome format
  const response = {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: statusCode >= 500 ? 'fatal' : 'error',
        code: err.code || 'exception',
        diagnostics: isProduction
          ? 'An internal error occurred. Contact support.'
          : err.message,
        details: {
          text: err.code || 'INTERNAL_ERROR',
        },
      },
    ],
  };

  // Add stack trace in development
  if (!isProduction && err.stack) {
    response._debug = {
      stack: err.stack.split('\n').slice(0, 5),
    };
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unknown routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code: 'not-found',
        diagnostics: `Route ${req.method} ${req.originalUrl} not found`,
      },
    ],
  });
}

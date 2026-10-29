// ─── QR Handshake Authentication Middleware ─────────────────────────────────
// Validates the patient-issued JWT from the QR code scan.
// Enforces:
//   1. Token presence (Bearer scheme)
//   2. Token validity & expiration
//   3. Issuer verification
//   4. Granular scope attachment to request context
//
// The decoded token is attached to `req.auth` for downstream controllers.
// ─────────────────────────────────────────────────────────────────────────────

import { verifyToken, checkScope } from '../lib/jwtUtils.js';
import { generateIntegrityHash } from '../lib/cryptoUtils.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Primary authentication middleware.
 * Extracts Bearer token, verifies it, and attaches decoded auth context.
 */
export function qrAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Provide a valid QR token in the Authorization header (Bearer <token>)',
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Empty token',
      message: 'The Bearer token is empty.',
    });
  }

  const result = verifyToken(token);

  if (!result.valid) {
    // Log the failed auth attempt
    logAuthAttempt(req, null, false, result.error);

    return res.status(401).json({
      error: 'Token validation failed',
      message: result.error,
    });
  }

  // Attach decoded auth context to the request
  req.auth = {
    patientId: result.decoded.sub,
    providerId: result.decoded.providerId,
    scopes: result.decoded.scopes || [],
    tokenIssuedAt: new Date(result.decoded.iat * 1000),
    tokenExpiresAt: new Date(result.decoded.exp * 1000),
    raw: result.decoded,
  };

  // Log successful auth
  logAuthAttempt(req, req.auth.patientId, true, 'QR handshake successful');

  next();
}

/**
 * Scope enforcement middleware factory.
 * Returns middleware that checks if the token grants access to a specific category.
 *
 * @param {string} category — The required scope category (e.g., 'cardiology')
 * @returns {function} Express middleware
 *
 * @example
 *   router.get('/cardiology', requireScope('cardiology'), handler);
 */
export function requireScope(category) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No auth context found. QR middleware must run first.',
      });
    }

    const result = checkScope(req.auth.scopes, category);

    if (!result.allowed) {
      // Log scope denial
      logAuthAttempt(req, req.auth.patientId, false, result.reason);

      return res.status(403).json({
        error: 'Scope denied',
        category,
        message: result.reason,
      });
    }

    next();
  };
}

/**
 * Fire-and-forget audit log for auth attempts.
 * @private
 */
async function logAuthAttempt(req, patientId, granted, reason) {
  try {
    const auditData = {
      accessor_id: req.auth?.providerId || req.ip || 'unknown',
      accessor_role: 'provider',
      action: granted ? 'QR_AUTH' : 'SCOPE_DENIED',
      resource_type: 'Patient',
      resource_id: patientId || null,
      patient_id: patientId || null,
      scope_requested: req.auth?.scopes?.join(', ') || null,
      scope_granted: granted,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
      is_emergency: false,
    };

    auditData.integrity_hash = generateIntegrityHash(auditData);

    await supabaseAdmin.from('audit_log').insert(auditData);
  } catch (err) {
    // Audit logging failure should not block the request
    console.error('[AuditLog] Failed to write auth attempt:', err.message);
  }
}

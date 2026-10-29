// ─── JWT Utility Module ─────────────────────────────────────────────────────
// Handles JWT creation, verification, and scope parsing for the
// QR Handshake authentication flow.
//
// Token Structure:
//   {
//     sub:       <patientId>,
//     iss:       'health-memory-patient-app',
//     scopes:    ['read:cardiology', 'read:labs', 'deny:mental_health'],
//     providerId: <providerId>,          — Authorized provider
//     iat:       <issuedAt>,
//     exp:       <expiresAt>             — Time-sensitive (default 15m)
//   }
// ─────────────────────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/environment.js';

const ISSUER = 'health-memory-patient-app';
const revokedTokens = new Set();

/**
 * Revokes a token by its jti or full token string.
 * @param {string} identifier
 */
export function revokeToken(identifier) {
  if (identifier) {
    revokedTokens.add(identifier);
  }
}

/**
 * Checks if a token or jti is revoked.
 * @param {string} identifier
 * @returns {boolean}
 */
export function isTokenRevoked(identifier) {
  return revokedTokens.has(identifier);
}

/**
 * Signs a new JWT token for patient→provider handshake.
 *
 * @param {object} payload
 * @param {string} payload.patientId   — UUID of the patient granting access
 * @param {string} payload.providerId  — UUID of the authorized provider
 * @param {string[]} payload.scopes    — Granular access scopes
 * @param {string} [payload.jti]       — Unique nonce / token ID
 * @param {string} [expiresIn]         — Token TTL (default from env)
 * @returns {string} Signed JWT string
 */
export function signToken({ patientId, providerId, scopes, jti }, expiresIn) {
  const nonce = jti || uuidv4();
  return jwt.sign(
    {
      sub: patientId,
      providerId: providerId || 'demo-provider-001',
      scopes: scopes || [],
      iss: ISSUER,
      jti: nonce,
    },
    env.JWT_SECRET,
    {
      expiresIn: expiresIn || env.JWT_EXPIRY,
      algorithm: 'HS256',
    }
  );
}

/**
 * Verifies and decodes a JWT token.
 *
 * @param {string} token — The JWT string to verify
 * @returns {{ valid: true, decoded: object } | { valid: false, error: string }}
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      algorithms: ['HS256'],
    });

    if (revokedTokens.has(token) || (decoded.jti && revokedTokens.has(decoded.jti))) {
      return { valid: false, error: 'Token has been revoked by patient or administrator.' };
    }

    return { valid: true, decoded };
  } catch (err) {
    let error = 'Token verification failed';

    if (err.name === 'TokenExpiredError') {
      error = 'Token has expired. Patient must generate a new QR code.';
    } else if (err.name === 'JsonWebTokenError') {
      error = `Invalid token: ${err.message}`;
    } else if (err.name === 'NotBeforeError') {
      error = 'Token is not yet active.';
    }

    return { valid: false, error };
  }
}

/**
 * Parses the scopes array from a decoded token and determines
 * whether a specific resource category is accessible.
 *
 * @param {string[]} scopes    — Array of scope strings from the token
 * @param {string} category    — The category to check (e.g., 'cardiology')
 * @returns {{ allowed: boolean, reason: string }}
 *
 * @example
 *   const result = checkScope(['read:cardiology', 'deny:mental_health'], 'cardiology');
 *   // { allowed: true, reason: 'Scope read:cardiology grants access' }
 *
 *   const denied = checkScope(['read:cardiology', 'deny:mental_health'], 'mental_health');
 *   // { allowed: false, reason: 'Scope deny:mental_health explicitly blocks access' }
 */
export function checkScope(scopes, category) {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');

  // Check for explicit denial first (deny takes precedence)
  const denyScope = scopes.find(
    (s) => s.toLowerCase() === `deny:${normalizedCategory}`
  );
  if (denyScope) {
    return {
      allowed: false,
      reason: `Scope ${denyScope} explicitly blocks access`,
    };
  }

  // Check for explicit grant
  const readScope = scopes.find(
    (s) => s.toLowerCase() === `read:${normalizedCategory}`
  );
  if (readScope) {
    return {
      allowed: true,
      reason: `Scope ${readScope} grants access`,
    };
  }

  // Check for wildcard
  const wildcardScope = scopes.find((s) => s.toLowerCase() === 'read:*');
  if (wildcardScope) {
    return {
      allowed: true,
      reason: 'Wildcard scope read:* grants access to all categories',
    };
  }

  // Default: deny (Zero-Trust)
  return {
    allowed: false,
    reason: `No scope grants access to category '${category}'. Zero-Trust default: deny.`,
  };
}

/**
 * Decodes a JWT WITHOUT verification (for debugging / logging only).
 * ⚠ Never use this for authorization decisions.
 *
 * @param {string} token
 * @returns {object|null} Decoded payload or null
 */
export function decodeTokenUnsafe(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch {
    return null;
  }
}

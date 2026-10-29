import { Router } from 'express';
import { signToken, verifyToken, revokeToken } from '../lib/jwtUtils.js';

const router = Router();

// In-memory registry for 6-digit short handshake codes (valid for 15 minutes)
const handshakeStore = new Map();

// Periodically purge expired codes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of handshakeStore.entries()) {
    if (val.expiresAt < now) {
      handshakeStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * POST /api/auth/generate-handshake
 * Generates a dynamic, signed, time-limited JWT for doctor QR access.
 * Maps granular patient consent toggles to verifiable JWT scopes.
 * Also returns an ultra-compact 6-digit PIN and short QR payload for instantaneous camera scanning.
 */
router.post('/generate-handshake', (req, res) => {
  try {
    const { permissions, patientId, providerId } = req.body;
    
    // Fallback patient ID if anonymous mobile session
    const activePatientId = patientId || '1da89764-5a66-4b8e-8a0c-ff4fb0e185dc';
    const activeProviderId = providerId || 'demo-provider-001';

    const scopes = [];
    if (permissions && typeof permissions === 'object') {
      for (const [domain, isGranted] of Object.entries(permissions)) {
        const normalized = domain.toLowerCase().replace(/\s+/g, '_');
        if (isGranted) {
          scopes.push(`read:${normalized}`);
        } else {
          scopes.push(`deny:${normalized}`);
        }
      }
    }

    // Default minimum scope if no toggles were set
    if (scopes.length === 0) {
      scopes.push('read:vitals', 'read:laboratory');
    }

    const token = signToken({
      patientId: activePatientId,
      providerId: activeProviderId,
      scopes,
    }, '15m');

    // Generate a 6-digit numeric handshake PIN
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const qrPayload = `SHW-${code}`;

    const entry = {
      token,
      code,
      qrPayload,
      patientId: activePatientId,
      providerId: activeProviderId,
      scopes,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    handshakeStore.set(code, entry);
    handshakeStore.set(qrPayload, entry);

    return res.json({
      success: true,
      token,
      code,
      qrPayload,
      scopes,
      expiresIn: '15m',
      issuedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Auth] Handshake generation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate consent handshake token' });
  }
});

/**
 * POST /api/auth/resolve-code
 * Resolves a 6-digit PIN or SHW-XXXXXX payload to the full signed JWT token.
 */
router.post('/resolve-code', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'PIN or code is required' });
    }

    const clean = code.toString().trim().toUpperCase().replace(/\s+/g, '');
    const entry = handshakeStore.get(clean) || handshakeStore.get(clean.replace(/^SHW-/, ''));

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session code' });
    }

    if (entry.expiresAt < Date.now()) {
      handshakeStore.delete(clean);
      return res.status(410).json({ success: false, error: 'Session code has expired' });
    }

    return res.json({
      success: true,
      token: entry.token,
      patientId: entry.patientId,
      scopes: entry.scopes,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to resolve session code' });
  }
});

/**
 * POST /api/auth/verify-token
 * Verifies token validity, issuer, expiration, and revocation status.
 */
router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const result = verifyToken(token);
    if (!result.valid) {
      return res.status(401).json({ success: false, error: result.error });
    }

    return res.json({ success: true, decoded: result.decoded });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * POST /api/auth/revoke-token
 * Allows a patient or doctor to immediately revoke an issued access token.
 */
router.post('/revoke-token', (req, res) => {
  try {
    const { token, jti } = req.body;
    if (!token && !jti) {
      return res.status(400).json({ success: false, error: 'Token or jti required for revocation' });
    }

    revokeToken(jti || token);
    return res.json({ success: true, message: 'Token successfully revoked' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Revocation failed' });
  }
});

export default router;

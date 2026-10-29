import { jest } from '@jest/globals';

const { signToken, verifyToken, checkScope, revokeToken } = await import('../lib/jwtUtils.js');

describe('Authentication & QR Handshake (JWT with Nonce & Granular Scopes)', () => {
  it('should sign and verify a token with patientId, scopes, and jti nonce', () => {
    const patientId = '1da89764-5a66-4b8e-8a0c-ff4fb0e185dc';
    const scopes = ['read:cardiology', 'read:laboratory', 'deny:mental_health'];

    const token = signToken({ patientId, providerId: 'demo-provider-001', scopes });
    expect(token).toBeDefined();

    const verification = verifyToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.decoded.sub).toBe(patientId);
    expect(verification.decoded.scopes).toEqual(scopes);
    expect(verification.decoded.jti).toBeDefined();
  });

  it('should correctly evaluate domain scopes and explicit denials', () => {
    const scopes = ['read:cardiology', 'deny:mental_health'];

    const cardiologyCheck = checkScope(scopes, 'cardiology');
    expect(cardiologyCheck.allowed).toBe(true);

    const mentalHealthCheck = checkScope(scopes, 'mental_health');
    expect(mentalHealthCheck.allowed).toBe(false);

    // Default deny for unmentioned category
    const imagingCheck = checkScope(scopes, 'imaging');
    expect(imagingCheck.allowed).toBe(false);
  });

  it('should reject a revoked token', () => {
    const token = signToken({
      patientId: 'patient-test-01',
      providerId: 'provider-01',
      scopes: ['read:vitals'],
    });

    const verificationBefore = verifyToken(token);
    expect(verificationBefore.valid).toBe(true);

    // Revoke token
    revokeToken(token);

    const verificationAfter = verifyToken(token);
    expect(verificationAfter.valid).toBe(false);
    expect(verificationAfter.error).toContain('revoked');
  });
});

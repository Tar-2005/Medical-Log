
import { signToken } from '../lib/jwtUtils.js';
import { env } from '../config/environment.js';

// This script generates a test JWT for API testing.
// It uses a placeholder patient and provider ID.

function generateTestToken() {
  const payload = {
    patientId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Placeholder UUID
    providerId: 'provider-test-001',
    scopes: ['read:*', 'write:*'], // Broad scopes for testing
  };
  return signToken(payload, '1h'); // Token valid for 1 hour
}

console.log(generateTestToken());

// ─── AES-256-GCM Cryptographic Utility ──────────────────────────────────────
// All Protected Health Information (PHI) MUST be encrypted before database
// storage and decrypted only in-memory during authorized access.
//
// Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
// Key:       32-byte key derived from env AES_ENCRYPTION_KEY
// IV:        Random 16-byte initialization vector per encryption operation
// Tag:       128-bit authentication tag for tamper detection
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto';
import { env } from '../config/environment.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;         // 128 bits
const AUTH_TAG_LENGTH = 16;   // 128 bits
const ENCODING = 'hex';

/**
 * Derives the 32-byte encryption key from the hex environment variable.
 * @returns {Buffer} 32-byte key buffer
 */
function getKey() {
  return Buffer.from(env.AES_ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext — The raw PHI data to encrypt
 * @returns {{ ciphertext: string, iv: string, tag: string }}
 *   All values are hex-encoded strings safe for database storage.
 *
 * @example
 *   const { ciphertext, iv, tag } = encrypt('John Doe');
 *   // Store ciphertext, iv, tag in respective DB columns
 */
export function encrypt(plaintext) {
  if (!plaintext && plaintext !== '') {
    throw new Error('encrypt(): plaintext is required');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(String(plaintext), 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString(ENCODING),
    tag: tag.toString(ENCODING),
  };
}

/**
 * Decrypts an AES-256-GCM ciphertext back to plaintext.
 *
 * @param {string} ciphertext — Hex-encoded ciphertext
 * @param {string} iv         — Hex-encoded initialization vector
 * @param {string} tag        — Hex-encoded authentication tag
 * @returns {string} The decrypted plaintext
 *
 * @throws {Error} If the authentication tag is invalid (tampered data)
 *
 * @example
 *   const name = decrypt(row.encrypted_name, row.encryption_iv, row.encryption_tag);
 */
export function decrypt(ciphertext, iv, tag) {
  if (!ciphertext || !iv || !tag) {
    throw new Error('decrypt(): ciphertext, iv, and tag are all required');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, ENCODING),
    { authTagLength: AUTH_TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(tag, ENCODING));

  let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts a JavaScript object (serialized to JSON) for storage.
 *
 * @param {object} data — The structured data to encrypt (e.g., FHIR resource)
 * @returns {{ ciphertext: string, iv: string, tag: string }}
 */
export function encryptObject(data) {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypts a ciphertext back to a parsed JavaScript object.
 *
 * @param {string} ciphertext
 * @param {string} iv
 * @param {string} tag
 * @returns {object} Parsed JSON object
 */
export function decryptObject(ciphertext, iv, tag) {
  const json = decrypt(ciphertext, iv, tag);
  return JSON.parse(json);
}

/**
 * Generates a SHA-256 integrity hash for audit log tamper detection.
 *
 * @param {object} data — The audit record fields to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function generateIntegrityHash(data) {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

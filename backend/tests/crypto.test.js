import { jest } from '@jest/globals';

// Set up mock environment variables before importing cryptoUtils
process.env.AES_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Import after env setup
const { encrypt, decrypt, encryptObject, decryptObject, generateIntegrityHash } = await import('../lib/cryptoUtils.js');

describe('Cryptographic Utilities (AES-256-GCM)', () => {
  it('should encrypt and decrypt a string successfully', () => {
    const plaintext = 'Jane Doe';
    const encrypted = encrypt(plaintext);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = decrypt(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw an error if data is tampered with', () => {
    const plaintext = 'Sensitive Medical Info';
    const encrypted = encrypt(plaintext);

    // Tamper with ciphertext
    const tamperedCiphertext = encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 1) + '0';

    expect(() => {
      decrypt(tamperedCiphertext, encrypted.iv, encrypted.tag);
    }).toThrow(); // Should throw authentication failed error
  });

  it('should encrypt and decrypt objects successfully', () => {
    const payload = { test: 'data', number: 42 };
    const encrypted = encryptObject(payload);

    const decrypted = decryptObject(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    expect(decrypted).toEqual(payload);
  });

  it('should generate consistent integrity hashes', () => {
    const data1 = { a: 1, b: 2 };
    const data2 = { b: 2, a: 1 }; // Object key order is different

    const hash1 = generateIntegrityHash(data1);
    const hash2 = generateIntegrityHash(data2);

    expect(hash1).toBe(hash2); // Should be consistent regardless of key order
  });
});

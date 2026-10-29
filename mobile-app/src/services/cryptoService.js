import CryptoJS from 'crypto-js';

/**
 * Derives a 256-bit Key from the master password using SHA-256.
 */
function deriveKey(password) {
  const keyHex = CryptoJS.SHA256(password + '_key').toString(CryptoJS.enc.Hex);
  return CryptoJS.enc.Hex.parse(keyHex);
}

/**
 * Generates an unpredictable 128-bit IV (16 bytes hex).
 * Combines timestamp, microtime, and random entropy to safely operate
 * in React Native environments lacking native crypto.getRandomValues.
 */
function generateRandomIV() {
  const entropy = `${Date.now()}-${Math.random()}-${Math.random()}-${Math.random()}`;
  return CryptoJS.SHA256(entropy).toString(CryptoJS.enc.Hex).substring(0, 32);
}

/**
 * Legacy deterministic IV calculation (maintained for backward compatibility).
 */
function getLegacyIV(password) {
  const ivHex = CryptoJS.SHA256(password + '_iv').toString(CryptoJS.enc.Hex).substring(0, 32);
  return CryptoJS.enc.Hex.parse(ivHex);
}

/**
 * Encrypts data using AES-256-CBC with unpredictable random IV and HMAC-SHA256 integrity tag.
 * Output format: `v2:<ivHex>:<hmacHex>:<ciphertext>`
 */
export function encryptData(data, password) {
  try {
    if (!password) {
      console.warn("Encryption warning: No password available");
      return null;
    }

    const passStr = typeof password === 'string' ? password : String(password);
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    const key = deriveKey(passStr);

    const ivHex = generateRandomIV();
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    // AES-256-CBC encryption
    const encrypted = CryptoJS.AES.encrypt(jsonString, key, { iv: iv }).toString();

    // Authenticated encryption: compute HMAC-SHA256 over IV + ciphertext
    const hmac = CryptoJS.HmacSHA256(`${ivHex}:${encrypted}`, key).toString();

    // Versioned, authenticated ciphertext format
    return `v2:${ivHex}:${hmac}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed detail:", error?.message || error);
    return null;
  }
}

/**
 * Decrypts data, verifying HMAC authentication tag to protect against tampering.
 * Seamlessly supports both v2 authenticated ciphertexts and legacy unauthenticated ciphertexts.
 */
export function decryptData(encryptedString, password) {
  try {
    if (!encryptedString || !password) return null;

    const passStr = typeof password === 'string' ? password : String(password);
    const key = deriveKey(passStr);

    let iv;
    let ciphertext;

    if (encryptedString.startsWith('v2:')) {
      const parts = encryptedString.split(':');
      if (parts.length !== 4) {
        console.error("Invalid v2 ciphertext format");
        return null;
      }

      const [, ivHex, expectedHmac, rawCiphertext] = parts;
      iv = CryptoJS.enc.Hex.parse(ivHex);
      ciphertext = rawCiphertext;

      // Verify HMAC-SHA256 authentication tag
      const computedHmac = CryptoJS.HmacSHA256(`${ivHex}:${rawCiphertext}`, key).toString();
      if (computedHmac !== expectedHmac) {
        console.error("Ciphertext authentication failed: data has been tampered with");
        return null;
      }
    } else {
      // Backward compatibility with v1 legacy deterministic IV
      iv = getLegacyIV(passStr);
      ciphertext = encryptedString;
    }

    const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedStr) {
      console.warn("Decryption returned empty string");
      return null;
    }

    try {
      return JSON.parse(decryptedStr);
    } catch {
      return decryptedStr;
    }
  } catch (error) {
    console.error("Decryption failed detail:", error?.message || error);
    return null;
  }
}

export default {
  encryptData,
  decryptData
};

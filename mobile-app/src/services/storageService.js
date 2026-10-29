/**
 * Encrypted Storage Service — Stub
 * ───────────────────────────────────────────────
 * Wraps AsyncStorage with an encryption layer.
 * In production, swap for expo-secure-store or
 * react-native-encrypted-storage for PHI compliance.
 *
 * ⚠ NEVER log PHI to the console.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const STORAGE_PREFIX = '@healthmem:';
const DEVICE_KEY = 'healthmem-device-storage-key-772910';

function encryptStorage(raw) {
  try {
    return CryptoJS.AES.encrypt(raw, DEVICE_KEY).toString();
  } catch {
    return raw;
  }
}

function decryptStorage(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, DEVICE_KEY);
    const str = bytes.toString(CryptoJS.enc.Utf8);
    return str || cipher;
  } catch {
    return cipher;
  }
}

/**
 * Securely store a value with encryption at rest.
 */
export async function saveSecure(key, value) {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = encryptStorage(serialized);
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted);
  } catch (_e) {
    // Fail silently — never expose PHI in error logs
  }
}

/**
 * Retrieve and decrypt a stored value from local cache.
 */
export async function getSecure(key) {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw === null) return null;
    const decrypted = decryptStorage(raw);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (_e) {
    return null;
  }
}

/**
 * Remove a stored value.
 */
export async function removeSecure(key) {
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (_e) {
    // Fail silently
  }
}

/* ── FHIR Specific Methods ── */

export async function saveFHIRResource(resourceType, data) {
  // Save specific FHIR resources (e.g., Patient, Observation)
  // We store them in an array to maintain a history/list
  const existing = await getSecure(`fhir_${resourceType}`) || [];
  existing.push({ ...data, _localSavedAt: new Date().toISOString() });
  await saveSecure(`fhir_${resourceType}`, existing);
}

export async function getFHIRResources(resourceType) {
  return await getSecure(`fhir_${resourceType}`) || [];
}

export async function setFHIRResources(resourceType, dataArray) {
  await saveSecure(`fhir_${resourceType}`, dataArray);
}

export default { 
  saveSecure, 
  getSecure, 
  removeSecure,
  saveFHIRResource,
  getFHIRResources,
  setFHIRResources
};

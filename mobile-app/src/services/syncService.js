/**
 * Sync Manager Service — Zero-Trust Encrypted
 * ───────────────────────────────────────────────
 * Pushes and pulls the patient's encrypted timeline to Supabase.
 */

import * as Network from 'expo-network';
import storageService from './storageService';
import authService from './authService';
import cryptoService from './cryptoService';
import { supabase } from './supabase';

const RESOURCE_TYPES = ['Patient', 'Observation', 'ClinicalImpression'];

export async function isOnline() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected && state.isInternetReachable;
  } catch {
    return false;
  }
}

export async function pushLocalToRemote() {
  if (!(await isOnline())) return false;
  
  const password = await authService.getSessionPassword();
  const session = await authService.getCurrentSession();
  
  if (!password || !session) {
    console.log("No active session or password found for sync push");
    return false;
  }

  // Gather all local data
  const payload = {};
  for (const type of RESOURCE_TYPES) {
    payload[type] = await storageService.getFHIRResources(type);
  }

  // Encrypt with AES
  const encryptedBlob = cryptoService.encryptData(payload, password);
  if (!encryptedBlob) return false;

  // Push encrypted blob to Supabase
  const { error } = await supabase
    .from('encrypted_backups')
    .upsert({ 
      user_id: session.user.id, 
      encrypted_payload: encryptedBlob,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error("Failed to push backup", error);
    return false;
  }
  return true;
}

export async function pullRemoteRecords() {
  if (!(await isOnline())) return false;
  
  const password = await authService.getSessionPassword();
  const session = await authService.getCurrentSession();
  
  if (!password || !session) {
    console.log("No active session or password found for sync pull");
    return false;
  }

  // Fetch encrypted blob from Supabase
  const { data, error } = await supabase
    .from('encrypted_backups')
    .select('encrypted_payload')
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) return false;

  // Decrypt using login password
  const decryptedPayload = cryptoService.decryptData(data.encrypted_payload, password);
  if (!decryptedPayload) return false;

  // Merge remote records with local cache preserving newly added documents
  for (const type of RESOURCE_TYPES) {
    if (decryptedPayload[type] && Array.isArray(decryptedPayload[type])) {
      const existing = await storageService.getFHIRResources(type);
      const existingMap = new Map((Array.isArray(existing) ? existing : []).map(r => [r.id, r]));
      
      for (const remoteItem of decryptedPayload[type]) {
        if (!existingMap.has(remoteItem.id)) {
          existingMap.set(remoteItem.id, remoteItem);
        }
      }
      
      await storageService.setFHIRResources(type, Array.from(existingMap.values()));
    }
  }
  return true;
}

export async function syncAll() {
  const online = await isOnline();
  if (!online) return false;
  
  // Typical flow: Pull first, then push (to ensure we have latest before overwriting)
  // In a robust system this would merge, but for this MVP we overwrite.
  await pullRemoteRecords();
  await pushLocalToRemote();
  return true;
}

export default { 
  isOnline, 
  pullRemoteRecords, 
  pushLocalToRemote,
  syncAll
};

import { supabase } from './supabase';
import storageService from './storageService';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  
  // Store password for encryption/decryption sync tasks
  await storageService.saveSecure('session_password', password);
  return data;
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  
  await storageService.saveSecure('session_password', password);
  return data;
}

export async function logout() {
  await storageService.removeSecure('session_password');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionPassword() {
  return await storageService.getSecure('session_password');
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default {
  login,
  register,
  logout,
  getSessionPassword,
  getCurrentSession
};

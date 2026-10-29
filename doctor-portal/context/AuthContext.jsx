'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [decodedToken, setDecodedToken] = useState(null);
  const router = useRouter();

  // Load token from memory/storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('health_memory_qr_token');
    if (stored) {
      setToken(stored);
      try {
        // Simple base64 decode for UI hints (validation happens on backend)
        const payload = JSON.parse(atob(stored.split('.')[1]));
        setDecodedToken(payload);
      } catch {
        sessionStorage.removeItem('health_memory_qr_token');
        setToken(null);
      }
    }
  }, []);

  const loginWithQR = (jwtString, role = 'doctor') => {
    try {
      const payload = JSON.parse(atob(jwtString.split('.')[1]));
      sessionStorage.setItem('health_memory_qr_token', jwtString);
      setToken(jwtString);
      setDecodedToken(payload);
      router.push(role === 'doctor' ? '/doctor/dashboard' : '/hospital/dashboard');
    } catch (err) {
      throw new Error('Invalid QR Token format');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('health_memory_qr_token');
    setToken(null);
    setDecodedToken(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ token, decodedToken, loginWithQR, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

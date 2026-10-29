'use client';

import { useState, useEffect } from 'react';
import ProviderLogin from './ProviderLogin';
import QRTokenInput from './QRTokenInput';

export default function HomeLoginFlow() {
  const [providerRole, setProviderRole] = useState(null);

  useEffect(() => {
    const role = sessionStorage.getItem('health_provider_role');
    if (role) {
      setProviderRole(role);
    }
  }, []);

  if (providerRole) {
    return <QRTokenInput role={providerRole} />;
  }

  return <ProviderLogin onLoginSuccess={(role) => setProviderRole(role)} />;
}

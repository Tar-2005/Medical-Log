'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { usePatient } from '../../../../context/PatientContext';
import TopBar from '../../../../components/dashboard/TopBar';

export default function HospitalDashboardLayout({ children }) {
  const { token, decodedToken } = useAuth();
  const { fetchPatientContext } = usePatient();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/');
    } else if (decodedToken?.sub) {
      fetchPatientContext(decodedToken.sub);
    }
  }, [token, decodedToken, router, fetchPatientContext]);

  if (!token) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-24 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

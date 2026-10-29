'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';

export default function TopBar() {
  const { decodedToken } = useAuth();
  const { refreshTimeline, isRefreshing } = usePatient();
  const [doctorName, setDoctorName] = useState('Dr. Unknown');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('health_provider_id');
      if (stored) {
        setDoctorName(stored.startsWith('Dr.') ? stored : `Dr. ${stored}`);
      }
    }
  }, []);

  return (
    <header className="h-16 bg-surface/50 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center bg-background border border-border rounded-lg px-3 py-1.5 w-64">
        <Search size={16} className="text-text-muted" />
        <input 
          type="text" 
          placeholder="Search records..." 
          className="bg-transparent border-none outline-none text-sm ml-2 w-full text-text-primary placeholder:text-text-muted"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => refreshTimeline && refreshTimeline()}
          title="Refresh latest uploads from patient app"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-surface border border-border text-xs text-text-secondary hover:text-white transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary" : "text-primary"} />
          <span className="hidden sm:inline font-medium">Sync Data</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20 text-xs font-medium">
          <ShieldCheck size={14} />
          <span>Zero-Trust Active</span>
        </div>
        
        <button className="relative p-2 text-text-secondary hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{doctorName}</p>
            <p className="text-xs text-text-muted">
              {decodedToken?.scopes?.includes('read:*') ? 'Full Access' : 'Scoped Access'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-emerald-400 border-2 border-surface flex items-center justify-center font-bold text-xs text-white shadow-sm">
            {doctorName.replace('Dr. ', '').charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}

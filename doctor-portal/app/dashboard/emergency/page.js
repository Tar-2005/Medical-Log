'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldAlert, FileText, Loader2, Key } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function EmergencyPage() {
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { decodedToken } = useAuth();
  const router = useRouter();

  const handleOverride = async (e) => {
    e.preventDefault();
    if (!patientId.trim() || reason.trim().length < 10) {
      setError('Patient ID is required, and reason must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${baseUrl}/emergency/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId.trim(),
          accessorId: decodedToken?.providerId || 'emergency-provider',
          reason: reason.trim()
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.issue?.[0]?.diagnostics || 'Emergency override failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-danger/10 border border-danger p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-danger/20 rounded-full text-danger shrink-0">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-danger mb-2">Break-Glass Emergency Access</h1>
            <p className="text-text-secondary">
              This action bypasses cryptographic QR authentication to retrieve critical patient data (allergies, blood type, recent vitals) during an emergency.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-danger-light">
              <span className="flex items-center gap-1"><ShieldAlert size={16}/> Immutable Audit Log Created</span>
              <span className="flex items-center gap-1"><Key size={16}/> Trusted Contacts Notified</span>
            </div>
          </div>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleOverride} className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          {error && (
             <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
               {error}
             </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Patient UUID</label>
            <input 
              type="text" 
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-danger/50 focus:ring-1 focus:ring-danger/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Clinical Reason for Override (Min 10 chars)</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Patient is unresponsive. Requires immediate intervention..."
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary h-24 focus:outline-none focus:border-danger/50 focus:ring-1 focus:ring-danger/50"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-danger hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={20} />}
            TRIGGER EMERGENCY OVERRIDE
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex justify-between items-center text-success">
            <span className="font-semibold text-lg">Emergency Data Retrieved</span>
            <span className="text-sm">Audit ID: {result.auditId?.split('-')[0]}...</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border bg-background flex items-center gap-2">
              <FileText className="text-text-muted" size={18} />
              <h3 className="font-semibold">Critical FHIR Payload</h3>
            </div>
            <pre className="p-4 text-sm text-text-secondary overflow-auto custom-scrollbar max-h-[500px]">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>

          <button 
            onClick={() => { setResult(null); setPatientId(''); setReason(''); }}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary hover:bg-border/50 transition-colors"
          >
            Reset Form
          </button>
        </div>
      )}
    </div>
  );
}

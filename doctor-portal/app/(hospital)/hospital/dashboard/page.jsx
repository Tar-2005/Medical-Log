'use client';

import { useState } from 'react';
import { ClipboardList, FileUp, ScanText, ShieldCheck, CheckCircle, Lock } from 'lucide-react';
import { usePatient } from '../../../../context/PatientContext';
import { useAuth } from '../../../../context/AuthContext';
import DocumentDropzone from '../../../../components/hospital/DocumentDropzone';
import { format } from 'date-fns';

const intakeStats = [
  { label: 'Accepted Files', value: 'DOCX  PDF  JPG  PNG', icon: FileUp },
  { label: 'Processing', value: 'OCR + AI Analyst', icon: ScanText },
  { label: 'Output', value: 'FHIR Timeline', icon: ClipboardList },
];

export default function HospitalDashboardPage() {
  const { decodedToken } = useAuth();
  const { isLoading, error, patientData } = usePatient();
  const [sessionUploads, setSessionUploads] = useState([]);

  const patientId = decodedToken?.sub;

  const handleProcessed = (result) => {
    setSessionUploads((prev) => [
      {
        id: Date.now(),
        filename: result?.filename || 'Document',
        count: result?.count ?? 0,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  if (isLoading && !patientData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-danger">
        <h3 className="text-xl font-bold mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {/* ── Header Banner ── */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Operator Intake</p>
            <h1 className="mt-1 text-2xl font-bold text-text-primary">Medical Record Upload</h1>
            <p className="mt-1 text-sm text-text-secondary max-w-xl">
              Upload lab reports, discharge summaries, or imaging documents. Records are processed by the AI Analyst and added to the patient&apos;s immutable ledger.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success">
              <ShieldCheck size={16} />
              Secure Session Active
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs text-text-muted">
              <Lock size={12} />
              Patient history is not visible to operators
            </div>
          </div>
        </div>
      </section>

      {/* ── Info Chips ── */}
      <div className="grid grid-cols-3 gap-4">
        {intakeStats.map((item) => (
          <article key={item.label} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
            <item.icon size={20} className="text-primary shrink-0" />
            <div>
              <p className="text-xs text-text-muted">{item.label}</p>
              <p className="text-sm font-semibold text-text-primary">{item.value}</p>
            </div>
          </article>
        ))}
      </div>

      {/* ── Upload + Session Log ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-text-primary mb-4">Upload Document</h2>
          <DocumentDropzone patientId={patientId} onProcessed={handleProcessed} />
        </div>

        <div className="rounded-xl border border-border bg-surface flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary text-sm">Session Uploads</h3>
            <p className="text-xs text-text-muted mt-0.5">Documents submitted in this session only.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {sessionUploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
                <FileUp size={28} className="text-text-muted" />
                <p className="text-text-muted text-sm">No uploads yet this session.</p>
              </div>
            ) : (
              sessionUploads.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-background border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-success shrink-0" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">{u.filename}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {format(new Date(u.timestamp), 'dd MMM yyyy · HH:mm')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full">
                    Ingested
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

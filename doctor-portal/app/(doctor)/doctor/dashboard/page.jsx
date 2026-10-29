'use client';

import { useState } from 'react';
import { usePatient } from '../../../../context/PatientContext';
import PatientHeader from '../../../../components/dashboard/PatientHeader';
import RiskAlertBanner from '../../../../components/dashboard/RiskAlertBanner';
import VitalsPanel from '../../../../components/dashboard/VitalsPanel';
import LabsPanel from '../../../../components/dashboard/LabsPanel';
import ReportsPanel from '../../../../components/dashboard/ReportsPanel';
import TimelineContainer from '../../../../components/timeline/TimelineContainer';
import ScribeInputBar from '../../../../components/scribe/ScribeInputBar';
import { LayoutDashboard, Activity, FlaskConical, FileText, FileImage, Eye, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'reports',   label: 'Uploaded Reports',  icon: FileImage },
  { id: 'vitals',    label: 'Vitals',            icon: Activity },
  { id: 'labs',      label: 'Labs',              icon: FlaskConical },
  { id: 'notes',     label: 'Notes',             icon: FileText },
];

export default function DoctorDashboardPage() {
  const { isLoading, error, summary, patientData, timeline } = usePatient();
  const [activeTab, setActiveTab] = useState('overview');

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
        <h3 className="text-xl font-bold mb-2">Error Loading Patient Data</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Counts for tab badges
  const labCount    = (timeline || []).filter((i) => i.type === 'LabResult').length;
  const noteCount   = (timeline || []).filter((i) => i.type === 'ClinicalImpression').length;
  const reportCount = (timeline || []).filter(
    (i) => i.imageData || i.document_url || i.description?.toLowerCase().includes('upload') || i.source?.toLowerCase().includes('upload')
  ).length;

  const latestReport = (timeline || []).find((i) => i.imageData || i.document_url);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-32">
      <PatientHeader />

      {summary?.riskFlags?.length > 0 && <RiskAlertBanner flags={summary.riskFlags} />}

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const badge = id === 'labs' ? labCount : id === 'notes' ? noteCount : id === 'reports' ? reportCount : null;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-background/60'}`}
            >
              <Icon size={15} />
              {label}
              {badge != null && badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Latest Uploaded Document Card if available */}
          {latestReport && (
            <div className="bg-gradient-to-r from-primary/10 via-surface to-surface border border-primary/30 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                {latestReport.imageData && (
                  <img
                    src={latestReport.imageData}
                    alt="Latest Report"
                    className="w-14 h-16 object-cover rounded-lg border border-border shrink-0"
                  />
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles size={11} /> Latest Patient Uploaded Document
                  </span>
                  <h4 className="font-semibold text-sm text-text-primary mt-0.5">
                    {latestReport.description || latestReport.code}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {latestReport.summary ? latestReport.summary.slice(0, 100) + '...' : 'Digitized via Local OCR'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="px-3.5 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Eye size={13} /> View in Reports
              </button>
            </div>
          )}

          {summary?.summary && (
            <div className="bg-surface border border-border p-5 rounded-xl">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">AI Clinical Synthesis</h3>
              <p className="text-text-secondary leading-relaxed text-sm">{summary.summary}</p>
              <div className="mt-3 text-xs text-text-muted flex items-center justify-between border-t border-border/50 pt-3">
                <span>Synthesized from {summary.dataPointsCount} data points</span>
                <span>Updated: {new Date(summary.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
          <div className="border border-border bg-surface rounded-xl flex flex-col" style={{ height: '520px' }}>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary text-sm">Longitudinal Timeline</h3>
              <p className="text-xs text-text-muted mt-0.5">All records: vitals, labs, uploads & doctor notes — read-only</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <TimelineContainer />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && <ReportsPanel />}

      {activeTab === 'vitals' && <VitalsPanel />}

      {activeTab === 'labs' && <LabsPanel />}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="border border-border bg-surface rounded-xl flex flex-col" style={{ height: '440px' }}>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary text-sm">Doctor Notes</h3>
              <p className="text-xs text-text-muted mt-0.5">Clinical impressions added by doctors — read-only</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {(timeline || []).filter((i) => i.type === 'ClinicalImpression').length === 0 ? (
                <p className="text-text-muted text-sm text-center py-10">No notes yet.</p>
              ) : (
                (timeline || [])
                  .filter((i) => i.type === 'ClinicalImpression')
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((note) => (
                    <div key={note.id} className="bg-background border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{note.specialty}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(note.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(note.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{note.description}</p>
                      {note.source && (
                        <p className="text-xs text-text-muted mt-2 border-t border-border/40 pt-2">— {note.source}</p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
          <ScribeInputBar />
        </div>
      )}
    </div>
  );
}



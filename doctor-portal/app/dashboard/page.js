'use client';

import { usePatient } from '../../context/PatientContext';
import PatientHeader from '../../components/dashboard/PatientHeader';
import RiskAlertBanner from '../../components/dashboard/RiskAlertBanner';
import BiometricChart from '../../components/charts/BiometricChart';
import TimelineContainer from '../../components/timeline/TimelineContainer';
import ScribeInputBar from '../../components/scribe/ScribeInputBar';

export default function DashboardPage() {
  const { isLoading, error, summary, patientData } = usePatient();

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PatientHeader />
      
      {summary?.riskFlags && summary.riskFlags.length > 0 && (
        <RiskAlertBanner flags={summary.riskFlags} />
      )}

      {summary?.summary && (
        <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">AI Clinical Synthesis</h3>
          <p className="text-text-secondary leading-relaxed text-sm">
            {summary.summary}
          </p>
          <div className="mt-3 text-xs text-text-muted flex items-center justify-between">
            <span>Synthesized from {summary.dataPointsCount} data points</span>
            <span>Updated: {new Date(summary.generatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BiometricChart />
        </div>
        <div className="lg:col-span-1 border border-border bg-surface rounded-xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">Longitudinal Timeline</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <TimelineContainer />
          </div>
        </div>
      </div>

      <ScribeInputBar />
    </div>
  );
}

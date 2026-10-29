'use client';

import { useMemo, useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import { format } from 'date-fns';
import { FlaskConical, ChevronDown, ChevronRight, FileText, AlertTriangle, CheckCircle, TrendingDown, Download } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
function downloadReport(report) {
  const lines = [
    `HEALTH MEMORY LAYER — LAB REPORT`,
    `═══════════════════════════════════════════`,
    `Report : ${report.reportTitle}`,
    `Date   : ${format(new Date(report.date), 'dd MMM yyyy, HH:mm')}`,
    `Source : ${report.source}`,
    `File   : ${report.docRef}`,
    ``,
    `TEST RESULTS`,
    `───────────────────────────────────────────`,
    ...report.results.map(
      (r) =>
        `${r.test.padEnd(30)} ${String(r.value + ' ' + r.unit).padEnd(20)} Ref: ${r.refRange.padEnd(20)} [${r.status.toUpperCase()}]`
    ),
    ``,
    `═══════════════════════════════════════════`,
    `This is a read-only record extracted by OCR.`,
    `No modifications permitted.`,
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = report.docRef || `${report.reportTitle.replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    high:   { label: 'HIGH',   cls: 'bg-danger/20 text-danger border-danger/30',    icon: AlertTriangle },
    low:    { label: 'LOW',    cls: 'bg-warning/20 text-warning border-warning/30',  icon: TrendingDown },
    normal: { label: 'NORMAL', cls: 'bg-success/20 text-success border-success/30',  icon: CheckCircle },
  };
  const cfg = map[status] || map.normal;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

// ── Lab Report Card ────────────────────────────────────────────
const LabReportCard = ({ report }) => {
  const [open, setOpen] = useState(true);
  const abnormal = report.results.filter((r) => r.status !== 'normal').length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 bg-surface hover:bg-background/30 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <FlaskConical size={18} className="text-primary shrink-0" />
          <div>
            <p className="font-semibold text-text-primary text-sm">{report.reportTitle}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {format(new Date(report.date), 'dd MMM yyyy, HH:mm')} · {report.source}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {abnormal > 0 && (
            <span className="text-xs font-semibold text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded-full">
              {abnormal} Abnormal
            </span>
          )}
          <button
            onClick={() => downloadReport(report)}
            title="Download report"
            className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={13} />
            Download
          </button>
          <button onClick={() => setOpen((o) => !o)} className="text-text-muted hover:text-text-primary p-1">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Results Table */}
      {open && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/70">
                <th className="text-left px-5 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider">Test</th>
                <th className="text-right px-4 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider">Value</th>
                <th className="text-right px-4 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider">Ref. Range</th>
                <th className="text-right px-5 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {report.results.map((row) => (
                <tr
                  key={row.test}
                  className={`${row.status !== 'normal' ? 'bg-danger/5' : 'hover:bg-background/30'} transition-colors`}
                >
                  <td className="px-5 py-3 text-text-primary font-medium">{row.test}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    row.status === 'high' ? 'text-danger' :
                    row.status === 'low'  ? 'text-warning' : 'text-text-primary'
                  }`}>
                    {row.value} <span className="text-text-muted font-normal text-xs">{row.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted text-xs">{row.refRange}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between bg-background/30">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <FileText size={12} />
              <span>Source: <span className="text-primary">{report.docRef}</span></span>
            </div>
            <button
              onClick={() => downloadReport(report)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
            >
              <Download size={12} />
              Save as .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function LabsPanel() {
  const { timeline, refreshTimeline, isRefreshing } = usePatient();

  const { labReports, operatorUploads } = useMemo(() => {
    const labReports = (timeline || [])
      .filter((i) => i.type === 'LabResult')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Operator-uploaded docs (Observation with source = operator and no LOINC code = raw doc upload)
    const operatorUploads = (timeline || [])
      .filter(
        (i) =>
          i.type === 'Observation' &&
          !i.loincCode &&
          (i.source?.toLowerCase().includes('operator') || i.specialty?.toLowerCase().includes('operator'))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return { labReports, operatorUploads };
  }, [timeline]);

  const totalAbnormal = labReports.reduce(
    (acc, r) => acc + (r.results || []).filter((x) => x.status !== 'normal').length,
    0
  );

  const hasAnyContent = labReports.length > 0 || operatorUploads.length > 0;

  return (
    <div className="space-y-5">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary">Lab Reports & Documents</h2>
          <p className="text-xs text-text-muted mt-0.5">Uploaded by Hospital Operator · OCR Analysed · Read-only</p>
        </div>
        <button
          onClick={refreshTimeline}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          )}
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── Abnormal Alert Banner ── */}
      {totalAbnormal > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            <strong>{totalAbnormal} abnormal result{totalAbnormal > 1 ? 's' : ''}</strong> found across {labReports.length} structured report{labReports.length > 1 ? 's' : ''}. Review highlighted rows.
          </span>
        </div>
      )}

      {/* ── Structured Lab Report Cards ── */}
      {labReports.map((report) => (
        <LabReportCard key={report.id} report={report} />
      ))}

      {/* ── Raw Operator Document Uploads ── */}
      {operatorUploads.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Uploaded Documents
          </p>
          {operatorUploads.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.description || 'Uploaded Document'}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {item.date ? format(new Date(item.date), 'dd MMM yyyy, HH:mm') : '—'} · {item.source}
                    {item._observationCount != null && (
                      <span className="ml-2 text-success">· {item._observationCount} observation{item._observationCount !== 1 ? 's' : ''} extracted</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (item.document_url) {
                    window.open(`http://localhost:4000${item.document_url}`, '_blank');
                  } else {
                    const blob = new Blob(
                      [`UPLOADED DOCUMENT RECORD\n\nDescription: ${item.description}\nDate: ${item.date ? format(new Date(item.date), 'dd MMM yyyy, HH:mm') : '—'}\nSource: ${item.source}\n\nRead-only record from Health Memory Layer.`],
                      { type: 'text/plain' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Document_${format(new Date(item.date || Date.now()), 'ddMMMyyyy')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {item.document_url ? <FileText size={13} /> : <Download size={13} />}
                {item.document_url ? 'View Document' : 'Download Summary'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!hasAnyContent && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-surface border border-border rounded-xl">
          <FlaskConical size={32} className="text-text-muted" />
          <p className="text-text-muted text-sm">No lab reports or documents uploaded yet.</p>
          <p className="text-text-muted text-xs">Hospital operator uploads will appear here. Click Refresh after upload.</p>
        </div>
      )}
    </div>
  );
}

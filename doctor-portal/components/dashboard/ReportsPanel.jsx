'use client';

import { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import { FileText, Image as ImageIcon, Eye, Download, X, Calendar, User, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ReportsPanel() {
  const { timeline } = usePatient();
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Filter all uploaded documents and reports
  const reports = (timeline || []).filter(
    (item) =>
      item.imageData ||
      item.document_url ||
      item.description?.toLowerCase().includes('upload') ||
      item.description?.toLowerCase().includes('report') ||
      item.source?.toLowerCase().includes('upload') ||
      item.source?.toLowerCase().includes('patient') ||
      item.reportTitle ||
      (item.type === 'Observation' && (item.loincCode === '11502-2' || item.category?.toLowerCase() === 'laboratory'))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Patient Uploaded Reports & Scans
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Compressed medical documents digitized via Local PaddleOCR & Gemini AI
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {reports.length} Available {reports.length === 1 ? 'Report' : 'Reports'}
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center text-text-muted space-y-3">
          <ImageIcon size={40} className="mx-auto text-text-muted opacity-50" />
          <p className="text-sm">No uploaded reports found for this patient session.</p>
          <p className="text-xs text-text-muted">
            Reports uploaded by the patient on mobile will automatically sync here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((doc) => {
            const hasImage = !!(doc.imageData || doc.document_url);
            return (
              <div
                key={doc.id}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm group"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div
                      onClick={() => hasImage && setSelectedDoc(doc)}
                      className={`relative w-20 h-24 rounded-lg overflow-hidden border border-border bg-background shrink-0 flex items-center justify-center ${
                        hasImage ? 'cursor-pointer hover:opacity-90' : ''
                      }`}
                    >
                      {hasImage ? (
                        <img
                          src={doc.imageData || doc.document_url}
                          alt={doc.description || doc.code}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <FileText size={28} className="text-text-muted" />
                      )}
                      {hasImage && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={18} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {doc.category || 'Laboratory'}
                        </span>
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(doc.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-text-primary truncate">
                        {doc.description || doc.code || doc.reportTitle || doc.title || 'Medical Diagnostic Report'}
                      </h3>

                      <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                        <User size={11} />
                        {doc.source || 'Patient Mobile Upload'}
                      </p>

                      {doc.summary && (
                        <div className="mt-2 text-xs text-text-secondary bg-background/50 p-2 rounded border border-border/60 line-clamp-2">
                          <span className="font-semibold text-primary inline-flex items-center gap-1 mr-1">
                            <Sparkles size={11} /> Summary:
                          </span>
                          {doc.summary}
                        </div>
                      )}

                      {doc.notes && (
                        <p className="mt-1.5 text-[11px] text-text-muted italic truncate">
                          Patient Note: &ldquo;{doc.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck size={12} /> Encrypted at Rest
                  </span>
                  {hasImage ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Eye size={13} /> View Image
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted">Digital Record</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Lightbox Modal ── */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surfaceElevated">
              <div>
                <h3 className="font-semibold text-text-primary text-base">
                  {selectedDoc.description || selectedDoc.code || selectedDoc.reportTitle || selectedDoc.title || 'Medical Diagnostic Report'}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Uploaded on {new Date(selectedDoc.date).toLocaleString()} · {selectedDoc.source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 hover:bg-background rounded-lg text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-6">
              {/* Image Viewer */}
              <div className="flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border p-2 min-h-[380px]">
                <img
                  src={selectedDoc.imageData || selectedDoc.document_url}
                  alt={selectedDoc.description}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded"
                />
              </div>

              {/* Analysis Sidebar */}
              <div className="w-full md:w-80 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="bg-background p-3 rounded-xl border border-border">
                    <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                      AI Categorization
                    </span>
                    <p className="font-medium text-sm text-text-primary mt-1">
                      {selectedDoc.category || 'Laboratory'}
                    </p>
                  </div>

                  {selectedDoc.summary && (
                    <div className="bg-background p-3 rounded-xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-primary tracking-wider flex items-center gap-1">
                        <Sparkles size={12} /> AI Clinical Findings
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1.5">
                        {selectedDoc.summary}
                      </p>
                    </div>
                  )}

                  {selectedDoc.notes && (
                    <div className="bg-background p-3 rounded-xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider">
                        Patient Upload Notes
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">
                        {selectedDoc.notes}
                      </p>
                    </div>
                  )}

                  <div className="bg-background p-3 rounded-xl border border-border text-xs text-text-muted space-y-1.5">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-medium capitalize">
                        {selectedDoc.status || 'Verified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compression:</span>
                      <span className="text-text-primary">Optimized JPEG / SVG</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <a
                    href={selectedDoc.imageData || selectedDoc.document_url}
                    download="medical-report.jpg"
                    className="w-full py-2.5 px-3 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={14} /> Download Document
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    className="w-full py-2 px-3 bg-surface hover:bg-background border border-border text-text-secondary rounded-lg text-xs font-medium transition-colors"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { format } from 'date-fns';
import { Activity, Stethoscope, Download } from 'lucide-react';

// Generate a downloadable text summary for an observation/document record
function downloadObservation(item) {
  const lines = [
    `HEALTH MEMORY LAYER — DOCUMENT RECORD`,
    `═══════════════════════════════════════════`,
    `Type   : ${item.type}`,
    `Date   : ${item.date ? format(new Date(item.date), 'dd MMM yyyy, HH:mm') : 'Unknown'}`,
    `Dept   : ${item.specialty || '—'}`,
    `Status : ${item.status || '—'}`,
    `Source : ${item.source || '—'}`,
    ``,
    `DESCRIPTION`,
    `───────────────────────────────────────────`,
    item.description || item.code || 'No additional details.',
    ``,
    `═══════════════════════════════════════════`,
    `Read-only record. No modifications permitted.`,
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(item.specialty || 'Record').replace(/\s+/g, '_')}_${format(new Date(item.date || Date.now()), 'ddMMMyyy')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TimelineItem({ item }) {
  const isObservation = item.type === 'Observation';
  const isOptimistic = item.isOptimistic;
  const isDocument = isObservation && (item.description?.toLowerCase().startsWith('uploaded') || !!item.docRef);

  const Icon = isObservation ? Activity : Stethoscope;
  const iconBg = isObservation ? 'bg-primary' : 'bg-emerald-500';
  const displayDate = item.date ? format(new Date(item.date), 'dd MMM yyyy • HH:mm') : 'Unknown Date';

  return (
    <div className={`relative pl-8 ${isOptimistic ? 'opacity-60 animate-pulse' : ''}`}>
      {/* Timeline Dot */}
      <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-surface ${iconBg} flex items-center justify-center`}>
      </div>

      <div className="bg-background border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className={isObservation ? 'text-primary' : 'text-emerald-500'} />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {isObservation ? item.category || item.specialty || 'Observation' : item.specialty || 'Clinical Note'}
            </span>
            {isOptimistic && (
              <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full">Processing...</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-muted">{displayDate}</span>
            {isDocument && (
              <button
                onClick={() => downloadObservation(item)}
                title="Download record"
                className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded-md transition-colors"
              >
                <Download size={11} />
                Download
              </button>
            )}
          </div>
        </div>

        {isObservation ? (
          <div>
            <h4 className="text-sm font-medium text-white mb-1">{item.code || item.loincCode || item.description}</h4>
            {item.value && (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">{item.value}</span>
                <span className="text-sm text-text-secondary">{item.unit}</span>
              </div>
            )}
            {item.source && <p className="text-xs text-text-muted mt-2 border-t border-border/50 pt-2">Source: {item.source}</p>}
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {item.description || 'No summary available.'}
            </p>
            {item.source && <p className="text-xs text-text-muted mt-2 border-t border-border/50 pt-2">Source: {item.source}</p>}
            {item.payload?.finding && item.payload.finding.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.payload.finding.map((f, i) => (
                  <span key={i} className="text-xs bg-surface border border-border px-2 py-1 rounded-md text-text-muted">
                    {f.itemCodeableConcept?.text || f.itemCodeableConcept?.coding?.[0]?.display}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


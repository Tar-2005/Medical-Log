import { AlertTriangle } from 'lucide-react';

export default function RiskAlertBanner({ flags }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {flags.map((flag, idx) => {
        let colors = 'bg-surface border-border text-text-primary';
        let iconColor = 'text-primary';

        if (flag.level === 'critical' || flag.level === 'high') {
          colors = 'bg-danger/10 border-danger/30 text-danger-light';
          iconColor = 'text-danger';
        } else if (flag.level === 'moderate') {
          colors = 'bg-warning/10 border-warning/30 text-warning-light';
          iconColor = 'text-warning';
        }

        return (
          <div key={idx} className={`p-4 border rounded-xl flex items-start gap-4 ${colors}`}>
            <AlertTriangle className={`shrink-0 mt-0.5 ${iconColor}`} size={20} />
            <div>
              <h4 className={`font-semibold text-sm capitalize mb-1 ${iconColor}`}>
                {flag.level} Risk: {flag.category}
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                {flag.description}
              </p>
              {flag.basedOn && (
                <p className="text-xs text-text-muted mt-2">
                  <span className="font-medium opacity-80">Based on:</span> {flag.basedOn}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { usePatient } from '../../context/PatientContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { Activity, Heart, Thermometer, Zap } from 'lucide-react';

const LOINC_MAP = {
  '8480-6': { key: 'sys', label: 'Systolic BP', color: '#f59e0b', unit: 'mmHg' },
  '8462-4': { key: 'dia', label: 'Diastolic BP', color: '#10b981', unit: 'mmHg' },
  '8867-4': { key: 'hr',  label: 'Heart Rate',   color: '#0ea5e9', unit: 'bpm' },
};

const statusColor = (v, type) => {
  const n = parseFloat(v);
  if (type === 'sys') return n > 140 ? 'text-danger' : n > 120 ? 'text-warning' : 'text-success';
  if (type === 'dia') return n > 90  ? 'text-danger' : n > 80  ? 'text-warning' : 'text-success';
  if (type === 'hr')  return n > 100 ? 'text-danger' : n < 60  ? 'text-warning' : 'text-success';
  return 'text-text-primary';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="text-text-muted mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value} {LOINC_MAP[Object.keys(LOINC_MAP).find(k => LOINC_MAP[k].key === p.dataKey)]?.unit || ''}
        </p>
      ))}
    </div>
  );
};

export default function VitalsPanel() {
  const { timeline } = usePatient();

  const { chartData, latest } = useMemo(() => {
    const vitals = (timeline || []).filter(
      (i) => i.type === 'Observation' && i.loincCode && LOINC_MAP[i.loincCode]
    );

    const grouped = {};
    vitals.forEach((obs) => {
      const dateKey = format(new Date(obs.date), 'dd MMM');
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, _fullDate: obs.date };
      grouped[dateKey][LOINC_MAP[obs.loincCode].key] = parseFloat(obs.value);
    });

    const chartData = Object.values(grouped).sort(
      (a, b) => new Date(a._fullDate) - new Date(b._fullDate)
    );

    // Latest values
    const latest = {};
    vitals.forEach((obs) => {
      const info = LOINC_MAP[obs.loincCode];
      if (!latest[info.key] || new Date(obs.date) > new Date(latest[info.key].date)) {
        latest[info.key] = { value: obs.value, unit: obs.unit, date: obs.date, source: obs.source };
      }
    });

    return { chartData, latest };
  }, [timeline]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface border border-border rounded-xl">
        <p className="text-text-muted text-sm">No vitals data available.</p>
      </div>
    );
  }

  const statCards = [
    { key: 'sys', label: 'Systolic BP', icon: Activity, color: '#f59e0b' },
    { key: 'dia', label: 'Diastolic BP', icon: Zap, color: '#10b981' },
    { key: 'hr',  label: 'Heart Rate',  icon: Heart, color: '#0ea5e9' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Latest Vital Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, color }) => {
          const v = latest[key];
          return (
            <div key={key} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
                <Icon size={16} style={{ color }} />
              </div>
              {v ? (
                <>
                  <p className={`text-3xl font-bold ${statusColor(v.value, key)}`}>
                    {v.value}
                    <span className="text-sm font-normal text-text-muted ml-1">{v.unit}</span>
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {format(new Date(v.date), 'dd MMM, HH:mm')} · {v.source}
                  </p>
                </>
              ) : (
                <p className="text-text-muted text-sm">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Trend Chart ── */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-white">Trend — Blood Pressure & Heart Rate</h3>
          <p className="text-xs text-text-muted mt-1">Historical readings from clinic visits & smart monitor</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
              <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Sys threshold', fill: '#ef4444', fontSize: 10, position: 'right' }} />
              <Line type="monotone" name="Systolic BP"  dataKey="sys" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} connectNulls />
              <Line type="monotone" name="Diastolic BP" dataKey="dia" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} connectNulls />
              <Line type="monotone" name="Heart Rate"   dataKey="hr"  stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

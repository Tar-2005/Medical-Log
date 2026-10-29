import { useMemo } from 'react';
import { usePatient } from '../../context/PatientContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

export default function BiometricChart() {
  const { timeline } = usePatient();

  // Process timeline data into chart format
  const chartData = useMemo(() => {
    if (!timeline) return [];

    // Filter for Observations (Heart Rate & Blood Pressure as an example)
    // Assuming LOINC: 8867-4 (Heart Rate), 8480-6 (Systolic), 8462-4 (Diastolic)
    const observations = timeline.filter(item => item.type === 'Observation').reverse();
    
    // Group by date
    const grouped = {};

    observations.forEach(obs => {
      const dateKey = format(new Date(obs.date), 'MMM dd, HH:mm');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, fullDate: obs.date };
      }

      if (obs.loincCode === '8867-4' || obs.code?.toLowerCase().includes('heart rate')) {
        grouped[dateKey].hr = parseFloat(obs.value);
      } else if (obs.loincCode === '8480-6' || obs.code?.toLowerCase().includes('systolic')) {
        grouped[dateKey].sys = parseFloat(obs.value);
      } else if (obs.loincCode === '8462-4' || obs.code?.toLowerCase().includes('diastolic')) {
        grouped[dateKey].dia = parseFloat(obs.value);
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [timeline]);

  if (chartData.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl h-[400px] flex items-center justify-center">
        <p className="text-text-muted">No biometric data available for visualization.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 h-[600px] flex flex-col">
      <div className="mb-6">
        <h3 className="font-semibold text-white text-lg">Biometric Trends</h3>
        <p className="text-sm text-text-muted">Heart Rate & Blood Pressure</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Line 
              type="monotone" 
              name="Heart Rate (bpm)"
              dataKey="hr" 
              stroke="#0ea5e9" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
              activeDot={{ r: 6, fill: '#0ea5e9' }}
              connectNulls
            />
            <Line 
              type="monotone" 
              name="Systolic (mmHg)"
              dataKey="sys" 
              stroke="#f59e0b" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
              activeDot={{ r: 6, fill: '#f59e0b' }}
              connectNulls
            />
             <Line 
              type="monotone" 
              name="Diastolic (mmHg)"
              dataKey="dia" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
              activeDot={{ r: 6, fill: '#10b981' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

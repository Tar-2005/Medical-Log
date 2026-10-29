'use client';

import { useState } from 'react';
import { User, Lock, AlertCircle, Sparkles, FlaskConical, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DOCTORS = {
  'Dr. Unknown': 'test',
  'Tarun Kumar': '6161',
  'Prithiviraj': '6175',
  'Vinesh': '6308',
  'Hariharan': '123'
};

const OPERATORS = {
  'Admin': 'admin'
};

// Demo session token for direct testing access (signed with current JWT_SECRET)
const DEMO_TEST_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZGE4OTc2NC01YTY2LTRiOGUtOGEwYy1mZjRmYjBlMTg1ZGMiLCJwcm92aWRlcklkIjoiZGVtby1wcm92aWRlci0wMDEiLCJzY29wZXMiOlsicmVhZDoqIiwicmVhZDpjYXJkaW9sb2d5IiwicmVhZDpsYWJvcmF0b3J5IiwicmVhZDp2aXRhbHMiXSwiaXNzIjoiaGVhbHRoLW1lbW9yeS1wYXRpZW50LWFwcCIsImp0aSI6ImMzNGQwMjViLWFlYjAtNDIxYy1iZmJlLTQyNTRhZTAxY2Y4MyIsImlhdCI6MTc5MjkzNTg5NSwiZXhwIjoxODI0NDcxODk1fQ.nLAghgwvLdOOdpZQgekOisB3zNX9CjkXEfXs1MSewm0';

export default function ProviderLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [role, setRole] = useState('doctor'); // 'doctor' or 'hospital'
  const { loginWithQR } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const isDrUnknown = trimmedUser.toLowerCase() === 'dr. unknown' || trimmedUser.toLowerCase() === 'dr unknown';

    if (role === 'doctor') {
      if (isDrUnknown) {
        sessionStorage.setItem('health_provider_id', 'Dr. Unknown');
        sessionStorage.setItem('health_provider_role', 'doctor');
        onLoginSuccess('doctor');
        return;
      }
      if (DOCTORS[trimmedUser] && DOCTORS[trimmedUser] === password) {
        sessionStorage.setItem('health_provider_id', trimmedUser);
        sessionStorage.setItem('health_provider_role', 'doctor');
        onLoginSuccess('doctor');
        return;
      }
    } else if (role === 'hospital' && OPERATORS[trimmedUser] && OPERATORS[trimmedUser] === password) {
      sessionStorage.setItem('health_provider_id', trimmedUser);
      sessionStorage.setItem('health_provider_role', 'hospital');
      onLoginSuccess('hospital');
      return;
    }

    setError(`Invalid ${role} credentials.`);
  };

  // 1-Click Direct Testing Enter as Dr. Unknown
  const handleQuickTestDirect = () => {
    sessionStorage.setItem('health_provider_id', 'Dr. Unknown');
    sessionStorage.setItem('health_provider_role', 'doctor');
    loginWithQR(DEMO_TEST_TOKEN, 'doctor');
  };

  // Pre-fill form fields for Dr. Unknown
  const handlePreFillDrUnknown = () => {
    setRole('doctor');
    setUsername('Dr. Unknown');
    setPassword('test');
    setError('');
  };

  return (
    <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-xl border border-border">
      <div className="flex justify-center mb-6 text-primary">
        <div className="p-4 bg-primary/10 rounded-full">
          <User size={48} />
        </div>
      </div>
      
      <h2 className="text-2xl font-semibold text-center mb-2">Health Memory Portal</h2>
      <p className="text-text-muted text-center text-sm mb-6">
        Authenticate to access the Health Memory Layer.
      </p>

      {/* Testing Shortcut for Dr. Unknown */}
      <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <FlaskConical size={14} className="text-emerald-400" /> Testing Mode
          </span>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
            1-Click Access
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuickTestDirect}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles size={16} />
          <span>Enter as <strong>Dr. Unknown</strong></span>
          <ArrowRight size={16} className="ml-1" />
        </button>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-400/80">
          <span>Instant bypass to Doctor Dashboard</span>
          <button
            type="button"
            onClick={handlePreFillDrUnknown}
            className="text-emerald-300 hover:underline hover:text-white font-medium"
          >
            Fill Credentials
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-6 bg-background p-1 rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setRole('doctor')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${role === 'doctor' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
        >
          Doctor
        </button>
        <button
          type="button"
          onClick={() => setRole('hospital')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${role === 'hospital' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
        >
          Operator
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-3 text-danger text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Provider Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary"
            placeholder="e.g. Dr. Unknown or Tarun Kumar"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary"
            placeholder="••••••••"
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Lock size={20} />
          Login as {role === 'doctor' ? 'Doctor' : 'Operator'}
        </button>
      </form>
    </div>
  );
}

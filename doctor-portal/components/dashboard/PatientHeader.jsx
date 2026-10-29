import { usePatient } from '../../context/PatientContext';

function calculateAge(birthDateString) {
  if (!birthDateString) return 'Unknown';
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function PatientHeader() {
  const { patientData } = usePatient();

  if (!patientData) return null;

  // Assuming FHIR HumanName structure: [{ given: ['Jane'], family: 'Doe' }]
  const primaryName = patientData.name?.[0];
  const given = primaryName?.given?.join(' ') || '';
  const family = primaryName?.family || '';
  const fullName = `${given} ${family}`.trim() || 'Unknown Patient';

  return (
    <div className="bg-gradient-to-r from-surface to-background border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl font-bold text-primary">
          {given?.[0] || '?'}{family?.[0] || '?'}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{fullName}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span>{patientData.gender === 'male' ? 'Male' : patientData.gender === 'female' ? 'Female' : 'Other'}</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span>{calculateAge(patientData.birthDate)} yrs ({patientData.birthDate})</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span>ID: {patientData.id?.split('-')[0]}...</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex gap-4">
        <div className="bg-surface/50 border border-border px-4 py-2 rounded-xl text-center">
          <p className="text-xs text-text-muted mb-1">Blood Type</p>
          <p className="text-lg font-semibold text-danger">O+</p>
        </div>
        <div className="bg-surface/50 border border-border px-4 py-2 rounded-xl text-center">
          <p className="text-xs text-text-muted mb-1">Allergies</p>
          <p className="text-lg font-semibold text-warning">Penicillin</p>
        </div>
      </div>
    </div>
  );
}

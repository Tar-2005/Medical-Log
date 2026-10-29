'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const { token } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const currentPatientIdRef = useRef(null);

  const DUMMY_TIMELINE = [
    // ── Vitals ──
    { type: 'Observation', id: 'v-sys-0',  date: new Date(Date.now() - 86400000 * 0).toISOString(),  code: 'Systolic BP',  loincCode: '8480-6', value: '138', unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Clinic Visit' },
    { type: 'Observation', id: 'v-dia-0',  date: new Date(Date.now() - 86400000 * 0).toISOString(),  code: 'Diastolic BP', loincCode: '8462-4', value: '90',  unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Clinic Visit' },
    { type: 'Observation', id: 'v-hr-0',   date: new Date(Date.now() - 86400000 * 0).toISOString(),  code: 'Heart Rate',   loincCode: '8867-4', value: '82',  unit: 'bpm',  specialty: 'Cardiology', status: 'final', source: 'Clinic Visit' },
    { type: 'Observation', id: 'v-sys-2',  date: new Date(Date.now() - 86400000 * 2).toISOString(),  code: 'Systolic BP',  loincCode: '8480-6', value: '135', unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-dia-2',  date: new Date(Date.now() - 86400000 * 2).toISOString(),  code: 'Diastolic BP', loincCode: '8462-4', value: '88',  unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-hr-2',   date: new Date(Date.now() - 86400000 * 2).toISOString(),  code: 'Heart Rate',   loincCode: '8867-4', value: '78',  unit: 'bpm',  specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-sys-5',  date: new Date(Date.now() - 86400000 * 5).toISOString(),  code: 'Systolic BP',  loincCode: '8480-6', value: '142', unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-dia-5',  date: new Date(Date.now() - 86400000 * 5).toISOString(),  code: 'Diastolic BP', loincCode: '8462-4', value: '92',  unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-hr-5',   date: new Date(Date.now() - 86400000 * 5).toISOString(),  code: 'Heart Rate',   loincCode: '8867-4', value: '85',  unit: 'bpm',  specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-sys-10', date: new Date(Date.now() - 86400000 * 10).toISOString(), code: 'Systolic BP',  loincCode: '8480-6', value: '130', unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-dia-10', date: new Date(Date.now() - 86400000 * 10).toISOString(), code: 'Diastolic BP', loincCode: '8462-4', value: '84',  unit: 'mmHg', specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    { type: 'Observation', id: 'v-hr-10',  date: new Date(Date.now() - 86400000 * 10).toISOString(), code: 'Heart Rate',   loincCode: '8867-4', value: '74',  unit: 'bpm',  specialty: 'Cardiology', status: 'final', source: 'Smart Monitor' },
    // ── Lab Results (dummy) ──
    { type: 'LabResult', id: 'lab-cbc-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), reportTitle: 'Complete Blood Count (CBC)', source: 'Hospital Operator Upload · LalPathLabs', docRef: 'Lab_Report_CBC_Apr28.pdf', results: [
      { test: 'Haemoglobin',  value: '13.2',     unit: 'g/dL',       refRange: '13.0 – 17.0',         status: 'normal' },
      { test: 'RBC Count',    value: '4.1',      unit: 'million/µL', refRange: '4.5 – 5.9',           status: 'low' },
      { test: 'WBC Count',    value: '9,400',    unit: 'cells/µL',   refRange: '4,000 – 11,000',      status: 'normal' },
      { test: 'Platelets',    value: '2,10,000', unit: '/µL',        refRange: '1,50,000 – 4,00,000', status: 'normal' },
      { test: 'MCV',          value: '74',       unit: 'fL',         refRange: '80 – 100',            status: 'low' },
    ]},
    { type: 'LabResult', id: 'lab-lft-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), reportTitle: 'Liver Function Test (LFT)', source: 'Hospital Operator Upload · LalPathLabs', docRef: 'Lab_Report_LFT_Apr28.pdf', results: [
      { test: 'SGPT / ALT',           value: '68',  unit: 'U/L',   refRange: '7 – 56',    status: 'high' },
      { test: 'SGOT / AST',           value: '54',  unit: 'U/L',   refRange: '10 – 40',   status: 'high' },
      { test: 'Alkaline Phosphatase', value: '98',  unit: 'U/L',   refRange: '44 – 147',  status: 'normal' },
      { test: 'Total Bilirubin',      value: '1.1', unit: 'mg/dL', refRange: '0.1 – 1.2', status: 'normal' },
      { test: 'Total Protein',        value: '6.8', unit: 'g/dL',  refRange: '6.3 – 8.2', status: 'normal' },
      { test: 'Serum Albumin',        value: '3.9', unit: 'g/dL',  refRange: '3.5 – 5.0', status: 'normal' },
    ]},
    { type: 'LabResult', id: 'lab-lip-1', date: new Date(Date.now() - 86400000 * 5).toISOString(), reportTitle: 'Lipid Profile', source: 'Hospital Operator Upload · AASHVI DIAGNOSTICS', docRef: 'Lab_Report_Lipid_Apr25.pdf', results: [
      { test: 'Total Cholesterol', value: '218', unit: 'mg/dL', refRange: '< 200', status: 'high' },
      { test: 'LDL Cholesterol',   value: '145', unit: 'mg/dL', refRange: '< 130', status: 'high' },
      { test: 'HDL Cholesterol',   value: '38',  unit: 'mg/dL', refRange: '> 40',  status: 'low' },
      { test: 'Triglycerides',     value: '175', unit: 'mg/dL', refRange: '< 150', status: 'high' },
      { test: 'VLDL',              value: '35',  unit: 'mg/dL', refRange: '< 30',  status: 'high' },
    ]},
    // ── Patient Uploaded Documents ──
    {
      type: 'Observation',
      id: 'doc-uploaded-cbc',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      description: 'Complete Blood Count (CBC) Diagnostic Report',
      code: 'Complete Blood Count (CBC) Diagnostic Report',
      category: 'Laboratory',
      specialty: 'Hematology',
      status: 'final',
      source: 'Patient Mobile Upload',
      summary: 'Haemoglobin is borderline low at 13.2 g/dL. Platelets and WBC count within normal ranges. Slight microcytic indices.',
      notes: 'Uploaded report following routine quarterly medical check-up.',
      imageData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" fill="%23ffffff"><rect width="100%" height="100%" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="4"/><rect x="20" y="20" width="560" height="75" rx="8" fill="%230284c7"/><text x="40" y="52" font-family="Arial" font-size="20" font-weight="bold" fill="%23ffffff">SOVEREIGN HEALTH WALLET</text><text x="40" y="75" font-family="Arial" font-size="12" fill="%23e0f2fe">PATIENT UPLOADED DIAGNOSTIC REPORT</text><rect x="20" y="110" width="560" height="55" rx="6" fill="%23f1f5f9"/><text x="35" y="133" font-family="Arial" font-size="12" font-weight="bold" fill="%23334155">PATIENT: Govindaraj (50 Y / M)</text><text x="35" y="152" font-family="Arial" font-size="11" fill="%2364748b">SAMPLE ID: LAB-2026-99214 | DATE: 24-Oct-2026</text><rect x="20" y="180" width="560" height="30" fill="%230369a1"/><text x="35" y="200" font-family="Arial" font-size="12" font-weight="bold" fill="%23ffffff">TEST NAME                    RESULT      UNIT        REFERENCE</text><text x="35" y="235" font-family="monospace" font-size="12" fill="%231e293b">HAEMOGLOBIN                  13.2        g/dL        13.0 - 17.0</text><text x="35" y="265" font-family="monospace" font-size="12" fill="%23b91c1c">RBC COUNT                    4.1 (LOW)   mil/uL      4.5 - 5.9</text><text x="35" y="295" font-family="monospace" font-size="12" fill="%231e293b">WBC COUNT                    9,400       /uL         4000 - 11000</text><text x="35" y="325" font-family="monospace" font-size="12" fill="%231e293b">PLATELET COUNT               2,10,000    /uL         150000 - 400000</text><text x="35" y="355" font-family="monospace" font-size="12" fill="%23b91c1c">SGPT / ALT (LIVER)           68 (HIGH)   U/L         7 - 56</text><text x="35" y="385" font-family="monospace" font-size="12" fill="%23b91c1c">SGOT / AST (LIVER)           54 (HIGH)   U/L         10 - 40</text><line x1="20" y1="415" x2="580" y2="415" stroke="%23e2e8f0" stroke-width="2"/><text x="35" y="445" font-family="Arial" font-size="12" font-weight="bold" fill="%230369a1">AI CLINICAL OCR SUMMARY:</text><text x="35" y="470" font-family="Arial" font-size="12" fill="%23475569">Mild microcytic anaemia and elevated transaminases. Follow up recommended.</text><rect x="400" y="650" width="180" height="65" fill="%23ffffff" stroke="%230284c7" stroke-width="1.5" rx="6"/><text x="415" y="675" font-family="Arial" font-size="10" font-weight="bold" fill="%230284c7">VERIFIED BY</text><text x="415" y="695" font-family="Arial" font-size="12" font-weight="bold" fill="%230f172a">Dr. S. Nair, MD</text><text x="415" y="708" font-family="Arial" font-size="9" fill="%2364748b">Pathologist (Reg 88219)</text></svg>',
    },
    // ── Operator Doc uploads ──
    { type: 'Observation', id: 'obs-dc', date: new Date(Date.now() - 86400000 * 5).toISOString(), description: 'Uploaded Document: Previous Discharge Summary (Readmission — General Medicine)', specialty: 'General Medicine', status: 'final', source: 'Hospital Operator Upload' },
    // ── Doctor Clinical Notes ──
    { type: 'ClinicalImpression', id: 'ci-1', date: new Date(Date.now() - 86400000 * 7).toISOString(), description: 'Patient presented with mild chest pain and fatigue. Vitals stable. Advised rest and ordered metabolic panel.', specialty: 'Cardiology', status: 'completed', source: 'Dr. Tarun Kumar' },
    { type: 'ClinicalImpression', id: 'ci-2', date: new Date(Date.now() - 86400000 * 3).toISOString(), description: 'Follow-up visit. Elevated LFT values noted. Initiating Ursodeoxycholic acid 300mg BD. Restrict fatty diet.', specialty: 'Hepatology', status: 'completed', source: 'Dr. Prithiviraj' },
  ];

  const fetchPatientContext = useCallback(async (patientId) => {
    if (!token) return;
    currentPatientIdRef.current = patientId;
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      let pData, tData;

      try {
        const pRes = await fetch(`${baseUrl}/patients/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!pRes.ok) throw new Error('API Error');
        pData = await pRes.json();

        const tRes = await fetch(`${baseUrl}/patients/${patientId}/timeline`, { headers: { Authorization: `Bearer ${token}` } });
        if (!tRes.ok) throw new Error('API Error');
        tData = await tRes.json();

        // Merge real backend data with the dummy LabResult entries (backend only returns Observation)
        const realTimeline = tData.timeline || [];
        const hasDummyLabs = realTimeline.some((i) => i.type === 'LabResult');
        if (!hasDummyLabs) {
          tData.timeline = [
            ...realTimeline,
            ...DUMMY_TIMELINE.filter((i) => i.type === 'LabResult'),
          ];
        }
      } catch (apiError) {
        pData = { id: patientId, name: [{ given: ['Govindaraj'] }], gender: 'male', birthDate: '1976-05-12' };
        tData = {
          summary: {
            summary: 'Patient is a 50-year-old male with a history of hypertension and recent elevated liver enzymes. Recommended close monitoring of blood pressure and liver function.',
            riskFlags: ['Hypertension', 'Elevated Liver Enzymes', 'Medication Non-Adherence'],
            dataPointsCount: 14,
            generatedAt: new Date().toISOString(),
          },
          timeline: DUMMY_TIMELINE,
        };
      }

      setPatientData(pData);
      setTimeline(tData.timeline || []);
      setSummary(tData.summary || null);
    } catch (err) {
      setError('Failed to load patient records.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Re-fetch only the timeline (lightweight) — called after an operator upload
  const refreshTimeline = useCallback(async () => {
    const patientId = currentPatientIdRef.current;
    if (!token || !patientId) return;
    setIsRefreshing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const tRes = await fetch(`${baseUrl}/patients/${patientId}/timeline`, { headers: { Authorization: `Bearer ${token}` } });
      if (!tRes.ok) throw new Error('API Error');
      const tData = await tRes.json();
      const realTimeline = tData.timeline || [];
      // Always keep dummy LabResult entries merged in
      const hasDummyLabs = realTimeline.some((i) => i.type === 'LabResult');
      setTimeline(hasDummyLabs ? realTimeline : [
        ...realTimeline,
        ...DUMMY_TIMELINE.filter((i) => i.type === 'LabResult'),
      ]);
    } catch {
      // Silently fail — keep existing timeline
    } finally {
      setIsRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-poll patient timeline every 5s so new uploads appear dynamically
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refreshTimeline();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, refreshTimeline]);

  // Instantly prepend a new Observation to the timeline (optimistic update)
  const addOptimisticUpload = useCallback((filename, observationCount, documentUrl) => {
    setTimeline((prev) => [
      {
        type: 'Observation',
        id: `upload-${Date.now()}`,
        date: new Date().toISOString(),
        description: `Uploaded Document: ${filename}`,
        specialty: 'Hospital Operator Upload',
        status: 'final',
        source: 'Hospital Operator Upload',
        document_url: documentUrl,
        _observationCount: observationCount,
      },
      ...prev,
    ]);
  }, []);

  const addOptimisticImpression = useCallback((impression) => {
    setTimeline((prev) => [
      {
        type: 'ClinicalImpression',
        id: impression.id || `temp-${Date.now()}`,
        date: new Date().toISOString(),
        description: impression.description,
        specialty: impression.specialty?.display || 'General Medicine',
        status: 'completed',
        payload: impression.fhirPayload,
        isOptimistic: true,
      },
      ...prev,
    ]);
  }, []);

  return (
    <PatientContext.Provider value={{
      patientData,
      timeline,
      summary,
      isLoading,
      isRefreshing,
      error,
      fetchPatientContext,
      refreshTimeline,
      addOptimisticUpload,
      addOptimisticImpression,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatient = () => useContext(PatientContext);


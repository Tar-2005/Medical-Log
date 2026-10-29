// backend/scripts/seed.js
import { createClient } from '@supabase/supabase-js';
import { encryptObject } from '../lib/cryptoUtils.js';
import { signToken } from '../lib/jwtUtils.js';
import dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
    console.log("🌱 Initiating Secure Database Seed...\n");

    try {
        // ---------------------------------------------------------
        // 1. Create Mock Patient (FHIR Format)
        // ---------------------------------------------------------
        const patientName = [{ given: ["Alexander"], family: "Chen" }];
        const patientTelecom = [{ system: "phone", value: "555-0198" }];
        
        const phiPayload = {
            name: patientName,
            telecom: patientTelecom,
            address: null,
        };

        const encryptedPhi = encryptObject(phiPayload);

        const { data: patient, error: pError } = await supabase
            .from('patient')
            .insert([{ 
                active: true,
                encrypted_name: encryptedPhi.ciphertext,
                gender: 'male',
                birth_date: '1982-10-24',
                encryption_iv: encryptedPhi.iv,
                encryption_tag: encryptedPhi.tag
            }])
            .select()
            .single();

        if (pError) throw pError;
        console.log(`✅ Patient Created (ID: ${patient.id})`);

        // ---------------------------------------------------------
        // 2. Generate Longitudinal Biometrics (Heart Rate & BP)
        // ---------------------------------------------------------
        const observations = [];
        let currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() - 6);

        for (let i = 0; i < 20; i++) {
            const hr = Math.floor(Math.random() * (90 - 70 + 1)) + 70;
            const sysBP = Math.floor(Math.random() * (145 - 120 + 1)) + 120;
            const diaBP = Math.floor(Math.random() * (95 - 80 + 1)) + 80;

            const dateStr = new Date(currentDate.setDate(currentDate.getDate() + 9)).toISOString();

            observations.push({
                patient_id: patient.id,
                status: 'final',
                code_system: 'http://loinc.org',
                code_value: '8867-4',
                code_display: 'Heart rate',
                category_code: 'vital-signs',
                category_display: 'Vital Signs',
                value_quantity: hr,
                value_unit: 'beats/min',
                effective_dt: dateStr
            });
            observations.push({
                patient_id: patient.id,
                status: 'final',
                code_system: 'http://loinc.org',
                code_value: '8480-6',
                code_display: 'Systolic blood pressure',
                category_code: 'vital-signs',
                category_display: 'Vital Signs',
                value_quantity: sysBP,
                value_unit: 'mmHg',
                effective_dt: dateStr
            });
             observations.push({
                patient_id: patient.id,
                status: 'final',
                code_system: 'http://loinc.org',
                code_value: '8462-4',
                code_display: 'Diastolic blood pressure',
                category_code: 'vital-signs',
                category_display: 'Vital Signs',
                value_quantity: diaBP,
                value_unit: 'mmHg',
                effective_dt: dateStr
            });
        }

        const { error: obsError } = await supabase.from('observation').insert(observations);
        if (obsError) throw obsError;
        console.log("✅ Seeded 6 months of longitudinal biometric Observations.");

        // ---------------------------------------------------------
        // 3. Generate a Past Clinical Impression (For the Synthesizer)
        // ---------------------------------------------------------
        const clinicalNoteFHIR = {
            resourceType: "ClinicalImpression",
            status: "completed",
            date: new Date().toISOString(),
            summary: "Patient presents with mild hypertension. Advised lifestyle modifications and scheduled follow-up.",
            investigation: [{ code: { text: "Routine Checkup" } }]
        };

        const encryptedNote = encryptObject(clinicalNoteFHIR);

        const { error: noteError } = await supabase
            .from('clinical_impression')
            .insert([{
                patient_id: patient.id,
                status: 'completed',
                description: 'Routine Checkup',
                encrypted_payload: encryptedNote.ciphertext,
                specialty_code: 'general_practice',
                specialty_display: 'General Practice',
                encryption_iv: encryptedNote.iv,
                encryption_tag: encryptedNote.tag
            }]);
            
        if (noteError) throw noteError;
        console.log("✅ Seeded baseline Clinical Impression.");

        // ---------------------------------------------------------
        // 4. Generate the "QR Handshake" Login Token
        // ---------------------------------------------------------
        const qrToken = signToken(
            {
                patientId: patient.id,
                providerId: 'demo-provider-001',
                scopes: ["read:*"] 
            },
            '24h'
        );

        console.log("\n🎉 Seeding Complete! System ready for E2E testing.");
        console.log("---------------------------------------------------");
        console.log("🔑 COPY THIS QR TOKEN TO LOG INTO THE DASHBOARD:");
        console.log(qrToken);
        console.log("---------------------------------------------------\n");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
}

seedDatabase();
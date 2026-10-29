// ─── Scribe Agent Service ───────────────────────────────────────────────────
// Processes unstructured clinician shorthand text through an LLM API to
// produce standardized FHIR ClinicalImpression JSON.
//
// Flow:
//   1. Clinician types shorthand → POST /api/agents/scribe
//   2. This service sends the text to an LLM with a strict FHIR system prompt
//   3. LLM returns structured FHIR ClinicalImpression JSON
//   4. JSON is validated against FHIR schema
//   5. PHI is encrypted and stored in the database
//   6. DATA_ADDED event is emitted for the Synthesizer Agent
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/environment.js';
import { supabaseAdmin } from '../config/supabase.js';
import { encrypt, encryptObject } from '../lib/cryptoUtils.js';
import { validate } from '../lib/fhirValidator.js';
import eventBus, { Events } from '../lib/eventBus.js';
import { extractJSON } from '../lib/llmUtils.js';
import { GoogleGenAI } from '@google/genai';

/**
 * FHIR-strict system prompt for the LLM.
 * Forces the model to output only valid ClinicalImpression JSON.
 */
const SCRIBE_SYSTEM_PROMPT = `You are a clinical documentation AI assistant. Your ONLY job is to convert unstructured clinician shorthand notes into a valid HL7 FHIR R4 ClinicalImpression resource.

STRICT RULES:
1. Output ONLY valid JSON — no markdown, no explanation, no wrapping.
2. The JSON MUST conform to the FHIR R4 ClinicalImpression resource specification.
3. resourceType MUST be "ClinicalImpression".
4. status MUST be "completed".
5. Extract clinical findings into the "finding" array with appropriate SNOMED CT or ICD-10 codes when possible.
6. Include a concise "summary" field synthesizing the note.
7. If the input mentions a clinical specialty, include it in an extension.
8. Do NOT hallucinate clinical data not present in the input.
9. Use ISO 8601 datetime format for all date fields.

OUTPUT SCHEMA:
{
  "resourceType": "ClinicalImpression",
  "status": "completed",
  "date": "<ISO 8601 datetime>",
  "description": "<brief description>",
  "summary": "<synthesized clinical summary>",
  "subject": {
    "reference": "Patient/<patientId>"
  },
  "finding": [
    {
      "itemCodeableConcept": {
        "coding": [{ "system": "<code system>", "code": "<code>", "display": "<display>" }],
        "text": "<finding text>"
      },
      "basis": "<basis for finding>"
    }
  ],
  "note": [{ "text": "<additional notes>" }]
}`;

/**
 * Calls the configured LLM API to structure clinical shorthand.
 *
 * @param {string} shorthandText — Raw clinician shorthand input
 * @param {string} patientId     — UUID of the patient (injected into subject reference)
 * @returns {Promise<object>} Parsed FHIR ClinicalImpression JSON
 */
async function callLLM(shorthandText, patientId) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const userPrompt = `Patient ID: ${patientId}\n\nClinician shorthand:\n${shorthandText}`;

  const response = await ai.models.generateContent({
    model: env.LLM_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: SCRIBE_SYSTEM_PROMPT,
      temperature: 0.1,
    }
  });

  if (!response.text) {
    throw new Error('LLM returned empty response');
  }

  // FIX: robust multi-strategy JSON extraction instead of fragile regex
  return extractJSON(response.text);
}

/**
 * Main scribe processing pipeline.
 *
 * @param {object} params
 * @param {string} params.shorthandText — Raw clinician input
 * @param {string} params.patientId     — Patient UUID
 * @param {string} params.providerId    — Provider UUID (from auth context)
 * @returns {Promise<object>} The saved ClinicalImpression record (with decrypted payload for response)
 */
export async function processScribeNote({ shorthandText, patientId, providerId }) {
  // 1. Call LLM to structure the shorthand
  const fhirImpression = await callLLM(shorthandText, patientId);

  // 2. Ensure subject reference is set correctly
  fhirImpression.subject = { reference: `Patient/${patientId}` };
  fhirImpression.date = fhirImpression.date || new Date().toISOString();

  // 3. Validate against FHIR schema
  const validation = validate.ClinicalImpression(fhirImpression);
  if (!validation.success) {
    throw new Error(
      `LLM output failed FHIR validation: ${validation.errors.join('; ')}`
    );
  }

  // 4. Encrypt the structured payload and raw input
  const encryptedPayload = encryptObject(validation.data);
  const encryptedRawInput = encrypt(shorthandText);

  // 5. Detect specialty from findings or description
  const specialtyCode = detectSpecialty(fhirImpression);

  // 6. Write to database
  const { data, error } = await supabaseAdmin
    .from('clinical_impression')
    .insert({
      patient_id: patientId,
      status: 'completed',
      description: fhirImpression.description || null,
      encrypted_payload: encryptedPayload.ciphertext,
      encrypted_raw_input: encryptedRawInput.ciphertext,
      specialty_code: specialtyCode?.code || null,
      specialty_display: specialtyCode?.display || null,
      ai_model_used: env.LLM_MODEL,
      ai_confidence: 0.85,  // Placeholder — would come from model confidence
      encryption_iv: encryptedPayload.iv,
      encryption_tag: encryptedPayload.tag,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  // 7. Emit DATA_ADDED event for the Synthesizer Agent
  eventBus.publish(Events.DATA_ADDED, {
    patientId,
    resourceType: 'ClinicalImpression',
    resourceId: data.id,
    timestamp: new Date().toISOString(),
  });

  // 8. Return the record with the decrypted FHIR payload for response
  return {
    id: data.id,
    resourceType: 'ClinicalImpression',
    status: data.status,
    description: data.description,
    specialty: specialtyCode,
    fhirPayload: validation.data,
    createdAt: data.created_at,
  };
}

/**
 * Attempts to detect clinical specialty from the FHIR impression.
 * @param {object} impression — FHIR ClinicalImpression
 * @returns {{ code: string, display: string } | null}
 */
function detectSpecialty(impression) {
  const specialtyMap = {
    cardiology: { code: 'cardiology', display: 'Cardiology' },
    neurology: { code: 'neurology', display: 'Neurology' },
    pulmonology: { code: 'pulmonology', display: 'Pulmonology' },
    endocrinology: { code: 'endocrinology', display: 'Endocrinology' },
    nephrology: { code: 'nephrology', display: 'Nephrology' },
    gastroenterology: { code: 'gastroenterology', display: 'Gastroenterology' },
    oncology: { code: 'oncology', display: 'Oncology' },
    psychiatry: { code: 'psychiatry', display: 'Psychiatry' },
    mental_health: { code: 'mental_health', display: 'Mental Health' },
    orthopedics: { code: 'orthopedics', display: 'Orthopedics' },
    dermatology: { code: 'dermatology', display: 'Dermatology' },
    general: { code: 'general', display: 'General Medicine' },
  };

  const text = JSON.stringify(impression).toLowerCase();

  for (const [key, value] of Object.entries(specialtyMap)) {
    if (text.includes(key)) {
      return value;
    }
  }

  return specialtyMap.general;
}

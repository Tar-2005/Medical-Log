// ─── Synthesizer Agent Service ──────────────────────────────────────────────
// Background service that listens to DATA_ADDED events on the event bus.
// When triggered, it:
//   1. Pulls the patient's full decrypted longitudinal history
//   2. Sends it to the LLM for synthesis
//   3. Generates an updated clinical summary + risk prediction flags
//   4. Stores the summary (encrypted) in the patient_summary table
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/environment.js';
import { supabaseAdmin } from '../config/supabase.js';
import { decryptObject, decrypt, encryptObject } from '../lib/cryptoUtils.js';
import eventBus, { Events } from '../lib/eventBus.js';
import { extractJSON } from '../lib/llmUtils.js';
import { GoogleGenAI } from '@google/genai';

/**
 * System prompt for the Synthesizer LLM call.
 */
const SYNTHESIZER_SYSTEM_PROMPT = `You are a clinical synthesis AI. Given a patient's complete longitudinal health history (observations, clinical impressions), generate:

1. A comprehensive clinical summary (2-3 paragraphs) covering:
   - Key diagnoses and conditions
   - Significant trends in biometric data
   - Treatment history and current medications mentioned
   - Notable findings across specialties

2. A risk prediction assessment as a JSON array of risk flags, each with:
   - "category": the risk category (e.g., "cardiovascular", "metabolic", "respiratory")
   - "level": "low", "moderate", "high", or "critical"
   - "description": brief explanation of the risk
   - "basedOn": which data points support this assessment

OUTPUT FORMAT (JSON only, no markdown):
{
  "summary": "<comprehensive clinical summary text>",
  "riskFlags": [
    {
      "category": "<category>",
      "level": "<low|moderate|high|critical>",
      "description": "<explanation>",
      "basedOn": "<supporting data references>"
    }
  ],
  "generatedAt": "<ISO 8601 timestamp>"
}`;

const debounceTimers = new Map();

/**
 * Initializes the Synthesizer Agent by subscribing to DATA_ADDED events.
 * Call this once at server startup.
 */
export function initSynthesizerAgent() {
  eventBus.subscribe(Events.DATA_ADDED, (payload) => {
    console.log(`\n🧠 [Synthesizer] DATA_ADDED received for patient ${payload.patientId}`);

    if (debounceTimers.has(payload.patientId)) {
      clearTimeout(debounceTimers.get(payload.patientId));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(payload.patientId);
      try {
        await generatePatientSummary(payload.patientId);
        console.log(`✅ [Synthesizer] Summary updated for patient ${payload.patientId}`);
      } catch (err) {
        console.error(`❌ [Synthesizer] Failed for patient ${payload.patientId}:`, err.message);
      }
    }, 5000); // 5-second debounce

    debounceTimers.set(payload.patientId, timer);
  });

  console.log('🧠 [Synthesizer] Agent initialized — listening for DATA_ADDED events');
}

/**
 * Generates an updated clinical summary for a patient.
 *
 * @param {string} patientId — UUID of the patient
 * @returns {Promise<object>} The new patient_summary record
 */
export async function generatePatientSummary(patientId) {
  // 1. Pull all observations for the patient
  const { data: observations, error: obsError } = await supabaseAdmin
    .from('observation')
    .select('*')
    .eq('patient_id', patientId)
    .order('effective_dt', { ascending: true });

  if (obsError) throw new Error(`Failed to fetch observations: ${obsError.message}`);

  // 2. Pull all clinical impressions
  const { data: impressions, error: ciError } = await supabaseAdmin
    .from('clinical_impression')
    .select('*')
    .eq('patient_id', patientId)
    .order('effective_start', { ascending: true });

  if (ciError) throw new Error(`Failed to fetch impressions: ${ciError.message}`);

  // 3. Decrypt all data for synthesis
  const decryptedObservations = observations.map((obs) => ({
    id: obs.id,
    code: obs.code_display,
    loincCode: obs.code_value,
    value: obs.value_quantity,
    unit: obs.value_unit,
    category: obs.category_display,
    effectiveDate: obs.effective_dt,
    status: obs.status,
  }));

  const decryptedImpressions = impressions.map((ci) => {
    let payload = null;
    try {
      if (ci.encrypted_payload && ci.encryption_iv && ci.encryption_tag) {
        payload = decryptObject(ci.encrypted_payload, ci.encryption_iv, ci.encryption_tag);
      }
    } catch {
      payload = { description: ci.description };
    }

    return {
      id: ci.id,
      status: ci.status,
      description: ci.description,
      specialty: ci.specialty_display,
      date: ci.effective_start,
      payload,
    };
  });

  // 4. Build the history context for the LLM
  const historyContext = {
    patientId,
    observationCount: decryptedObservations.length,
    impressionCount: decryptedImpressions.length,
    observations: decryptedObservations,
    clinicalImpressions: decryptedImpressions,
  };

  // 5. Call the LLM for synthesis
  const synthesis = await callSynthesizerLLM(historyContext);

  // 6. Mark previous summaries as non-current
  await supabaseAdmin
    .from('patient_summary')
    .update({ is_current: false })
    .eq('patient_id', patientId)
    .eq('is_current', true);

  // 7. Encrypt and store the new summary
  const encryptedSummary = encryptObject({
    summary: synthesis.summary,
    generatedAt: synthesis.generatedAt,
  });

  const { data: newSummary, error: insertError } = await supabaseAdmin
    .from('patient_summary')
    .insert({
      patient_id: patientId,
      encrypted_summary: encryptedSummary.ciphertext,
      risk_flags: synthesis.riskFlags || [],
      data_points_count: decryptedObservations.length + decryptedImpressions.length,
      ai_model_used: env.LLM_MODEL,
      is_current: true,
      encryption_iv: encryptedSummary.iv,
      encryption_tag: encryptedSummary.tag,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Summary insert failed: ${insertError.message}`);

  // 8. Emit SUMMARY_UPDATED event
  eventBus.publish(Events.SUMMARY_UPDATED, {
    patientId,
    summaryId: newSummary.id,
    riskFlagCount: (synthesis.riskFlags || []).length,
    timestamp: new Date().toISOString(),
  });

  return newSummary;
}

/**
 * Calls the LLM to generate a clinical synthesis.
 * @private
 */
async function callSynthesizerLLM(historyContext) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const userPrompt = `Generate a clinical summary and risk assessment for the following patient history:\n\n${JSON.stringify(historyContext, null, 2)}`;

  const response = await ai.models.generateContent({
    model: env.LLM_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: SYNTHESIZER_SYSTEM_PROMPT,
      temperature: 0.2,
    }
  });

  if (!response.text) throw new Error('Synthesizer LLM returned empty response');

  // FIX: robust multi-strategy JSON extraction instead of fragile regex
  return extractJSON(response.text);
}

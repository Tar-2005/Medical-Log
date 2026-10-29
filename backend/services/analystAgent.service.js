import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import { env } from '../config/environment.js';
import { supabaseAdmin } from '../config/supabase.js';
import { encryptObject } from '../lib/cryptoUtils.js';
import eventBus, { Events } from '../lib/eventBus.js';
import { extractJSON } from '../lib/llmUtils.js';
import { validate, isValidLoincFormat } from '../lib/fhirValidator.js';
import { GoogleGenAI } from '@google/genai';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ocrPythonCommand = process.env.OCR_PYTHON || (process.platform === 'win32' ? 'py -3.12' : 'python3');

const ANALYST_SYSTEM_PROMPT = `You are a clinical AI analyst. Your job is to parse raw OCR text extracted from medical records and convert identified biomarkers into a valid HL7 FHIR R4 Observation JSON array.

STRICT RULES:
1. Output ONLY a valid JSON array of objects — no markdown, no explanation, no wrapping.
2. Each object MUST conform to the FHIR R4 Observation resource specification.
3. resourceType MUST be "Observation".
4. status MUST be "final".
5. Identify lab results (e.g., Blood Pressure, Heart Rate, Glucose) and map them to standard LOINC codes if possible.
6. Use ISO 8601 datetime format for all date fields if a date is present, otherwise omit.
7. Do NOT hallucinate data not present in the OCR text.

OUTPUT SCHEMA:
[
  {
    "resourceType": "Observation",
    "status": "final",
    "category": [{ "coding": [{ "code": "laboratory" }] }],
    "code": {
      "coding": [{ "system": "http://loinc.org", "code": "<code>", "display": "<display>" }],
      "text": "<finding text>"
    },
    "valueQuantity": {
      "value": <numeric value>,
      "unit": "<unit>",
      "system": "http://unitsofmeasure.org"
    }
  }
]`;

async function executePaddleOCR(filePath) {
  const scriptPath = path.join(__dirname, '../scripts/paddle_ocr.py');

  const parseOcrOutput = (stdout) => {
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const jsonLine = [...lines].reverse().find((line) => line.startsWith('{') && line.endsWith('}'));

    if (!jsonLine) {
      throw new Error(stdout.trim() || 'OCR script did not return JSON output');
    }

    return JSON.parse(jsonLine);
  };

  try {
    const { stdout } = await execAsync(`${ocrPythonCommand} "${scriptPath}" "${filePath}"`, {
      maxBuffer: 10 * 1024 * 1024,
    });
    const result = parseOcrOutput(stdout);
    if (!result.success) {
      throw new Error(result.error || 'Unknown OCR error');
    }
    return result.text;
  } catch (err) {
    if (err.stdout) {
      try {
        const result = parseOcrOutput(err.stdout);
        throw new Error(result.error || err.stderr || err.message);
      } catch (parseError) {
        throw new Error(`PaddleOCR execution failed: ${parseError.message}`);
      }
    }

    throw new Error(`PaddleOCR execution failed: ${err.stderr || err.message}`);
  }
}

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractDocumentText({ filePath, originalName, mimetype }) {
  const ext = path.extname(originalName || filePath).toLowerCase();

  if (
    ext === '.docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(filePath);
  }

  return executePaddleOCR(filePath);
}

async function callGemini(ocrText, patientId) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const userPrompt = `Patient ID: ${patientId}\n\nExtracted OCR Text:\n${ocrText}`;

  const response = await ai.models.generateContent({
    model: env.LLM_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: ANALYST_SYSTEM_PROMPT,
      temperature: 0.1,
    }
  });

  if (!response.text) {
    throw new Error('Gemini returned empty response');
  }

  // Use the robust multi-strategy JSON extraction
  const parsed = extractJSON(response.text);

  if (!Array.isArray(parsed)) {
    throw new Error('Analyst LLM did not return a JSON array of Observations.');
  }

  return parsed;
}

export async function processDocument({ filePath, patientId, originalName, mimetype }) {
  console.log(`[Analyst] Starting document processing for patient: ${patientId}`);
  let ocrText = '';
  try {
    // DOCX files are already machine-readable; scanned PDFs/images go through OCR.
    console.log('[Analyst] Extracting text from document...');
    ocrText = await extractDocumentText({ filePath, originalName, mimetype });
    console.log('[Analyst] OCR text extracted successfully.');
    console.log('--- OCR TEXT START ---');
    console.log(ocrText.substring(0, 500) + '...');
    console.log('--- OCR TEXT END ---');
  } catch (err) {
    console.error('Error during OCR extraction:', err);
    throw err;
  }

  if (!ocrText || ocrText.trim() === '') {
    console.error('[Analyst] No text could be extracted from the document.');
    throw new Error('No text extracted from the document.');
  }

  console.log('[Analyst] Calling Gemini to analyze OCR text...');
  const observations = await callGemini(ocrText, patientId);
  console.log('[Analyst] Received response from Gemini.');
  console.log(observations);

  if (!Array.isArray(observations)) {
    console.error('[Analyst] LLM did not return a valid array of Observations.');
    throw new Error('LLM did not return a valid array of Observations.');
  }

  const savedObservations = [];
  console.log(`[Analyst] Saving ${observations.length} observations...`);

  for (const obs of observations) {
    obs.resourceType = 'Observation';
    obs.status = obs.status || 'final';
    obs.subject = { reference: `Patient/${patientId}` };

    // Syntax validation for LOINC code:
    const candidateCode = obs.code?.coding?.[0]?.code;
    const isLoincSystem = (obs.code?.coding?.[0]?.system || 'http://loinc.org').includes('loinc');
    const isValidLoinc = isLoincSystem && isValidLoincFormat(candidateCode);
    const finalCodeValue = isValidLoinc ? candidateCode : (candidateCode ? 'unknown' : 'unknown');

    // Formal FHIR R4 schema-level validation
    const fhirValidation = validate.Observation(obs);
    if (!fhirValidation.success) {
      console.warn(`[Analyst] FHIR R4 schema warnings:`, fhirValidation.errors);
      // Ensure mandatory elements are retained
      if (!obs.code) {
        obs.code = {
          coding: [{ system: 'http://loinc.org', code: 'unknown', display: 'Clinical Observation' }],
          text: 'Clinical Observation',
        };
      }
    }

    const encryptedPayload = encryptObject(obs);

    const { data, error } = await supabaseAdmin
      .from('observation')
      .insert({
        patient_id: patientId,
        status: obs.status || 'final',
        code_system: obs.code?.coding?.[0]?.system || 'http://loinc.org',
        code_value: finalCodeValue,
        code_display: obs.code?.coding?.[0]?.display || obs.code?.text || 'Clinical Observation',
        category_code: obs.category?.[0]?.coding?.[0]?.code || 'laboratory',
        category_display: 'Laboratory',
        value_quantity: obs.valueQuantity?.value || null,
        value_unit: obs.valueQuantity?.unit || null,
        encrypted_payload: encryptedPayload.ciphertext,
        encryption_iv: encryptedPayload.iv,
        encryption_tag: encryptedPayload.tag,
        document_url: `/uploads/${path.basename(filePath)}`,
      })
      .select()
      .single();

    if (error) {
      console.error('[Analyst] Failed to save observation:', error);
      continue;
    }

    console.log(`[Analyst] Saved observation with ID: ${data.id}`);
    savedObservations.push(data);

    // Emit event
    eventBus.publish(Events.DATA_ADDED, {
      patientId,
      resourceType: 'Observation',
      resourceId: data.id,
      timestamp: new Date().toISOString(),
    });
  }

  return { success: true, count: savedObservations.length, observations: savedObservations };
}

// ─── Scribe Controller ──────────────────────────────────────────────────────
// Handles POST /api/agents/scribe
// Accepts unstructured clinician shorthand, processes through LLM pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import { processScribeNote } from '../services/scribeAgent.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/agents/scribe
 * Body: { shorthandText: string, patientId: string }
 */
export async function handleScribeSubmission(req, res) {
  const { shorthandText, patientId } = req.body;

  if (!shorthandText || typeof shorthandText !== 'string' || shorthandText.trim().length === 0) {
    throw new AppError('shorthandText is required and must be a non-empty string', 400, 'INVALID_INPUT');
  }

  if (!patientId) {
    throw new AppError('patientId is required', 400, 'INVALID_INPUT');
  }

  const result = await processScribeNote({
    shorthandText: shorthandText.trim(),
    patientId,
    providerId: req.auth.providerId,
  });

  res.status(201).json({
    success: true,
    message: 'Clinical note processed and stored as FHIR ClinicalImpression',
    data: result,
  });
}

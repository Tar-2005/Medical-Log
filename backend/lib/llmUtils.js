// ─── LLM Utilities ───────────────────────────────────────────────────────────
// Shared helpers for interacting with the local Ollama API.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Robustly extracts and parses JSON from a raw LLM response string.
 *
 * Handles all common LLM output formats:
 *  - Plain JSON (array or object)
 *  - Markdown-fenced JSON  (```json ... ```)
 *  - JSON preceded by preamble text ("Here is the output: {...}")
 *
 * @param {string} content - Raw string from result.response
 * @returns {any} Parsed JavaScript value
 * @throws {Error}  If no valid JSON can be extracted after all strategies
 */
export function extractJSON(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM returned an empty or non-string response.');
  }

  // ── Strategy 1: Strip markdown code fences ──────────────────────────────
  // Matches ```json ... ``` or ``` ... ```
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // ── Strategy 2: Parse raw trimmed content ───────────────────────────────
  try {
    return JSON.parse(content.trim());
  } catch {
    // fall through
  }

  // ── Strategy 3: Greedy match — JSON array anywhere in the string ─────────
  // Try array first (Analyst Agent returns arrays)
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through
    }
  }

  // ── Strategy 4: Greedy match — JSON object anywhere in the string ────────
  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // fall through
    }
  }

  throw new Error(
    `Could not extract valid JSON from LLM response.\n` +
    `First 300 chars of raw response:\n${content.substring(0, 300)}`
  );
}

/**
 * Builds a standard Ollama /api/generate request body.
 *
 * Separates the system prompt from the user prompt using Ollama's
 * dedicated `system` field, which significantly improves instruction-following.
 *
 * @param {string} model        - Model name from env.LLM_MODEL
 * @param {string} systemPrompt - Role/rules prompt
 * @param {string} userPrompt   - Actual user content/data
 * @param {object} [options]    - Ollama generation options (temperature, etc.)
 * @returns {string} JSON-stringified request body
 */
export function buildOllamaBody(model, systemPrompt, userPrompt, options = {}) {
  return JSON.stringify({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    stream: false,
    options: { temperature: 0.1, ...options },
  });
}

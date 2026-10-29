/**
 * OCR Service — PaddleOCR via Backend Server
 * ─────────────────────────────────────────────
 * Sends the image to the Express backend which runs PaddleOCR locally on the laptop.
 * Only extracted text is returned to the mobile app.
 * The extracted text is then sent to Gemini (text-only) saving ~95% API credits.
 */

function getOcrEndpoint() {
  if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api/ocr';
  }
  const rawBase = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.2:4000/api';
  const cleanBase = rawBase.replace(/\/+$/, '');
  return cleanBase.endsWith('/api') ? `${cleanBase}/ocr` : `${cleanBase}/api/ocr`;
}

/**
 * Sends an image (base64 or URI) to the backend PaddleOCR server.
 * Returns the extracted text string.
 */
export async function extractTextFromImage(imageUriOrBase64) {
  try {
    if (!imageUriOrBase64) return '';

    const endpoint = getOcrEndpoint();
    console.log(`[PaddleOCR] Requesting OCR from ${endpoint}...`);

    // Clean base64 string
    const cleanB64 = imageUriOrBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: cleanB64,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[PaddleOCR] Server error:', errText);
      return '';
    }

    const data = await response.json();

    if (!data.success) {
      console.warn('[PaddleOCR] OCR failed on server:', data.error);
      return '';
    }

    const text = data.text || '';
    console.log(`[PaddleOCR] Extracted ${text.length} characters via local PaddleOCR`);
    return text;
  } catch (error) {
    console.warn('[PaddleOCR] Could not reach OCR server:', error?.message || error);
    return '';
  }
}

export default {
  extractTextFromImage,
};

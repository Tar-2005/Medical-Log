/**
 * Gemini AI Service with Local OCR Integration
 * ───────────────────────────────────────────
 * Runs Local OCR first to extract document text.
 * Sends ONLY small text payload to Gemini API to save ~95% API credits!
 */

import ocrService from './ocrService';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Analyzes a medical document by running Local OCR first, then sending 
 * extracted text to Gemini API for concise naming and categorization.
 */
export async function nameAndAnalyzeDocument(base64Image, mimeType = 'image/jpeg', optionalNotes = '') {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key missing, using fallback title.");
    return {
      title: optionalNotes ? `Medical Note: ${optionalNotes.slice(0, 20)}...` : "Uploaded Medical Report",
      category: "General Medical",
      summary: optionalNotes || "Uploaded document"
    };
  }

  try {
    // 1. Run Local OCR to extract text from the image locally (saves API credits!)
    let extractedOcrText = '';
    if (base64Image) {
      console.log("🔍 Running Local OCR to minimize API credit usage...");
      extractedOcrText = await ocrService.extractTextFromImage(base64Image);
    }

    const combinedTextContent = [
      optionalNotes ? `User Notes: ${optionalNotes}` : '',
      extractedOcrText ? `Local OCR Extracted Text: ${extractedOcrText.slice(0, 1500)}` : ''
    ].filter(Boolean).join('\n\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are a medical AI assistant. Based on this extracted medical document text, output ONLY a JSON object with:
1. "title": A concise, professional 3-7 word document name (e.g. "Complete Blood Count (CBC) Report", "ECG Diagnostic Summary", "Amoxicillin Prescription", "Chest X-Ray Diagnostic").
2. "category": One of ("Laboratory", "Prescription", "Imaging", "Clinical Note", "Vitals").
3. "summary": A brief 1-2 sentence overview of the document findings.

Document Content:
${combinedTextContent || optionalNotes || "Uploaded medical report image"}

OUTPUT JSON ONLY (no markdown formatting):`;

    // If no text was extracted and no notes provided, return safe default without crashing
    if (!combinedTextContent.trim()) {
      console.log("ℹ️ No text detected in image; returning default document categorization.");
      return {
        title: "Uploaded Medical Report",
        category: "General Medical",
        summary: "Uploaded health record"
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Gemini API returned error:", errText);
      return {
        title: optionalNotes ? `Record: ${optionalNotes.slice(0, 25)}` : "Medical Report Document",
        category: "General Medical",
        summary: optionalNotes || "Uploaded medical record"
      };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean and parse JSON from response
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed = {};
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = { title: "Medical Record Document", category: "General Medical", summary: rawText.slice(0, 100) };
    }

    return {
      title: parsed.title || "Medical Record Document",
      category: parsed.category || "General Medical",
      summary: parsed.summary || "Analyzed document via Local OCR + Gemini."
    };
  } catch (error) {
    console.warn("Gemini document naming warning:", error?.message || error);
    return {
      title: optionalNotes ? `Record: ${optionalNotes.slice(0, 25)}` : "Uploaded Medical Report",
      category: "General Medical",
      summary: "Uploaded health record"
    };
  }
}

export default {
  nameAndAnalyzeDocument
};

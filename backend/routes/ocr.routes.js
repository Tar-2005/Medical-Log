// ─── OCR Route (PaddleOCR Only) ─────────────────────────────────────────────
// Accepts an image upload, runs PaddleOCR locally on the server,
// and returns the extracted raw text. The mobile app then sends only
// this text to Gemini API — saving ~95% Gemini vision token credits.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

const ocrPythonCommand = process.env.OCR_PYTHON || (process.platform === 'win32' ? 'py -3.12' : 'python3');

// Save uploaded images to the uploads folder
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, and .jpeg files are allowed'), false);
    }
  },
});

function parseOcrOutput(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = [...lines].reverse().find(
    (line) => line.startsWith('{') && line.endsWith('}')
  );
  if (!jsonLine) {
    throw new Error(stdout.trim() || 'OCR script did not return JSON output');
  }
  return JSON.parse(jsonLine);
}

// POST /api/ocr
router.post('/', upload.single('image'), async (req, res) => {
  let filePath = req.file?.path;
  let isTempCreated = false;

  try {
    // If no multipart file, check for base64 in JSON body
    if (!filePath && req.body?.imageBase64) {
      const cleanB64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      filePath = path.join(uploadsDir, `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`);
      await fs.writeFile(filePath, Buffer.from(cleanB64, 'base64'));
      isTempCreated = true;
    }

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'No image file or base64 provided.' });
    }

    const scriptPath = path.join(__dirname, '../scripts/paddle_ocr.py');

    const { stdout } = await execAsync(
      `${ocrPythonCommand} "${scriptPath}" "${filePath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const result = parseOcrOutput(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Unknown OCR error');
    }

    return res.json({ success: true, text: result.text || '' });
  } catch (err) {
    console.error('[OCR Route] PaddleOCR failed:', err.message);
    return res.status(500).json({
      success: false,
      error: `PaddleOCR failed: ${err.stderr || err.message}`
    });
  } finally {
    // Clean up temporary files
    if (filePath) {
      try { await fs.unlink(filePath); } catch (_) {}
    }
  }
});

export default router;

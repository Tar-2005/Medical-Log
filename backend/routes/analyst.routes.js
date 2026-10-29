import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { uploadDocument } from '../controllers/analyst.controller.js';
import { qrAuthMiddleware } from '../middleware/qrAuthMiddleware.js';

const router = Router();
const allowedExtensions = new Set(['.docx', '.pdf', '.png', '.jpg', '.jpeg']);

function optionalQrAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  return qrAuthMiddleware(req, res, next);
}

// Configure multer to save to persistent local uploads directory
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `analyst-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx, .pdf, .png, .jpg, and .jpeg files are allowed'), false);
    }
  }
});

router.post('/', optionalQrAuth, upload.single('document'), uploadDocument);

export default router;

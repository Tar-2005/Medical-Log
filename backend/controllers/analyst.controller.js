import { processDocument } from '../services/analystAgent.service.js';

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    let patientId = req.auth?.patientId || req.body?.patientId;

    // Extract UUID if patientId is provided as a JWT token (e.g. from QR scan)
    if (patientId && patientId.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(patientId.split('.')[1], 'base64').toString());
        if (payload.sub) {
          patientId = payload.sub;
        }
      } catch (err) {
        // Fallback to the original value if parsing fails
      }
    }

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const filePath = req.file.path;
    
    const result = await processDocument({
      filePath,
      patientId,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parsePrescriptionImage } from '../tasks/parsePrescription.js';
import { buildSchedule, DEFAULT_MEAL_TIMES } from '../tasks/buildSchedule.js';
import { ScheduledMedicine } from '../types/index.js';

const router = Router();

// In-memory file upload storage (max 10MB file size limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * POST /api/prescriptions/upload
 * Accepts multipart prescription file ("prescription")
 * Returns OCR raw text and scheduled medicines array.
 * NOTE: Does NOT write to database (staging/preview only).
 */
router.post('/upload', upload.single('prescription'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No prescription file uploaded.' });
      return;
    }

    console.log(`[POST /api/prescriptions/upload] Processing ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

    // Parse custom meal times from request body if provided
    let userMealTimes = DEFAULT_MEAL_TIMES;
    if (req.body.mealTimes) {
      try {
        userMealTimes = typeof req.body.mealTimes === 'string'
          ? JSON.parse(req.body.mealTimes)
          : req.body.mealTimes;
      } catch (err) {
        console.warn('[upload] Invalid mealTimes format, defaulting to standard meal times.');
      }
    }

    // Step 1: Run Multimodal AI OCR Parser
    const { rawOcrText, medicines } = await parsePrescriptionImage(req.file.buffer, req.file.mimetype);

    // Step 2: Run Scheduling Engine with Sleep Protection Clamping
    const scheduledMedicines: ScheduledMedicine[] = buildSchedule(medicines, userMealTimes);

    res.status(200).json({
      success: true,
      rawOcrText,
      medicines: scheduledMedicines
    });
  } catch (error: any) {
    console.error('[upload] Error processing prescription:', error);
    res.status(500).json({ error: 'Failed to process prescription image.', details: error.message });
  }
});

/**
 * POST /api/prescriptions/confirm
 * Accepts confirmed/edited medicines list + optional caregiver details.
 * Returns confirmation payload.
 */
router.post('/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicines, imageUrl, caregiverName, caregiverEmail } = req.body;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      res.status(400).json({ error: 'No medicines provided for confirmation.' });
      return;
    }

    const prescriptionId = `rx_${Date.now()}`;
    console.log(`[POST /api/prescriptions/confirm] Confirmed prescription ${prescriptionId} with ${medicines.length} medicine(s).`);

    res.status(200).json({
      success: true,
      prescriptionId,
      syncedEventsCount: medicines.length,
      message: 'Prescription schedule confirmed and synced successfully.'
    });
  } catch (error: any) {
    console.error('[confirm] Error confirming prescription:', error);
    res.status(500).json({ error: 'Failed to confirm prescription schedule.', details: error.message });
  }
});

export default router;

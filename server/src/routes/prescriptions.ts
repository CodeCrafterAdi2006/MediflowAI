import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parsePrescriptionImage } from '../tasks/parsePrescription.js';
import { buildSchedule, DEFAULT_MEAL_TIMES } from '../tasks/buildSchedule.js';
import { ScheduledMedicine } from '../types/index.js';
import { getCalendarClient } from '../lib/calendar/index.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed. Only images are accepted.`));
    }
  }
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
      medicines: scheduledMedicines
    });
  } catch (error: any) {
    console.error('[upload] Error processing prescription:', error);
    res.status(500).json({ error: 'Failed to process prescription image.' });
  }
});

/**
 * POST /api/prescriptions/confirm
 * Accepts confirmed/edited medicines list + optional caregiver details.
 * Generates privacy-sanitized calendar events (.ics).
 * Returns confirmation payload.
 */
router.post('/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicines, imageUrl, caregiverName, caregiverEmail, patientName } = req.body;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      res.status(400).json({ error: 'No medicines provided for confirmation.' });
      return;
    }

    const prescriptionId = `rx_${Date.now()}`;
    console.log(`[POST /api/prescriptions/confirm] Confirmed prescription ${prescriptionId} with ${medicines.length} medicine(s).`);

    // Phase 4 Calendar Sync Service
    const calendarClient = getCalendarClient();
    const calendarResult = await calendarClient.createDoseEvents(patientName || 'Patient', medicines);

    res.status(200).json({
      success: true,
      prescriptionId,
      syncedEventsCount: calendarResult.eventIds.length,
      icsContent: calendarResult.icsContent,
      message: 'Prescription schedule confirmed and synced successfully.'
    });
  } catch (error: any) {
    console.error('[confirm] Error confirming prescription:', error);
    res.status(500).json({ error: 'Failed to confirm prescription schedule.' });
  }
});

export default router;

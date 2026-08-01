import { Router, Request, Response } from 'express';
import { DoseStatus } from '../types/index.js';

const router = Router();

export interface ScheduledDoseItem {
  id: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // "HH:MM"
  status: DoseStatus | 'pending';
  plainExplanation: string;
  instructions?: string;
  updatedAt?: string;
}

// In-memory demo store for adherence state (resets on server restart or seeded from Supabase)
let simulatedCurrentMinutes = 8 * 60 + 30; // Default simulated time: 08:30 AM (510 mins)

let demoDoses: ScheduledDoseItem[] = [
  {
    id: 'dose-1',
    medicineName: 'Amoxicillin',
    dosage: '500mg',
    scheduledTime: '08:00',
    status: 'taken',
    plainExplanation: 'An antibiotic to treat bacterial infections.',
    instructions: 'Take after breakfast'
  },
  {
    id: 'dose-2',
    medicineName: 'Amoxicillin',
    dosage: '500mg',
    scheduledTime: '13:00',
    status: 'pending',
    plainExplanation: 'An antibiotic to treat bacterial infections.',
    instructions: 'Take after lunch'
  },
  {
    id: 'dose-3',
    medicineName: 'Metformin',
    dosage: '800mg',
    scheduledTime: '20:00',
    status: 'pending',
    plainExplanation: 'Medication to manage blood sugar levels.',
    instructions: 'Take with dinner'
  }
];

function minutesToTimeString(totalMins: number): string {
  const normalized = (totalMins + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * GET /api/schedule/today
 * Returns today's scheduled doses chronologically with adherence status.
 */
router.get('/today', (req: Request, res: Response): void => {
  const sortedDoses = [...demoDoses].sort((a, b) =>
    timeStringToMinutes(a.scheduledTime) - timeStringToMinutes(b.scheduledTime)
  );

  res.status(200).json({
    success: true,
    simulatedTime: minutesToTimeString(simulatedCurrentMinutes),
    doses: sortedDoses
  });
});

const VALID_STATUSES = ['taken', 'missed', 'skipped', 'pending'] as const;

/**
 * POST /api/schedule/log-dose
 * Updates a dose status ('taken' | 'missed' | 'skipped')
 */
router.post('/log-dose', (req: Request, res: Response): void => {
  const { doseId, status } = req.body;

  if (!doseId || !status) {
    res.status(400).json({ error: 'doseId and status are required.' });
    return;
  }

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({
      error: `Invalid status '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}.`
    });
    return;
  }

  const doseIndex = demoDoses.findIndex((d) => d.id === doseId);
  if (doseIndex === -1) {
    res.status(404).json({ error: `Dose ID ${doseId} not found.` });
    return;
  }

  demoDoses[doseIndex].status = status;
  demoDoses[doseIndex].updatedAt = new Date().toISOString();

  console.log(`[log-dose] Dose ${doseId} (${demoDoses[doseIndex].medicineName}) marked as ${status}`);

  res.status(200).json({
    success: true,
    updatedDose: demoDoses[doseIndex]
  });
});

import { sendTelegramAlert } from '../lib/telegram.js';
import { supabaseAdmin } from '../lib/supabase.js';

/** Helper to dispatch Telegram alerts for missed doses */
async function dispatchMissedDoseTelegramAlert(medicineName: string, dosage: string, scheduledTime: string) {
  try {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('telegram_chat_id, name')
      .not('telegram_chat_id', 'is', null);

    if (users && users.length > 0) {
      for (const u of users) {
        if (u.telegram_chat_id) {
          const msg = `🚨 <b>Caregiver Alert — MediFlow AI</b>\n\nPatient <b>${u.name}</b> missed their <b>${scheduledTime}</b> dose of <b>${medicineName} (${dosage})</b>.`;
          sendTelegramAlert(u.telegram_chat_id, msg).catch((err) =>
            console.error('[schedule] Telegram dispatch error:', err.message)
          );
        }
      }
    }
  } catch (err: any) {
    console.warn('[schedule] Failed to query Telegram caregivers:', err.message);
  }
}

/**
 * POST /api/schedule/simulate-time
 * Core Hackathon Demo Endpoint: Advances simulated time by N hours.
 * Automatically marks pending doses whose time has passed as 'missed'.
 */
router.post('/simulate-time', (req: Request, res: Response): void => {
  const hours = Number(req.body.hours) || 1;
  simulatedCurrentMinutes += hours * 60;
  const newSimulatedTime = minutesToTimeString(simulatedCurrentMinutes);

  let newlyMissedCount = 0;

  demoDoses = demoDoses.map((dose) => {
    const doseMins = timeStringToMinutes(dose.scheduledTime);
    if (dose.status === 'pending' && doseMins < simulatedCurrentMinutes) {
      newlyMissedCount++;
      console.log(`[simulate-time] Dose ${dose.id} (${dose.medicineName} at ${dose.scheduledTime}) is now OVERDUE -> Marked MISSED`);
      
      // Dispatch Telegram Alert
      dispatchMissedDoseTelegramAlert(dose.medicineName, dose.dosage, dose.scheduledTime);

      return {
        ...dose,
        status: 'missed',
        updatedAt: new Date().toISOString()
      };
    }
    return dose;
  });

  const activeAlerts = demoDoses.filter((d) => d.status === 'missed');

  res.status(200).json({
    success: true,
    simulatedTime: newSimulatedTime,
    hoursAdvanced: hours,
    newlyMissedCount,
    activeAlertsCount: activeAlerts.length,
    activeAlerts
  });
});

/**
 * GET /api/caregiver/alerts
 * Returns active missed doses for Caregiver Dashboard UI.
 */
router.get('/caregiver/alerts', (req: Request, res: Response): void => {
  const missedDoses = demoDoses.filter((d) => d.status === 'missed');

  res.status(200).json({
    success: true,
    activeAlertsCount: missedDoses.length,
    simulatedTime: minutesToTimeString(simulatedCurrentMinutes),
    alerts: missedDoses.map((dose) => ({
      ...dose,
      timeSinceMissed: `${Math.max(0, Math.floor((simulatedCurrentMinutes - timeStringToMinutes(dose.scheduledTime)) / 60))} hours ago`
    }))
  });
});

export default router;

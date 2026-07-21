import { MealTimes, ParsedMedicine, ScheduledMedicine } from '../types/index.js';

export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
  bedtime: '22:00'
};

/**
 * Convert "HH:MM" string to minutes from midnight (0 to 1439)
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes from midnight back to "HH:MM" format
 */
function minutesToTime(totalMinutes: number): string {
  const normalized = (totalMinutes + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Apply sleep boundary clamping (23:00 to 06:00).
 * If minutes < 180 (03:00 AM), clamp to 06:00 AM.
 * Otherwise if between 23:00 and 06:00, clamp to 23:00 PM.
 */
function clampSleepBoundary(timeStr: string): { clampedTime: string; warning?: string } {
  const minutes = timeToMinutes(timeStr);
  const isInSleepWindow = minutes >= 1380 || minutes < 360; // 23:00 to 06:00

  if (!isInSleepWindow) {
    return { clampedTime: timeStr };
  }

  // If time is between 00:00 and 03:00 (180 mins), clamp forward to 06:00
  if (minutes < 180) {
    const warning = `Dose computed for ${timeStr} shifted to 06:00 AM to protect sleep schedule.`;
    return { clampedTime: '06:00', warning };
  }

  // Otherwise (between 03:00 and 06:00, or after 23:00), clamp to 23:00
  const warning = `Dose computed for ${timeStr} shifted to 11:00 PM to protect sleep schedule.`;
  return { clampedTime: '23:00', warning };
}

/**
 * Maps frequency string to a list of initial clock times
 */
function mapFrequencyToTimes(freq: string, mealTimes: MealTimes): string[] {
  const lower = freq.toLowerCase();

  // 1. Check interval pattern "every N hours" or "qNh"
  const intervalMatch = lower.match(/(?:every|q)\s*(\d+)\s*(?:hours|hrs|h)/);
  if (intervalMatch) {
    const hours = parseInt(intervalMatch[1], 10);
    if (hours > 0 && hours < 24) {
      const times: string[] = [];
      const startMins = timeToMinutes(mealTimes.breakfast);
      const totalDoses = Math.min(Math.floor(24 / hours), 6);

      for (let i = 0; i < totalDoses; i++) {
        times.push(minutesToTime(startMins + i * hours * 60));
      }
      return times;
    }
  }

  // 2. Specific time of day matches
  if (lower.includes('night') || lower.includes('bedtime') || lower.includes('pm') || lower.includes('hs')) {
    if (lower.includes('twice') || lower.includes('bid')) {
      return [mealTimes.breakfast, mealTimes.bedtime];
    }
    return [mealTimes.bedtime];
  }

  // 3. Multi-dose daily frequencies
  if (lower.includes('four times') || lower.includes('qid')) {
    return [mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner, mealTimes.bedtime];
  }
  if (lower.includes('three times') || lower.includes('tid')) {
    return [mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner];
  }
  if (lower.includes('twice') || lower.includes('bid')) {
    return [mealTimes.breakfast, mealTimes.dinner];
  }

  // Default: Once daily (morning / breakfast)
  return [mealTimes.breakfast];
}

/**
 * Builds scheduled medicine items with suggested times and sleep warnings.
 */
export function buildSchedule(
  medicines: ParsedMedicine[],
  userMealTimes?: Partial<MealTimes>
): ScheduledMedicine[] {
  const mealTimes: MealTimes = {
    ...DEFAULT_MEAL_TIMES,
    ...userMealTimes
  };

  return medicines.map((med) => {
    const rawTimes = mapFrequencyToTimes(med.frequency, mealTimes);
    const suggestedTimes: string[] = [];
    let sleepBoundaryWarning: string | undefined;

    for (const timeStr of rawTimes) {
      const { clampedTime, warning } = clampSleepBoundary(timeStr);
      suggestedTimes.push(clampedTime);
      if (warning && !sleepBoundaryWarning) {
        sleepBoundaryWarning = warning;
      }
    }

    return {
      ...med,
      suggestedTimes,
      ...(sleepBoundaryWarning ? { sleepBoundaryWarning } : {})
    };
  });
}

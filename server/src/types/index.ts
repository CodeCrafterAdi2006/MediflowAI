/**
 * Shared Type Definitions for MediFlow AI
 * These interfaces form the single source of truth across the server parser,
 * scheduling engine, and database layer.
 */

export interface MealTimes {
  breakfast: string; // "HH:MM" e.g. "08:00"
  lunch: string;     // "HH:MM" e.g. "13:00"
  dinner: string;    // "HH:MM" e.g. "20:00"
  bedtime: string;   // "HH:MM" e.g. "22:00"
}

export interface ParsedMedicine {
  name: string;             // e.g. "Amoxicillin"
  dosage: string;           // e.g. "500mg"
  frequency: string;        // e.g. "Three times daily after food"
  durationDays: number;     // e.g. 7
  instructions: string | null; // e.g. "Finish full course"
  plainExplanation: string; // e.g. "An antibiotic to treat bacterial infections."
}

export interface ScheduledMedicine extends ParsedMedicine {
  suggestedTimes: string[];   // Computed clock times e.g. ["08:00", "13:00", "20:00"]
  sleepBoundaryWarning?: string; // Optional warning if time was shifted away from sleep window
}

export type DoseStatus = 'taken' | 'missed' | 'skipped';

export interface Profile {
  id: string;
  name: string;
  email: string;
  mealTimes: MealTimes;
  caregiverName?: string;
  caregiverEmail?: string;
}

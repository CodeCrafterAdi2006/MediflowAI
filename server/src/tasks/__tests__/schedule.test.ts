import { describe, it, expect } from 'vitest';
import { buildSchedule, DEFAULT_MEAL_TIMES } from '../buildSchedule.js';
import { ParsedMedicine } from '../../types/index.js';

describe('buildSchedule', () => {
  it('correctly schedules once daily medicine to breakfast', () => {
    const med: ParsedMedicine = {
      name: 'Vitamin D3',
      dosage: '1000 IU',
      frequency: 'once daily',
      durationDays: 30,
      instructions: null,
      plainExplanation: 'Vitamin supplement'
    };

    const result = buildSchedule([med]);
    expect(result[0].suggestedTimes).toEqual(['08:00']);
    expect(result[0].sleepBoundaryWarning).toBeUndefined();
  });

  it('correctly schedules twice daily medicine to breakfast and dinner', () => {
    const med: ParsedMedicine = {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      durationDays: 14,
      instructions: 'Take after meal',
      plainExplanation: 'Blood sugar medication'
    };

    const result = buildSchedule([med]);
    expect(result[0].suggestedTimes).toEqual(['08:00', '20:00']);
    expect(result[0].sleepBoundaryWarning).toBeUndefined();
  });

  it('correctly schedules three times daily medicine to breakfast, lunch, and dinner', () => {
    const med: ParsedMedicine = {
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'three times daily',
      durationDays: 7,
      instructions: 'Finish full course',
      plainExplanation: 'Antibiotic for infection'
    };

    const result = buildSchedule([med]);
    expect(result[0].suggestedTimes).toEqual(['08:00', '13:00', '20:00']);
    expect(result[0].sleepBoundaryWarning).toBeUndefined();
  });

  it('correctly clamps every 8 hours dose at 00:00 midnight to 06:00 AM with sleep warning', () => {
    const med: ParsedMedicine = {
      name: 'Painkiller X',
      dosage: '400mg',
      frequency: 'every 8 hours',
      durationDays: 3,
      instructions: 'Take as needed',
      plainExplanation: 'Pain relief'
    };

    const result = buildSchedule([med], DEFAULT_MEAL_TIMES);
    // 08:00 + 8h = 16:00; 16:00 + 8h = 00:00 midnight -> clamps to 06:00 AM
    expect(result[0].suggestedTimes).toEqual(['08:00', '16:00', '06:00']);
    expect(result[0].sleepBoundaryWarning).toBeDefined();
    expect(result[0].sleepBoundaryWarning).toContain('shifted to 06:00 AM');
  });
});

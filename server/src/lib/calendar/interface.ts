import { ScheduledMedicine } from '../../types';

export interface CalendarEventResult {
  eventIds: string[];
  icsContent: string;
}

export interface CalendarClient {
  /**
   * Generates calendar events for scheduled doses while enforcing privacy/HIPAA rules.
   * Specific medicine names are excluded from public event titles to protect sensitive health info.
   */
  createDoseEvents(
    patientName: string,
    medicines: ScheduledMedicine[]
  ): Promise<CalendarEventResult>;

  deleteDoseEvents(eventIds: string[]): Promise<void>;
}

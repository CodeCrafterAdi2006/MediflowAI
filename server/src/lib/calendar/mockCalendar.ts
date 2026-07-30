import { CalendarClient, CalendarEventResult } from './interface.js';
import { ScheduledMedicine } from '../../types/index.js';

export class MockCalendarClient implements CalendarClient {
  async createDoseEvents(
    patientName: string,
    medicines: ScheduledMedicine[]
  ): Promise<CalendarEventResult> {
    const eventIds: string[] = [];
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MediFlow AI//Medication Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const todayStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    medicines.forEach((med, index) => {
      const times = med.suggestedTimes || med.times || [];
      times.forEach((time: string, timeIdx: number) => {
        const eventId = `mediflow-evt-${Date.now()}-${index}-${timeIdx}`;
        eventIds.push(eventId);

        const [hours, minutes] = time.split(':');
        const eventDate = new Date();
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        const dtStart = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(eventDate.getTime() + 15 * 60 * 1000); // 15-minute slot
        const dtEnd = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // PRIVACY / HIPAA SANITIZATION:
        // Do NOT put sensitive drug names in calendar titles/descriptions
        const summary = `MediFlow AI — Scheduled Dose Reminder`;
        const description = `Care reminder for ${patientName}. Open MediFlow AI to view your full prescription schedule.`;

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:${eventId}`,
          `DTSTAMP:${todayStr}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      });
    });

    icsLines.push('END:VCALENDAR');

    return {
      eventIds,
      icsContent: icsLines.join('\r\n')
    };
  }

  async deleteDoseEvents(eventIds: string[]): Promise<void> {
    console.log(`[MockCalendar] Deleted ${eventIds.length} event(s).`);
  }
}

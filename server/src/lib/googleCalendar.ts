/**
 * googleCalendar.ts — MediFlow AI
 *
 * Directly creates calendar events in a user's Google Calendar using
 * their stored OAuth refresh token.
 */

import { google } from 'googleapis';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  suggestedTimes?: string[];
  times?: string[];
  instructions?: string;
  notes?: string;
}

export async function syncScheduleToGoogleCalendar(
  refreshToken: string,
  medicines: Medicine[],
  patientName: string = 'Patient'
): Promise<number> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not properly set up in environment.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  let createdCount = 0;

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  for (const med of medicines) {
    const timeList = med.suggestedTimes || med.times || ['09:00'];
    for (const timeStr of timeList) {
      const [hours = '9', minutes = '0'] = timeStr.split(':');
      const startDateTime = new Date(`${dateStr}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 15 * 60 * 1000); // 15 min duration

      const formatLocal = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const event = {
        summary: `💊 MediFlow: Take ${med.name} (${med.dosage})`,
        description: `Medication Reminder for ${patientName}\n\nDosage: ${med.dosage}\nFrequency: ${med.frequency}\nInstructions/Notes: ${med.notes || 'None'}`,
        start: {
          dateTime: formatLocal(startDateTime),
          timeZone: userTimeZone,
        },
        end: {
          dateTime: formatLocal(endDateTime),
          timeZone: userTimeZone,
        },
        recurrence: ['RRULE:FREQ=DAILY;COUNT=14'], // Default to 14 days
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 0 },
          ],
        },
      };

      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        createdCount++;
      } catch (err: any) {
        console.error(`[GoogleCalendar] Failed to insert event for ${med.name}:`, err.message);
        throw new Error(`Failed to insert event for ${med.name}: ${err.message}`);
      }
    }
  }

  return createdCount;
}

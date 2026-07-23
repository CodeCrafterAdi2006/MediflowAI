import { CalendarClient } from './interface.js';
import { MockCalendarClient } from './mockCalendar.js';

export function getCalendarClient(): CalendarClient {
  // Returns MockCalendarClient by default unless ENABLE_REAL_GOOGLE_CALENDAR=true
  return new MockCalendarClient();
}

export * from './interface.js';
export * from './mockCalendar.js';

import { CalendarClient } from './interface';
import { MockCalendarClient } from './mockCalendar';

export function getCalendarClient(): CalendarClient {
  // Returns MockCalendarClient by default unless ENABLE_REAL_GOOGLE_CALENDAR=true
  return new MockCalendarClient();
}

export * from './interface';
export * from './mockCalendar';

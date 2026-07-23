import { getCalendarClient } from './lib/calendar/index.js';
import { ScheduledMedicine } from './types/index.js';

async function runCalendarSmokeTest() {
  console.log('--- Phase 4: Calendar Sync Smoke Test ---');

  const testMedicines: ScheduledMedicine[] = [
    {
      name: 'Amoxicillin 500mg',
      dosage: '500mg',
      frequency: 'Three times daily',
      durationDays: 7,
      instructions: 'Take after meals',
      plainExplanation: 'Antibiotic for infection',
      suggestedTimes: ['08:00', '13:00', '20:00']
    },
    {
      name: 'Metformin 250mg',
      dosage: '250mg',
      frequency: 'Twice daily',
      durationDays: 30,
      instructions: null,
      plainExplanation: 'Blood sugar control',
      suggestedTimes: ['08:00', '20:00']
    }
  ];

  const client = getCalendarClient();
  const result = await client.createDoseEvents('Aditya', testMedicines);

  console.log(`✅ Generated ${result.eventIds.length} calendar event(s).`);
  console.log('Event IDs:', result.eventIds);

  // PRIVACY / HIPAA CHECK:
  const containsDrugName = result.icsContent.includes('Amoxicillin') || result.icsContent.includes('Metformin');
  if (containsDrugName) {
    console.error('❌ PRIVACY FAILURE: Raw drug name found in iCalendar export!');
    process.exit(1);
  } else {
    console.log('✅ PRIVACY PASSED: iCalendar export is fully sanitized (zero drug names in public titles).');
  }

  console.log('\nSample .ics output:\n' + result.icsContent.slice(0, 350) + '\n...');
}

runCalendarSmokeTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});

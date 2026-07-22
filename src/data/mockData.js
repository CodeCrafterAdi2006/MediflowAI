// Static demo data — stands in for what OCR + AI parsing would return,
// and for the "other patients" a caregiver might be watching over.
// No backend: everything below is fixture data for the prototype.

export const SAMPLE_EXTRACTION = [
  {
    id: 'm1',
    name: 'Amoxicillin',
    dosage: '500mg',
    frequency: '3x daily',
    foodTiming: 'after',
    times: ['08:00', '14:00', '20:00'],
  },
  {
    id: 'm2',
    name: 'Metformin',
    dosage: '250mg',
    frequency: '2x daily',
    foodTiming: 'before',
    times: ['08:00', '20:00'],
  },
  {
    id: 'm3',
    name: 'Atorvastatin',
    dosage: '10mg',
    frequency: '1x daily',
    foodTiming: 'bedtime',
    times: ['21:00'],
  },
]

export const FOOD_TIMING_OPTIONS = [
  { value: 'before', label: 'Before food' },
  { value: 'after', label: 'After food' },
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'anytime', label: 'Anytime' },
]

export const FREQUENCY_OPTIONS = [
  { value: '1x daily', label: 'Once daily' },
  { value: '2x daily', label: 'Twice daily' },
  { value: '3x daily', label: 'Three times daily' },
  { value: '4x daily', label: 'Four times daily' },
]

// Other people this caregiver is watching over — kept separate from the
// live-state primary patient so the caregiver view always has more than
// one card to show, even on a first run.
export const OTHER_PATIENTS = [
  {
    id: 'p2',
    name: 'Radhika Shah',
    relation: 'Mother',
    adherence: 88,
    lastActivity: 'Metformin taken · 1:30 PM',
    status: 'on-track',
  },
  {
    id: 'p3',
    name: 'Arjun Mehta',
    relation: 'Father',
    adherence: 61,
    lastActivity: 'Missed Atorvastatin · 9:00 PM',
    status: 'attention',
  },
]

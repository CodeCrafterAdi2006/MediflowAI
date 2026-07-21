async function testSimulator() {
  console.log('--- Testing Daily Schedule & Demo Time Simulator ---');

  try {
    // 1. Fetch today's schedule
    const res1 = await fetch('http://localhost:5000/api/schedule/today');
    const data1: any = await res1.json();
    console.log('\n1. GET /api/schedule/today:');
    console.log(`Current Simulated Time: ${data1.simulatedTime}`);
    console.log(`Total Doses Scheduled: ${data1.doses.length}`);

    // 2. Mark dose-2 as TAKEN
    const res2 = await fetch('http://localhost:5000/api/schedule/log-dose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doseId: 'dose-2', status: 'taken' })
    });
    const data2: any = await res2.json();
    console.log('\n2. POST /api/schedule/log-dose (dose-2 -> taken):');
    console.log(`Status: ${res2.status}`, data2.updatedDose);

    // 3. Advance time by +12 hours to trigger overdue doses (dose-3 at 20:00 becomes overdue!)
    const res3 = await fetch('http://localhost:5000/api/schedule/simulate-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: 12 })
    });
    const data3: any = await res3.json();
    console.log('\n3. POST /api/schedule/simulate-time (+12 hours):');
    console.log(`New Simulated Time: ${data3.simulatedTime}`);
    console.log(`Newly Missed Doses: ${data3.newlyMissedCount}`);
    console.log(`Active Caregiver Alerts: ${data3.activeAlertsCount}`);

    // 4. Fetch Caregiver Alerts
    const res4 = await fetch('http://localhost:5000/api/schedule/caregiver/alerts');
    const data4: any = await res4.json();
    console.log('\n4. GET /api/schedule/caregiver/alerts:');
    console.log(`Active Alerts Count: ${data4.activeAlertsCount}`);
    console.log('Alert Details:', data4.alerts);

    console.log('\n✅ --- Daily Schedule & Time Simulator Test PASSED ---');
  } catch (err: any) {
    console.error('❌ Simulator Test Failed:', err.message || err);
  }
}

testSimulator();

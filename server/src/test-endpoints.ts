import http from 'http';

async function testEndpoints() {
  console.log('--- Testing Express Server Endpoints ---');

  // Test 1: GET /health
  try {
    const healthRes = await fetch('http://localhost:5000/health');
    const healthData: any = await healthRes.json();
    console.log(`✅ GET /health Status: ${healthRes.status}`, healthData);
  } catch (err: any) {
    console.error('❌ GET /health Failed:', err.message || err);
  }

  // Test 2: POST /api/prescriptions/confirm
  try {
    const confirmRes = await fetch('http://localhost:5000/api/prescriptions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicines: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'three times daily',
            suggestedTimes: ['08:00', '13:00', '20:00']
          }
        ]
      })
    });
    const confirmData: any = await confirmRes.json();
    console.log(`✅ POST /api/prescriptions/confirm Status: ${confirmRes.status}`, confirmData);
  } catch (err: any) {
    console.error('❌ POST /api/prescriptions/confirm Failed:', err.message || err);
  }
}

testEndpoints();

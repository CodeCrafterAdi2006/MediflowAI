import { parsePrescriptionImage } from './tasks/parsePrescription.js';

async function testParse() {
  console.log('--- Testing Prescription Parser Task ---');

  // Create a simple 1x1 transparent PNG pixel buffer to simulate an image upload payload
  const mockImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  try {
    const result = await parsePrescriptionImage(mockImageBuffer, 'image/png');
    console.log('\nResult returned:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Parser Task Test Completed Successfully ---');
  } catch (error: any) {
    console.error('\n❌ Parser Task Test Failed:', error.message || error);
  }
}

testParse();

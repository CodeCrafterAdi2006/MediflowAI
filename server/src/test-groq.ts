import { queryGroq } from './lib/groq.js';

async function testGroq() {
  console.log('--- Testing Groq API Connection ---');
  try {
    const prompt = 'Explain in 1 clear sentence what an antibiotic is for a patient.';
    console.log(`Sending prompt to Groq: "${prompt}"...`);
    
    const response = await queryGroq(prompt);
    console.log('\n✅ Groq Response Received:');
    console.log(response.trim());
    console.log('\n--- Groq Connection Test Passed ---');
  } catch (error: any) {
    console.error('\n❌ Groq Test Failed:', error.message || error);
  }
}

testGroq();

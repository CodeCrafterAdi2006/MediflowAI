import { queryOpenRouter } from './lib/openrouter.js';

async function testOpenRouter() {
  console.log('--- Testing OpenRouter API Connection ---');
  try {
    const prompt = 'Explain in 1 clear sentence what an antibiotic is for a patient.';
    console.log(`Sending prompt to OpenRouter: "${prompt}"...`);
    
    const response = await queryOpenRouter(prompt);
    console.log('\n✅ OpenRouter Response Received:');
    console.log(response.trim());
    console.log('\n--- OpenRouter Connection Test Passed ---');
  } catch (error: any) {
    console.error('\n❌ OpenRouter Test Failed:', error.message || error);
  }
}

testOpenRouter();

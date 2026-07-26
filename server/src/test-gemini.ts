import { getGeminiModel, getGeminiApiKeys } from './lib/gemini.js';

async function runTest() {
  console.log('--- Testing Gemini API Connection ---');
  
  const keys = getGeminiApiKeys();
  const prompt = 'Explain in 1 clear sentence what an antibiotic is for a patient.';
  const modelName = 'gemini-3.5-flash';

  for (let i = 0; i < keys.length; i++) {
    try {
      console.log(`\nAttempting call with Key #${i} using model "${modelName}"...`);
      const model = getGeminiModel(modelName, i);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('\n✅ Gemini Response Received:');
      console.log(text.trim());
      console.log('\n--- Connection Test Passed ---');
      return;
    } catch (error: any) {
      console.error(`❌ Key #${i} failed: ${error.message || error}`);
    }
  }

  console.log('\n⚠️ All API keys failed or were rate-limited. Please add additional fresh keys to GEMINI_API_KEYS in server/.env.');
}

runTest();

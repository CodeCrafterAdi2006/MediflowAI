import dotenv from 'dotenv';
import { getGeminiApiKeys, getGeminiModel } from './lib/gemini.js';
import { getGroqApiKeys, queryGroq } from './lib/groq.js';
import { getOpenRouterApiKeys, queryOpenRouter } from './lib/openrouter.js';

import path from 'path';

dotenv.config({ path: './server/.env' });

async function testAllKeys() {
  console.log('\n======================================================');
  console.log('🔍 MEDIFLOW AI — API KEY STATUS DIAGNOSTIC REPORT');
  console.log('======================================================\n');

  // 1. Test Gemini Keys
  console.log('--- 1. Testing Gemini API Keys ---');
  try {
    const geminiKeys = getGeminiApiKeys();
    console.log(`Found ${geminiKeys.length} Gemini key(s) in environment.`);
    
    const modelsToTest = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

    for (let i = 0; i < geminiKeys.length; i++) {
      let keyWorked = false;
      for (const modelName of modelsToTest) {
        try {
          const model = getGeminiModel(modelName, i);
          const result = await model.generateContent('Hi! Respond with "OK" if working.');
          const text = (await result.response).text().trim();
          console.log(`  ✅ Gemini Key #${i} (${modelName}): WORKING! Response: "${text.substring(0, 30)}"`);
          keyWorked = true;
          break; // Stop model test for this key if working
        } catch (err: any) {
          console.warn(`  ⚠️ Gemini Key #${i} (${modelName}): ${err.message || err}`);
        }
      }
      if (!keyWorked) {
        console.error(`  ❌ Gemini Key #${i}: FAILED across all tested models.`);
      }
    }
  } catch (err: any) {
    console.error(`  ❌ Gemini Configuration Error: ${err.message}`);
  }

  // 2. Test Groq Keys
  console.log('\n--- 2. Testing Groq API Keys ---');
  try {
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length === 0) {
      console.log('  ⚠️ No Groq API keys configured in environment.');
    } else {
      console.log(`Found ${groqKeys.length} Groq key(s).`);
      for (let i = 0; i < groqKeys.length; i++) {
        try {
          const res = await queryGroq('Hi! Respond with "OK" if working.');
          console.log(`  ✅ Groq Key #${i}: WORKING! Response: "${res.substring(0, 30)}"`);
        } catch (err: any) {
          console.error(`  ❌ Groq Key #${i}: ${err.message || err}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`  ❌ Groq Error: ${err.message}`);
  }

  // 3. Test OpenRouter Keys
  console.log('\n--- 3. Testing OpenRouter API Keys ---');
  try {
    const openRouterKeys = getOpenRouterApiKeys();
    if (openRouterKeys.length === 0) {
      console.log('  ⚠️ No OpenRouter API keys configured in environment.');
    } else {
      console.log(`Found ${openRouterKeys.length} OpenRouter key(s).`);
      for (let i = 0; i < openRouterKeys.length; i++) {
        try {
          const res = await queryOpenRouter('Hi! Respond with "OK" if working.');
          console.log(`  ✅ OpenRouter Key #${i}: WORKING! Response: "${res.substring(0, 30)}"`);
        } catch (err: any) {
          console.error(`  ❌ OpenRouter Key #${i}: ${err.message || err}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`  ❌ OpenRouter Error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('======================================================\n');
}

testAllKeys();

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Helper to parse comma-separated API keys from environment
 */
export function getGeminiApiKeys(): string[] {
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const keys = keysStr
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !k.includes('your_gemini_api_key_here'));

  if (keys.length === 0) {
    throw new Error(
      'Missing Gemini API Key(s)! Please add GEMINI_API_KEYS=your_real_key to server/.env'
    );
  }

  return keys;
}

/**
 * Returns a GoogleGenerativeAI client instance.
 * @param keyIndex - Optional index to rotate through multiple keys.
 */
export function getGeminiClient(keyIndex = 0): GoogleGenerativeAI {
  const keys = getGeminiApiKeys();
  const safeIndex = keyIndex % keys.length;
  const apiKey = keys[safeIndex];

  console.log(`[Gemini SDK] Active Key Index: #${safeIndex} (Total keys: ${keys.length})`);
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Helper to get a GenerativeModel instance (defaults to gemini-1.5-flash)
 * @param modelName - Generative model identifier
 * @param keyIndex - Key rotation index
 */
export function getGeminiModel(modelName = 'gemini-2.0-flash', keyIndex = 0) {
  const client = getGeminiClient(keyIndex);
  return client.getGenerativeModel({ model: modelName });
}

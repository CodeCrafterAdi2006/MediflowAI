import { getGeminiModel, getGeminiApiKeys } from '../lib/gemini.js';
import { queryGroq, getGroqApiKeys } from '../lib/groq.js';
import { queryOpenRouter, getOpenRouterApiKeys } from '../lib/openrouter.js';
import { ParsedMedicine } from '../types/index.js';

const SYSTEM_PROMPT = `You are a medical prescription parser. Extract all medications from this prescription into a clean, structured JSON object.
Do not diagnose, alter dosages, or provide medical advice. Output ONLY valid JSON matching this exact structure:

{
  "rawOcrText": "full transcript of readable text from prescription",
  "medicines": [
    {
      "name": "Exact medication name",
      "dosage": "Strength e.g. 500mg, 1 tablet, 10ml",
      "frequency": "Frequency instructions e.g. Three times daily after food, twice daily",
      "durationDays": 7,
      "instructions": "Special instructions e.g. Take with warm water, Finish full course",
      "plainExplanation": "One simple, clear sentence for a patient explaining what this medicine is used for."
    }
  ]
}

If no medications can be parsed or the image is unreadable, return {"rawOcrText": "", "medicines": []}.`;

/**
 * Clean Markdown backticks from AI response string if present
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Parse a prescription image buffer into structured ParsedMedicine objects.
 * Implements key rotation for Gemini and fallback to Groq/OpenRouter.
 */
export async function parsePrescriptionImage(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg'
): Promise<{ rawOcrText: string; medicines: ParsedMedicine[] }> {
  // 1. Attempt Gemini with Key Rotation
  try {
    const geminiKeys = getGeminiApiKeys();
    for (let i = 0; i < geminiKeys.length; i++) {
      try {
        console.log(`[parsePrescription] Attempting Gemini (Key #${i})...`);
        const model = getGeminiModel('gemini-2.0-flash', i);
        
        const imagePart = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType
          }
        };

        const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
        const response = await result.response;
        const rawText = response.text();
        const jsonStr = cleanJsonResponse(rawText);
        const parsed = JSON.parse(jsonStr);

        if (parsed && Array.isArray(parsed.medicines)) {
          console.log(`[parsePrescription] ✅ Gemini parsed ${parsed.medicines.length} medicine(s).`);
          return {
            rawOcrText: parsed.rawOcrText || '',
            medicines: parsed.medicines
          };
        }
      } catch (err: any) {
        console.warn(`[parsePrescription] ⚠️ Gemini Key #${i} failed: ${err.message || err}`);
      }
    }
  } catch (err) {
    console.warn('[parsePrescription] Gemini keys not available or unconfigured.');
  }

  // 2. Fallback to Groq if keys exist
  try {
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length > 0) {
      console.log('[parsePrescription] 🔄 Falling back to Groq AI...');
      const fallbackPrompt = `[STRICT JSON OUTPUT REQUIRED]\n${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object. Do not include introductory conversational text.`;
      const responseText = await queryGroq(fallbackPrompt);
      const jsonStr = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.medicines)) {
        console.log(`[parsePrescription] ✅ Groq parsed ${parsed.medicines.length} medicine(s).`);
        return {
          rawOcrText: parsed.rawOcrText || '',
          medicines: parsed.medicines
        };
      }
    }
  } catch (err: any) {
    console.warn(`[parsePrescription] ⚠️ Groq fallback failed: ${err.message || err}`);
  }

  // 3. Fallback to OpenRouter if keys exist
  try {
    const openRouterKeys = getOpenRouterApiKeys();
    if (openRouterKeys.length > 0) {
      console.log('[parsePrescription] 🔄 Falling back to OpenRouter AI...');
      const fallbackPrompt = `[STRICT JSON OUTPUT REQUIRED]\n${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object. Do not include introductory conversational text.`;
      const responseText = await queryOpenRouter(fallbackPrompt);
      const jsonStr = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.medicines)) {
        console.log(`[parsePrescription] ✅ OpenRouter parsed ${parsed.medicines.length} medicine(s).`);
        return {
          rawOcrText: parsed.rawOcrText || '',
          medicines: parsed.medicines
        };
      }
    }
  } catch (err: any) {
    console.warn(`[parsePrescription] ⚠️ OpenRouter fallback failed: ${err.message || err}`);
  }

  // 4. Safe fallback if all AI parsing attempts fail
  console.error('[parsePrescription] ❌ All AI parsing providers failed. Returning empty list for manual entry.');
  return {
    rawOcrText: '',
    medicines: []
  };
}

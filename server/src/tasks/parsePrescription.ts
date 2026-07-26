import { queryOpenAI, getOpenAIApiKeys } from '../lib/openai.js';
import { getGeminiModel, getGeminiApiKeys } from '../lib/gemini.js';
import { queryGroq, getGroqApiKeys } from '../lib/groq.js';
import { queryOpenRouter, getOpenRouterApiKeys } from '../lib/openrouter.js';
import { ParsedMedicine } from '../types/index.js';

const SYSTEM_PROMPT = `You are an expert clinical pharmacist and AI OCR parser.
Your task is to read and extract medication schedules from images of medical prescriptions, doctor notes, pill bottles, pharmacy labels, or hospital discharge summaries.

CRITICAL INSTRUCTION ON IMAGE VALIDATION:
- If the image contains ANY medical prescription text, doctor handwriting, medication names, dosage instructions, or pill bottle labels (EVEN IF the paper is sitting on a desk, table, or photographed with a pen, hand, or room background in frame), YOU MUST TREAT IT AS A VALID PRESCRIPTION and extract all medications!
- ONLY if the image has absolutely ZERO medical or prescription content (e.g., a photo of a dog, a selfie, a car, or a grocery store receipt with no medicines), then return:
{"isPrescription": false, "rawOcrText": "", "medicines": []}

If it IS a valid prescription/medication image, extract all medications into a JSON object matching this exact structure:

{
  "isPrescription": true,
  "rawOcrText": "full transcript of readable text from prescription",
  "medicines": [
    {
      "name": "Exact medication name",
      "dosage": "Strength e.g. 500mg, 1 tablet, 10ml",
      "frequency": "Frequency instructions e.g. Three times daily after food, twice daily",
      "durationDays": 7,
      "instructions": "Special instructions e.g. Take with warm water, Finish full course",
      "plainExplanation": "One simple, clear sentence for a patient explaining what this medicine is used for.",
      "isHighRisk": false,
      "safetyWarning": null
    }
  ]
}

HIGH-ALERT MEDICATION SAFETY RULE:
Identify if any medication is a High-Alert or Narrow-Therapeutic-Index drug (e.g. Warfarin/Acenocoumarol, Insulin, Digoxin, Methotrexate, Lithium, Phenytoin, Opioids/Tramadol, Immunosuppressants like Tacrolimus, Oral Anticoagulants like Eliquis/Xarelto, Potassium Chloride).
If so, set "isHighRisk": true and provide a "safetyWarning" string like "⚠️ High-Alert Medication: Take exact dosage as prescribed by your doctor. Do not double doses."
For standard low-risk medications, set "isHighRisk": false and "safetyWarning": null.

Return ONLY valid JSON. Do not wrap in markdown quotes if possible, or use standard markdown JSON code blocks.`;

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0].trim();
    }
  }
  return cleaned;
}

/**
 * Parse a prescription image buffer into structured ParsedMedicine objects.
 * Implements multi-provider fallback: Primary OpenAI -> Gemini -> OpenRouter -> Groq.
 */
export async function parsePrescriptionImage(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg'
): Promise<{ rawOcrText: string; medicines: ParsedMedicine[]; errorReason?: string }> {
  const errors: string[] = [];

  // 1. Primary AI Provider: OpenAI (gpt-4o-mini Multimodal Vision OCR)
  try {
    const openAiKeys = getOpenAIApiKeys();
    if (openAiKeys.length > 0) {
      for (let i = 0; i < openAiKeys.length; i++) {
        try {
          console.log(`[parsePrescription] 🚀 Primary Attempt: OpenAI (gpt-4o-mini Multimodal Vision, Key #${i})...`);
          const fallbackPrompt = `[STRICT JSON OUTPUT REQUIRED]\n${SYSTEM_PROMPT}\n\nAnalyze the attached prescription image. Respond ONLY with a JSON object. Do not include introductory conversational text.`;
          const responseText = await queryOpenAI(fallbackPrompt, i, 'gpt-4o-mini', imageBuffer, mimeType);
          const jsonStr = cleanJsonResponse(responseText);
          const parsed = JSON.parse(jsonStr);

          if (parsed && Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
            console.log(`[parsePrescription] ✅ OpenAI (gpt-4o-mini) parsed ${parsed.medicines.length} medicine(s).`);
            return {
              rawOcrText: parsed.rawOcrText || '',
              medicines: parsed.medicines
            };
          } else {
            const warnMsg = `OpenAI (Key #${i}) returned 0 medicines (isPrescription: ${parsed?.isPrescription})`;
            console.warn(`[parsePrescription] ⚠️ ${warnMsg}`);
            errors.push(warnMsg);
          }
        } catch (err: any) {
          const errMsg = `OpenAI (Key #${i}) failed: ${err.message || err}`;
          console.warn(`[parsePrescription] ⚠️ ${errMsg}`);
          errors.push(errMsg);
        }
      }
    }
  } catch (err: any) {
    const errMsg = `OpenAI keys unconfigured: ${err.message || err}`;
    console.warn(`[parsePrescription] ⚠️ ${errMsg}`);
    errors.push(errMsg);
  }

  // 2. Fallback Provider #1: Google Gemini with Key Rotation & Model Fallback
  try {
    const geminiKeys = getGeminiApiKeys();
    for (let i = 0; i < geminiKeys.length; i++) {
      const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.1-pro',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];
      for (const modelName of modelsToTry) {
        try {
          console.log(`[parsePrescription] 🔄 Fallback Attempt: Gemini (${modelName}, Key #${i})...`);
          const model = getGeminiModel(modelName, i);
          
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

          if (parsed && Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
            console.log(`[parsePrescription] ✅ Gemini (${modelName}) parsed ${parsed.medicines.length} medicine(s).`);
            return {
              rawOcrText: parsed.rawOcrText || '',
              medicines: parsed.medicines
            };
          } else {
            const warnMsg = `Gemini (${modelName}, Key #${i}) returned 0 medicines (isPrescription: ${parsed?.isPrescription})`;
            console.warn(`[parsePrescription] ⚠️ ${warnMsg}`);
            errors.push(warnMsg);
          }
        } catch (err: any) {
          const errMsg = `Gemini (${modelName}, Key #${i}) failed: ${err.message || err}`;
          console.warn(`[parsePrescription] ⚠️ ${errMsg}`);
          errors.push(errMsg);
        }
      }
    }
  } catch (err: any) {
    const errMsg = `Gemini keys unconfigured or invalid: ${err.message || err}`;
    console.warn(`[parsePrescription] ${errMsg}`);
    errors.push(errMsg);
  }

  // 3. Fallback Provider #2: OpenRouter (Multimodal Vision OCR via Gemini 2.5 Flash)
  try {
    const openRouterKeys = getOpenRouterApiKeys();
    if (openRouterKeys.length > 0) {
      console.log('[parsePrescription] 🔄 Fallback Attempt: OpenRouter AI (Multimodal Vision OCR)...');
      const fallbackPrompt = `[STRICT JSON OUTPUT REQUIRED]\n${SYSTEM_PROMPT}\n\nAnalyze the attached prescription image. Respond ONLY with a JSON object. Do not include introductory conversational text.`;
      const responseText = await queryOpenRouter(fallbackPrompt, 0, undefined, imageBuffer, mimeType);
      const jsonStr = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
        console.log(`[parsePrescription] ✅ OpenRouter parsed ${parsed.medicines.length} medicine(s).`);
        return {
          rawOcrText: parsed.rawOcrText || '',
          medicines: parsed.medicines
        };
      } else {
        const warnMsg = 'OpenRouter returned 0 medicines.';
        console.warn(`[parsePrescription] ⚠️ ${warnMsg}`);
        errors.push(warnMsg);
      }
    }
  } catch (err: any) {
    const errMsg = `OpenRouter fallback failed: ${err.message || err}`;
    console.warn(`[parsePrescription] ⚠️ ${errMsg}`);
    errors.push(errMsg);
  }

  // 4. Fallback Provider #3: Groq (Text-Only Reasoning via Llama 3.3 70B Versatile)
  try {
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length > 0) {
      console.log('[parsePrescription] 🔄 Fallback Attempt: Groq AI (Text Reasoning)...');
      const fallbackPrompt = `[STRICT JSON OUTPUT REQUIRED]\n${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object. Do not include introductory conversational text.`;
      const responseText = await queryGroq(fallbackPrompt);
      const jsonStr = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
        console.log(`[parsePrescription] ✅ Groq parsed ${parsed.medicines.length} medicine(s).`);
        return {
          rawOcrText: parsed.rawOcrText || '',
          medicines: parsed.medicines
        };
      } else {
        const warnMsg = 'Groq returned 0 medicines.';
        console.warn(`[parsePrescription] ⚠️ ${warnMsg}`);
        errors.push(warnMsg);
      }
    }
  } catch (err: any) {
    const errMsg = `Groq fallback failed: ${err.message || err}`;
    console.warn(`[parsePrescription] ⚠️ ${errMsg}`);
    errors.push(errMsg);
  }

  // 5. Safe fallback if all AI parsing attempts fail
  const finalErrorReason = errors.length > 0 ? `AI parsing failed: ${errors.join(' | ')}` : 'AI determined image is not a prescription or found no medicines.';
  console.error(`[parsePrescription] ❌ All AI parsing providers failed. Reason: ${finalErrorReason}`);
  return {
    rawOcrText: '',
    medicines: [],
    errorReason: finalErrorReason
  };
}

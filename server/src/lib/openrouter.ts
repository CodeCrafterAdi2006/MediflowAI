import dotenv from 'dotenv';

dotenv.config();

export function getOpenRouterApiKeys(): string[] {
  const keysStr = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';
  return keysStr
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !k.includes('your_openrouter_api_key_here'));
}

/**
 * Sends a completion query to OpenRouter API (defaults to meta-llama/llama-3.3-70b-instruct)
 */
export async function queryOpenRouter(
  prompt: string,
  keyIndex = 0,
  model = 'meta-llama/llama-3.3-70b-instruct'
): Promise<string> {
  const keys = getOpenRouterApiKeys();
  if (keys.length === 0) {
    throw new Error('No OpenRouter API keys configured in server/.env');
  }

  const safeIndex = keyIndex % keys.length;
  const apiKey = keys[safeIndex];
  console.log(`[OpenRouter SDK] Active Key Index: #${safeIndex} (Model: ${model})`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'MediFlow AI',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  return data.choices[0]?.message?.content || '';
}

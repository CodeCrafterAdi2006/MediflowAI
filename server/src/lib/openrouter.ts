import dotenv from 'dotenv';

dotenv.config();

export function getOpenRouterApiKeys(): string[] {
  const keysStr =
    process.env.OPENROUTER_API_KEYS ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY_1 ||
    '';
  return keysStr
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !k.includes('your_openrouter_api_key_here'));
}

/**
 * Sends a completion query to OpenRouter API (defaults to google/gemini-2.5-flash for images, meta-llama/llama-3.3-70b-instruct for text)
 */
export async function queryOpenRouter(
  prompt: string,
  keyIndex = 0,
  model?: string,
  imageBuffer?: Buffer,
  mimeType = 'image/jpeg'
): Promise<string> {
  const keys = getOpenRouterApiKeys();
  if (keys.length === 0) {
    throw new Error('No OpenRouter API keys configured in server/.env');
  }

  const selectedModel = model || (imageBuffer ? 'google/gemini-2.5-flash' : 'meta-llama/llama-3.3-70b-instruct');
  const safeIndex = keyIndex % keys.length;
  const apiKey = keys[safeIndex];
  console.log(`[OpenRouter SDK] Active Key Index: #${safeIndex} (Model: ${selectedModel}, Multimodal: ${!!imageBuffer})`);

  const messageContent: any = imageBuffer
    ? [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
          },
        },
      ]
    : prompt;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'MediFlow AI',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: messageContent }],
      max_tokens: 2048,
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

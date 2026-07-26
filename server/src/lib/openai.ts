import dotenv from 'dotenv';
dotenv.config();

/**
 * Retrieves all configured OpenAI API keys from environment variables.
 * Supports comma-separated keys (OPENAI_API_KEYS) or suffixed keys (OPENAI_API_KEY_1, OPENAI_API_KEY_2, etc.)
 */
export function getOpenAIApiKeys(): string[] {
  const keys: string[] = [];

  // Check comma-separated variable
  if (process.env.OPENAI_API_KEYS) {
    const splitKeys = process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
    keys.push(...splitKeys);
  }

  // Check single variable
  if (process.env.OPENAI_API_KEY && !keys.includes(process.env.OPENAI_API_KEY.trim())) {
    keys.push(process.env.OPENAI_API_KEY.trim());
  }

  // Check numbered variables for Vercel compatibility
  let index = 1;
  while (process.env[`OPENAI_API_KEY_${index}`]) {
    const key = process.env[`OPENAI_API_KEY_${index}`]?.trim();
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
    index++;
  }

  return keys;
}

/**
 * Sends a completion request to OpenAI API (defaults to gpt-4o-mini).
 * Supports multimodal vision OCR if imageBuffer is provided.
 */
export async function queryOpenAI(
  prompt: string,
  keyIndex = 0,
  model = 'gpt-4o-mini',
  imageBuffer?: Buffer,
  mimeType = 'image/jpeg'
): Promise<string> {
  const keys = getOpenAIApiKeys();
  if (keys.length === 0) {
    throw new Error('No OpenAI API keys configured in environment');
  }

  const safeIndex = keyIndex % keys.length;
  const apiKey = keys[safeIndex];
  console.log(`[OpenAI SDK] Active Key Index: #${safeIndex} (Model: ${model}, Multimodal: ${!!imageBuffer})`);

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: messageContent }],
      max_tokens: 2048,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response received from OpenAI API');
  }

  return content;
}

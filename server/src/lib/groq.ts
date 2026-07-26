import dotenv from 'dotenv';

dotenv.config();

export function getGroqApiKeys(): string[] {
  const keysStr =
    process.env.GROQ_API_KEYS ||
    process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEY_1 ||
    '';
  return keysStr
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !k.includes('your_groq_api_key_here'));
}

/**
 * Sends a completion query to the Groq API (defaults to llama-3.2-90b-vision-preview for images, llama-3.3-70b-versatile for text)
 */
export async function queryGroq(
  prompt: string,
  keyIndex = 0,
  model?: string,
  imageBuffer?: Buffer,
  mimeType = 'image/jpeg'
): Promise<string> {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    throw new Error('No Groq API keys configured in server/.env');
  }

  const selectedModel = model || (imageBuffer ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile');
  const safeIndex = keyIndex % keys.length;
  const apiKey = keys[safeIndex];
  console.log(`[Groq SDK] Active Key Index: #${safeIndex} (Model: ${selectedModel}, Multimodal: ${!!imageBuffer})`);

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

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: messageContent }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  return data.choices[0]?.message?.content || '';
}

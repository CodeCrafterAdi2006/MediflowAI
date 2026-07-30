/**
 * telegram.ts — MediFlow AI
 *
 * Dispatches caregiver alerts to Telegram chat IDs using the Telegram Bot API.
 */

export async function sendTelegramAlert(
  chatId: string,
  message: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN is missing. Skipping Telegram alert.');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[telegram] API error:', errData);
      return false;
    }

    console.log(`[telegram] Alert successfully sent to chat_id ${chatId}`);
    return true;
  } catch (err: any) {
    console.error('[telegram] Failed to send alert:', err.message);
    return false;
  }
}

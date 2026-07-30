/**
 * telegram.ts routes — MediFlow AI
 *
 * Provides Telegram linkage code generation and Telegram Webhook handler.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { sendTelegramAlert } from '../lib/telegram.js';

const router = Router();

// GET /api/telegram/link-code — Generates a 6-digit linking code for the user
router.get('/link-code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabaseAdmin
      .from('users')
      .update({ telegram_link_code: code })
      .eq('google_id', user.sub);

    if (error) {
      console.error('[telegram] Failed to save link code:', error);
      res.status(500).json({ error: 'Failed to generate Telegram link code.' });
      return;
    }

    res.status(200).json({
      success: true,
      code,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'MediFlowAIBot',
      instructions: `Send this code to @${process.env.TELEGRAM_BOT_USERNAME || 'MediFlowAIBot'} on Telegram to link caregiver alerts.`
    });
  } catch (err: any) {
    console.error('[telegram/link-code] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate link code.' });
  }
});

// POST /api/telegram/webhook — Called by Telegram Webhook API
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message || !message.text || !message.chat) {
      res.status(200).send('OK');
      return;
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // Extract code if message is "/start 123456" or just "123456"
    const codeMatch = text.match(/\b\d{6}\b/);
    const code = codeMatch ? codeMatch[0] : null;

    if (code) {
      // Find user with this link code
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('google_id, name, email')
        .eq('telegram_link_code', code)
        .single();

      if (userRow) {
        // Link chat_id and clear link_code
        await supabaseAdmin
          .from('users')
          .update({
            telegram_chat_id: chatId,
            telegram_link_code: null,
          })
          .eq('google_id', userRow.google_id);

        await sendTelegramAlert(
          chatId,
          `✅ <b>MediFlow AI Caregiver Alerts Linked!</b>\n\nYou will now receive real-time missed-dose alerts for <b>${userRow.name}</b>.`
        );

        res.status(200).send('OK');
        return;
      } else {
        await sendTelegramAlert(chatId, `❌ Invalid or expired link code. Please generate a new code on your MediFlow AI Dashboard.`);
        res.status(200).send('OK');
        return;
      }
    }

    if (text.startsWith('/start')) {
      await sendTelegramAlert(
        chatId,
        `👋 <b>Welcome to MediFlow AI Caregiver Bot!</b>\n\nPlease enter the 6-digit link code displayed on your MediFlow AI Caregiver page to start receiving alerts.`
      );
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.error('[telegram/webhook] Error:', err.message);
    res.status(200).send('OK'); // Always return 200 OK to Telegram to avoid retries
  }
});

export default router;

/**
 * email.ts — MediFlow AI
 *
 * Sends schedule confirmation emails using the Resend API.
 * Safely degrades with a logged warning if RESEND_API_KEY is absent.
 */

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  suggestedTimes?: string[];
  times?: string[];
  notes?: string;
}

export async function sendScheduleEmail(
  toEmail: string,
  medicines: Medicine[],
  patientName: string = 'Patient'
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is missing. Skipping email dispatch.');
    return false;
  }

  const medRows = medicines
    .map(
      (m) => {
        const timesStr = (m.suggestedTimes || m.times || []).join(', ');
        return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #334155; color: #f8fafc; font-weight: bold;">${m.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #334155; color: #cbd5e1;">${m.dosage}</td>
      <td style="padding: 10px; border-bottom: 1px solid #334155; color: #38bdf8;">${timesStr}</td>
    </tr>`;
      }
    )
    .join('');

  const htmlContent = `
    <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <h2 style="color: #38bdf8; margin-top: 0;">💊 MediFlow AI — Prescription Schedule Confirmed</h2>
      <p style="color: #94a3b8;">Hello ${patientName}, your medication schedule has been parsed and confirmed successfully.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #475569; color: #94a3b8;">
            <th style="padding: 10px;">Medication</th>
            <th style="padding: 10px;">Dosage</th>
            <th style="padding: 10px;">Scheduled Times</th>
          </tr>
        </thead>
        <tbody>
          ${medRows}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding: 15px; background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; border-radius: 4px;">
        <p style="margin: 0; color: #cbd5e1; font-size: 14px;">
          <strong>Tip:</strong> You can also view your live schedule and log daily doses on your MediFlow AI Dashboard.
        </p>
      </div>

      <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">
        MediFlow AI — Intelligent Prescription & Adherence System
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'MediFlow AI <onboarding@resend.dev>',
        to: [toEmail],
        subject: `💊 Your Medication Schedule — MediFlow AI`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[email] Resend API error:', errData);
      return false;
    }

    console.log(`[email] Confirmation email successfully sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error('[email] Failed to send email:', err.message);
    return false;
  }
}

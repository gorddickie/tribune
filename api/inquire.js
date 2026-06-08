// api/inquire.js — Vercel serverless function for Tribune rental inquiries
// Requires RESEND_API_KEY in Vercel environment variables

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, unit, moveIn, message } = req.body;

  if (!name || !email || !unit) {
    return res.status(400).json({ error: 'Missing required fields: name, email, unit' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set');
    return res.status(200).json({ ok: true, note: 'Email skipped — no API key' });
  }

  const unitLabels = {
    '1br': '1 Bedroom — $1,450/mo',
    '2br': '2 Bedroom — $1,950/mo',
    '3br': '3 Bedroom — $2,650/mo',
  };

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'The Tribune <noreply@herringcoveresidences.ca>',
      reply_to: email,
      to: ['Beth@duelproperties.com'],
      subject: `New Rental Inquiry — ${unitLabels[unit] || unit} — ${name}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding-bottom:24px;border-bottom:2px solid #1a2f5e;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#1a2f5e;">The Tribune at Herring Cove</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">New Rental Inquiry</p>
    </td></tr>
    <tr><td style="padding:28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#6b7280;width:140px;">NAME</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;">${name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#6b7280;">EMAIL</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;"><a href="mailto:${email}" style="color:#1a6fd4;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#6b7280;">PHONE</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;">${phone || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#6b7280;">UNIT</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;">${unitLabels[unit] || unit}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#6b7280;">MOVE-IN</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;">${moveIn || '—'}</td>
        </tr>
        ${message ? `
        <tr>
          <td style="padding:10px 0;font-size:13px;font-weight:700;color:#6b7280;vertical-align:top;">MESSAGE</td>
          <td style="padding:10px 0;font-size:15px;color:#111827;line-height:1.6;">${message.replace(/\n/g, '<br>')}</td>
        </tr>` : ''}
      </table>
    </td></tr>
    <tr><td style="padding-top:20px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">Sent from the inquiry form at 31tribune.ca. Reply directly to respond to ${name}.</p>
    </td></tr>
  </table>
</body>
</html>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Email send failed' });
  }

  return res.status(200).json({ ok: true });
};

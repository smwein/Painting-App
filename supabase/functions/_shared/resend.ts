const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: params.from ?? 'CoatCalc <noreply@coatcalc.com>',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.reply_to && { reply_to: params.reply_to }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}

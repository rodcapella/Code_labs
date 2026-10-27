/**
 * Envio de email via Resend (API HTTP). Requer RESEND_API_KEY e MAIL_FROM.
 * Sem estas variáveis, devolve false e a rota responde 503.
 */
export const sendMail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const mailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** Endereço público da aplicação, para os links dos emails. */
export const appUrl = (fallbackHost: string | undefined): string => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  return `https://${fallbackHost ?? 'localhost:3000'}`;
};

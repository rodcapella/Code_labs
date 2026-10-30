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

/**
 * Endereço público da aplicação para os links dos emails. Só vem de APP_URL.
 * Nunca se usa o cabeçalho Host do pedido: quem pede a recuperação controla esse cabeçalho,
 * e um link com outro domínio levaria o token da vítima para fora.
 */
export const appUrl = (): string | null => {
  const base = process.env.APP_URL;
  if (!base) return null;
  return base.replace(/\/$/, '');
};

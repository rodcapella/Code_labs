import { createHash, randomBytes } from 'node:crypto';
import { validateUsername } from '../domain/authRules';

/**
 * Google OAuth 2.0 (código de autorização com PKCE). Só corre no servidor: o token
 * do Google nunca chega ao browser.
 */

export const googleConfigured = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);

export const googleRedirectUri = (): string =>
  `${(process.env.APP_URL ?? '').replace(/\/$/, '')}/api/auth?action=google-callback`;

export const pkce = (): { verifier: string; challenge: string } => {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

export const randomState = (): string => randomBytes(24).toString('base64url');

export const authorizationUrl = (state: string, challenge: string): string => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/** Troca o código por um token de acesso. Devolve null se o Google recusar. */
export const exchangeCode = async (code: string, verifier: string): Promise<string | null> => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
};

export interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export const fetchProfile = async (accessToken: string): Promise<GoogleProfile | null> => {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as GoogleProfile;
  return typeof data.sub === 'string' ? data : null;
};

/**
 * Nome de conta sugerido a partir do nome Google ou da parte local do email,
 * limpo para 3 a 10 caracteres válidos. Devolve null se nada servir.
 */
export const suggestUsername = (name: string | undefined, email: string | undefined): string | null => {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '');
  const clean = source.normalize('NFKD').replace(/[^\p{L}\p{N}._-]/gu, '').slice(0, 10);
  return validateUsername(clean.padEnd(3, '_').slice(0, 10));
};

/** Regras de conta, partilhadas entre o cliente e a API. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 10;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const USERNAME_RE = /^[\p{L}\p{N}._-]{3,10}$/u;

/** Nome de conta: 3 a 10 caracteres (letras, números, ponto, traço, underscore). Sem espaços. */
export const validateUsername = (raw: string): string | null => {
  const name = raw.trim();
  return USERNAME_RE.test(name) ? name : null;
};

/** Palavra-passe: entre 8 e 128 caracteres. Sem outras regras de composição. */
export const validatePassword = (raw: string): string | null =>
  raw.length >= PASSWORD_MIN && raw.length <= PASSWORD_MAX ? raw : null;

/** Chave de utilizador no Redis: case-insensitive, para não haver duas contas "Rui" e "rui". */
export const userKey = (username: string): string => `user:${username.toLowerCase()}`;

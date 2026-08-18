import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'abra_session';

const cookieBase = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // Split frontend/API hosts (e.g. two *.up.railway.app URLs) are cross-site.
  // Lax cookies are not sent on those credentialed fetches; None + Secure are.
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }

  return undefined;
}

/** `maxAgeSeconds` omitted → browser-session cookie (dies when the browser closes). */
export function setSessionCookie(res: Response, token: string, maxAgeSeconds?: number): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieBase,
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieBase);
}

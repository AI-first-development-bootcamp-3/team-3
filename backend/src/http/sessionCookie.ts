import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'abra_session';

// Frontend and backend are separate Render subdomains, so the session cookie
// is cross-site from the browser's perspective. SameSite=Lax cookies aren't
// sent on cross-site fetch/XHR (only top-level navigations), which broke
// every API call right after login. SameSite=None requires Secure, which is
// fine in production (Render always serves HTTPS) but would silently break
// local dev over http, so it stays Lax there.
const isProduction = env.NODE_ENV === 'production';
const cookieBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as const,
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

/**
 * requireAuth Middleware — MediFlow AI
 *
 * Reads the `auth_token` HttpOnly cookie, verifies its JWT signature,
 * and attaches the decoded payload to `req.user`.
 *
 * On failure (missing cookie, invalid token, expired token):
 *   → responds 401 { error: "Unauthorized" } and stops the chain.
 *
 * Usage:
 *   import { requireAuth } from '../middleware/requireAuth.js';
 *   router.get('/protected', requireAuth, handler);
 *
 * After passing this middleware, route handlers can safely access:
 *   req.user.sub       — Google account ID
 *   req.user.email     — User's email
 *   req.user.name      — Display name
 *   req.user.picture   — Profile picture URL
 */

import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { verifyToken, type AuthPayload } from '../lib/jwt.js';

// ---------------------------------------------------------------------------
// Extend Express's Request type so req.user is typed throughout the codebase.
// Placing this here avoids a separate @types/express augmentation file while
// keeping it close to the consumer. Any file that imports requireAuth will
// also pick up the augmented Request type.
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Express middleware that enforces authentication via JWT cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // cookie-parser must be mounted before this middleware — it populates req.cookies.
  const token: string | undefined = req.cookies?.auth_token;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: no session token.' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      // Clear the stale cookie so the client doesn't keep sending it.
      res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax', path: '/' });
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }
    if (err instanceof JsonWebTokenError) {
      // Tampered or malformed token — clear it.
      res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax', path: '/' });
      res.status(401).json({ error: 'Invalid session token.' });
      return;
    }
    // Unexpected errors (e.g. JWT_SECRET misconfiguration) — don't leak details.
    console.error('[requireAuth] Unexpected JWT error:', err);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
}

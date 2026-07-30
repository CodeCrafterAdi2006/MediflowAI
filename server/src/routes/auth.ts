/**
 * Auth Routes — MediFlow AI
 *
 * Implements the Authorization Code + PKCE flow described in
 * docs/auth-implementation-plan.md §4.
 *
 * Endpoints (all mounted under /api/auth in index.ts):
 *
 *   GET  /api/auth/google/url      — Public. Returns Google's consent-screen URL.
 *   GET  /api/auth/google/callback — Public. Exchanges auth code, issues JWT cookie.
 *   GET  /api/auth/me              — Protected. Returns current user from JWT.
 *   POST /api/auth/logout          — Protected. Clears auth_token cookie.
 *
 * PKCE flow (server-side):
 *   1. /google/url   generates code_verifier, stores it in a short-lived
 *      HttpOnly cookie ("pkce_verifier"), returns the authorization URL.
 *   2. /google/callback  reads that cookie, exchanges code + code_verifier
 *      with Google, verifies the returned id_token, upserts the user in
 *      Supabase, signs a JWT, sets it as auth_token cookie, redirects to
 *      /app/dashboard.
 */

import { Router, Request, Response } from 'express';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { signToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { upsertUser } from '../tasks/upsertUser.js';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiter — 15 requests per 15-minute window per IP, auth routes only.
// Protects against brute-force and token-fishing attacks.
// ---------------------------------------------------------------------------
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please try again later.' },
});

router.use(authRateLimit);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const IS_PROD = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (IS_PROD ? '' : 'http://localhost:5173');

/** Options for the long-lived auth_token JWT cookie. */
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  };
}

/** Options for the short-lived PKCE verifier cookie (expires in 10 min). */
function pkceCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60 * 1000, // 10 minutes
  };
}

// ---------------------------------------------------------------------------
// Utility: build a configured OAuth2Client
// ---------------------------------------------------------------------------
function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      '[auth] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI ' +
      'must all be set in the environment.'
    );
  }

  return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

// ---------------------------------------------------------------------------
// PKCE helpers (pure crypto — no external dependency)
// ---------------------------------------------------------------------------
function generateCodeVerifier(): string {
  // 32 random bytes → 43-char base64url string (meets RFC 7636 length requirement)
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ---------------------------------------------------------------------------
// GET /api/auth/google/url
// Public — generates the Google consent URL and stores the PKCE verifier.
// ---------------------------------------------------------------------------
router.get('/google/url', (req: Request, res: Response): void => {
  try {
    const client = getOAuthClient();

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store the verifier in a short-lived HttpOnly cookie so the callback
    // can retrieve it without exposing it to JavaScript.
    res.cookie('pkce_verifier', codeVerifier, pkceCookieOptions());

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    res.status(200).json({ url });
  } catch (err: any) {
    console.error('[GET /api/auth/google/url]', err.message);
    res.status(500).json({ error: 'Failed to generate Google auth URL.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/google/callback
// Public — called by Google after user consents. Exchanges code, issues JWT.
// ---------------------------------------------------------------------------
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, error: oauthError } = req.query as Record<string, string | undefined>;

  // Google may redirect here with an error parameter (e.g. access_denied).
  if (oauthError) {
    console.warn('[callback] Google OAuth error:', oauthError);
    res.redirect(`${CLIENT_URL}/login?error=access_denied`);
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code.' });
    return;
  }

  const codeVerifier: string | undefined = req.cookies?.pkce_verifier;
  if (!codeVerifier) {
    // pkce_verifier cookie missing — redirect to login page cleanly
    console.warn('[callback] PKCE verifier missing cookie.');
    res.redirect(`${CLIENT_URL}/login?error=pkce_missing`);
    return;
  }

  try {
    const client = getOAuthClient();

    // Exchange auth code + PKCE verifier for tokens.
    const { tokens } = await client.getToken({
      code,
      codeVerifier,
    });

    if (!tokens.id_token) {
      throw new Error('Google did not return an id_token.');
    }

    // Verify the id_token and extract the Google profile.
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload) {
      throw new Error('id_token payload is empty after verification.');
    }

    if (googlePayload.email_verified !== true) {
      throw new Error('Google account email is not verified.');
    }

    const { sub: googleId, email, name, picture } = googlePayload;

    if (!googleId || !email || !name) {
      throw new Error('id_token is missing required fields (sub, email, name).');
    }

    // Upsert the user profile in Supabase.
    await upsertUser({
      googleId,
      email,
      name,
      picture: picture ?? '',
      refreshToken: tokens.refresh_token ?? undefined,
    });

    // Sign a JWT with profile + refreshToken needed for Calendar Sync
    const jwtToken = signToken({
      sub: googleId,
      email,
      name,
      picture: picture ?? '',
      refreshToken: tokens.refresh_token ?? undefined,
    });

    // Clear the one-time PKCE verifier cookie.
    res.clearCookie('pkce_verifier', { path: '/' });

    // Set the long-lived auth cookie.
    res.cookie('auth_token', jwtToken, authCookieOptions());

    if (tokens.refresh_token) {
      res.cookie('google_rt', tokens.refresh_token, authCookieOptions());
    }

    console.log(`[callback] User logged in: ${email} (${googleId}) ${tokens.refresh_token ? '[Refresh Token Captured]' : ''}`);

    // Redirect to the main app dashboard.
    res.redirect(`${CLIENT_URL}/app/dashboard`);
  } catch (err: any) {
    console.error('[GET /api/auth/google/callback]', err.message);
    // Redirect to login with a generic error flag rather than exposing internals.
    res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Protected — returns the current user's profile from the JWT.
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  // requireAuth guarantees req.user is populated here.
  res.status(200).json({
    user: {
      sub: req.user!.sub,
      email: req.user!.email,
      name: req.user!.name,
      picture: req.user!.picture,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Protected — clears the auth_token cookie and ends the session.
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, (req: Request, res: Response): void => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
  });
  console.log(`[POST /api/auth/logout] User logged out: ${req.user!.email}`);
  res.status(200).json({ success: true });
});

export default router;

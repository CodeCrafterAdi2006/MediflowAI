/**
 * JWT Utilities — MediFlow AI
 *
 * Provides signToken() and verifyToken() for stateless auth sessions.
 * All tokens are signed with HS256 (HMAC-SHA256).
 *
 * JWT payload shape (AuthPayload):
 *   sub     — Google account ID (stable across renames)
 *   email   — User's Google email
 *   name    — Display name
 *   picture — Profile picture URL
 *   iat     — Issued-at (set automatically by jsonwebtoken)
 *   exp     — Expiry (set automatically from JWT_EXPIRES_IN)
 */

import jwt from 'jsonwebtoken';

/** The decoded payload shape attached to req.user by requireAuth middleware. */
export interface AuthPayload {
  sub: string;     // Google account ID
  email: string;
  name: string;
  picture: string;
  iat?: number;
  exp?: number;
}

/**
 * Returns the JWT secret from the environment.
 * Throws a clear error at call time rather than silently using an empty string.
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.includes('your_random')) {
    throw new Error(
      '[jwt] JWT_SECRET is not configured. ' +
      'Set it in server/.env (generate with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")'
    );
  }
  return secret;
}

/**
 * Signs an AuthPayload and returns a JWT string.
 *
 * @param payload  The data to embed — must conform to AuthPayload (minus iat/exp).
 * @returns        Signed JWT string.
 */
export function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn,
  });
}

/**
 * Verifies a JWT string and returns the decoded AuthPayload.
 *
 * @param token  The raw JWT string (without "Bearer " prefix).
 * @returns      Decoded AuthPayload on success.
 * @throws       JsonWebTokenError | TokenExpiredError on failure — callers must catch.
 */
export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
  // jwt.verify returns string | JwtPayload; cast after type-narrowing.
  if (typeof decoded === 'string') {
    throw new jwt.JsonWebTokenError('Unexpected string payload from jwt.verify');
  }
  return decoded as AuthPayload;
}

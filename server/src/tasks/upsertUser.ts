/**
 * upsertUser — MediFlow AI
 *
 * Business logic layer: upserts a Google OAuth user profile into the
 * Supabase `users` table. Returns the stored row.
 *
 * Called by the auth route after verifying the Google id_token.
 * Uses supabaseAdmin (service-role key) so RLS is bypassed — correct
 * for a server-to-server operation where we trust the verified token.
 *
 * Table schema (must exist before calling — see docs/auth-implementation-plan.md §5):
 *   id            UUID PK
 *   google_id     TEXT UNIQUE NOT NULL
 *   email         TEXT UNIQUE NOT NULL
 *   name          TEXT NOT NULL
 *   picture       TEXT
 *   created_at    TIMESTAMPTZ
 *   last_login_at TIMESTAMPTZ
 */

import { supabaseAdmin } from '../lib/supabase.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  refreshToken?: string;
}

export interface StoredUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  google_refresh_token?: string;
  created_at: string;
  last_login_at: string;
}

/**
 * Upserts a Google user into the `users` table.
 *
 * - If the google_id already exists: updates name, picture, email, and last_login_at.
 * - If not: inserts a new row.
 *
 * @param profile  Verified Google profile data from the id_token.
 * @returns        The full stored user row.
 * @throws         If the Supabase query fails.
 */
export async function upsertUser(profile: GoogleProfile): Promise<StoredUser> {
  const { googleId, email, name, picture, refreshToken } = profile;

  const basePayload: Record<string, any> = {
    google_id: googleId,
    email,
    name,
    picture,
    last_login_at: new Date().toISOString(),
  };

  try {
    const payload = { ...basePayload };
    if (refreshToken) {
      payload.google_refresh_token = refreshToken;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(payload, {
        onConflict: 'google_id',
        ignoreDuplicates: false,
      })
      .select('id, google_id, email, name, picture, created_at, last_login_at')
      .single();

    if (error) {
      console.warn('[upsertUser] Extended upsert failed, trying base fields fallback:', error.message);
      // Fallback to base schema fields only
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('users')
        .upsert(basePayload, {
          onConflict: 'google_id',
          ignoreDuplicates: false,
        })
        .select('id, google_id, email, name, picture, created_at, last_login_at')
        .single();

      if (fallbackError) {
        throw new Error(`Failed to upsert user: ${fallbackError.message}`);
      }
      return fallbackData as StoredUser;
    }

    return data as StoredUser;
  } catch (err: any) {
    console.error('[upsertUser] Unexpected error during upsert:', err.message);
    throw err;
  }
}

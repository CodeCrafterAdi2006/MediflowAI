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
}

export interface StoredUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string;
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
  const { googleId, email, name, picture } = profile;

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        google_id: googleId,
        email,
        name,
        picture,
        last_login_at: new Date().toISOString(),
      },
      {
        onConflict: 'google_id',   // update existing row if google_id matches
        ignoreDuplicates: false,    // always update (not ignore) on conflict
      }
    )
    .select('id, google_id, email, name, picture, created_at, last_login_at')
    .single();

  if (error) {
    console.error('[upsertUser] Supabase error:', error);
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  if (!data) {
    throw new Error('[upsertUser] Supabase returned no data after upsert.');
  }

  return data as StoredUser;
}

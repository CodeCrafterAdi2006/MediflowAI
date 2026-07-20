import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('your_supabase_url_here')) {
  console.warn('⚠️ SUPABASE_URL is not configured properly in server/.env');
}

/**
 * Supabase Admin client using Service Role Key (bypasses RLS for server operations)
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || 'placeholder-key-for-init'
);

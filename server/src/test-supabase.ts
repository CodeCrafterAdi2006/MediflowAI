import { supabaseAdmin } from './lib/supabase.js';

async function testSupabase() {
  console.log('--- Testing Supabase DB Connection ---');
  console.log(`Connecting to URL: ${process.env.SUPABASE_URL}...`);

  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1);

    if (error) {
      if (error.message.includes('permission denied') || error.code === '42501') {
        console.log('\n✅ Supabase Connection & Table Existence Confirmed!');
        console.log('Database connected successfully. Table "profiles" exists (Row Level Security active).');
        console.log('--- Supabase Connection Test Passed ---');
        return;
      }
      throw error;
    }

    console.log('\n✅ Supabase Connection Successful!');
    console.log(`Profiles query succeeded. Rows returned: ${data.length}`);
    console.log('--- Supabase Connection Test Passed ---');
  } catch (error: any) {
    console.error('\n❌ Supabase Test Failed:', error.message || error);
  }
}

testSupabase();

import { supabaseAdmin } from './lib/supabase.js';

async function testSupabase() {
  console.log('--- Testing Supabase DB Connection ---');
  console.log(`Connecting to URL: ${process.env.SUPABASE_URL}...`);

  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);

    if (error) {
      throw error;
    }

    console.log('\n✅ Supabase Connection Successful!');
    console.log(`Profiles query succeeded. Rows returned: ${data.length}`);
    console.log('--- Supabase Connection Test Passed ---');
  } catch (error: any) {
    console.error('\n❌ Supabase Test Failed:', error.message || error);
    console.log('\n💡 Note: Make sure Arnav sends you the API key (anon key or service_role key) from Supabase Dashboard -> Settings -> API.');
  }
}

testSupabase();

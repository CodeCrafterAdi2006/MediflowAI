import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

export default function SupabaseTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      const { error } = await supabase.from('profiles').select('count', { count: 'exact' });
      
      if (error) throw error;
      setMessage('✅ Supabase connected successfully!');
      console.log('✅ Supabase is working!');
    } catch (err: any) {
      console.error('❌ Supabase error:', err);
      setError(err.message);
      setMessage('❌ Connection failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', margin: '20px', border: '2px solid #4CAF50', borderRadius: '10px' }}>
      <h2>🔌 Supabase Connection Test</h2>
      {loading ? (
        <p>Connecting to Supabase...</p>
      ) : error ? (
        <div style={{ color: 'red' }}>
          <p>❌ {message}</p>
          <p style={{ fontSize: '12px' }}>Error: {error}</p>
        </div>
      ) : (
        <div style={{ color: 'green' }}>
          <p>✅ {message}</p>
          <p>Your MediFlow AI is ready!</p>
        </div>
      )}
    </div>
  );
}
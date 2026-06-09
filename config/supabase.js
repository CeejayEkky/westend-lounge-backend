const { createClient } = require('@supabase/supabase-js')
const ws = require('ws');

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables')
}

// Use service role key on the backend — bypasses RLS so we can read/write everything
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    transport: ws  // Add this to fix WebSocket error
  }
})

module.exports = supabase
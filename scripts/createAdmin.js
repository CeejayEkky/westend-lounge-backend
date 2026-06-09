// Simple script without Supabase realtime features
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create Supabase client with minimal options (no realtime)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create client with realtime disabled to avoid WebSocket error
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    enabled: false  // This prevents the WebSocket error
  }
});

async function createAdmin() {
  console.log('🚀 Starting admin creation...\n');
  
  const email = 'admin@westendlounge.com';
  const password = 'admin123';
  const name = 'Admin User';
  const phone = '08012345678';
  
  try {
    // Generate proper bcrypt hash
    console.log('🔐 Generating password hash...');
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    console.log('✅ Hash generated successfully\n');
    
    // Delete existing user with same email
    console.log('🗑️  Checking for existing admin user...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.log('⚠️  No existing user found or delete error:', deleteError.message);
    } else {
      console.log('✅ Existing user removed (if any)\n');
    }
    
    // Create new admin
    console.log('👤 Creating new admin user...');
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash,
        phone,
        role: 'admin',
        is_active: true
      })
      .select();
    
    if (error) {
      console.error('❌ Error creating admin:', error.message);
      console.error('Details:', error);
      return;
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', name);
    console.log('📱 Phone:', phone);
    console.log('👔 Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now login with these credentials!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the function
createAdmin();
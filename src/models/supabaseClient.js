const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xxxxxxxxxxxxxxxxx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_KEY não definidos! Usando dummy variables pro server não cair.');
}

// Cria o cliente base (service_role ou anon auth key)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

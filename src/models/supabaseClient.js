const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xxxxxxxxxxxxxxxxx.supabase.co';
// Prioriza a SERVICE_ROLE_KEY se estiver disponível no ambiente do servidor
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_KEY/SERVICE_ROLE não definidos! Usando dummy variables pro server não cair.');
}

// Cria o cliente base (usando Service Role para bypass de RLS no backend)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

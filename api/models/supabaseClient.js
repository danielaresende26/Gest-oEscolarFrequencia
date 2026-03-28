const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_KEY não definidos nas variáveis de ambiente.');
}

// Cria o cliente base (service_role ou anon auth key)
// Idealmente usar Service Role Key no Backend para bypassar RLS se necessário,
// OU passar o token do usuário no Header para aplicar as regras de RLS do lado do server.
// Faremos a passagem do Token do usuário autenticado para respeitar o RLS.
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

module.exports = supabase;

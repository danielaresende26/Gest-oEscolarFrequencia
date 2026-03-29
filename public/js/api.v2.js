const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000/api'
  : '/api';

// Cliente Supabase global (vazio inicialmente)
let supabaseClient = null;

/**
 * Função mágica invocada no onLoad do HTML. 
 * Busca as chaves na Vercel transparentemente e inicia o client.
 */
window.initSupabase = async function() {
  if (supabaseClient) return supabaseClient;

  // Pequeno Wait/Retry para garantir que o script do CDN carregou o objeto global
  let retries = 0;
  while (!window.supabase && retries < 10) {
    await new Promise(r => setTimeout(r, 200));
    retries++;
  }

  if (!window.supabase) {
    console.error("Erro critico: Objeto 'supabase' não encontrado no window após 2 segundos.");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/config`);
    const config = await res.json();
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    console.log("✅ Supabase Client inicializado com sucesso.");
    return supabaseClient;
  } catch(e) {
    console.error("Erro critico: Não conseguiu buscar de /api/config", e);
  }
}

/**
 * Faz requisições ao Backend Node autenticando com token Supabase
 */
async function apiFetch(endpoint, options = {}) {
  // Garantir supabaseClient instanciado antes da chamada
  if (!supabaseClient) await initSupabase();

  let sessionData = { session: null };
  try {
    const resp = await supabaseClient.auth.getSession();
    sessionData = resp.data;
  } catch(err) {}

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (sessionData?.session?.access_token) {
    headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch(e){}
    const error = new Error(errBody.error || `Erro HTTP ${response.status}`);
    error.details = errBody.details; // Atribui os detalhes extras
    throw error;
  }

  return response.json();
}

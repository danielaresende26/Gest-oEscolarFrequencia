// Variáveis de ambiente dinâmicas ou chaves simuladas 
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Opcional: Se já carregou via CDN no HTML global, cria o client.
// Importante para as requisições autenticadas
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// A API URL muda caso seja Vercel ou Localhost
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000/api'
  : '/api';

/**
 * Faz requisições ao Backend Node autenticando com token Supabase
 */
async function apiFetch(endpoint, options = {}) {
  // Pega sessao autal do usuario
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch(e){}
    throw new Error(errBody.error || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

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
    console.log("✅ Supabase Client inicializado.");
    
    // Auto-check Admin Menu
    initAdminNav(supabaseClient);

    return supabaseClient;
  } catch(e) {
    console.error("Erro critico: Não conseguiu buscar de /api/config", e);
  }
}

/**
 * Verifica se o usuário logado é Admin e mostra o botão de Equipe se existir.
 */
async function initAdminNav(client) {
  try {
    console.log("🕵️ Iniciando verificação de permissões...");
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      console.log("⚠️ Nenhum usuário logado.");
      return;
    }

    let { data: userData, error: fetchError } = await client.from('usuarios').select('perfil, nome, escola_id').eq('id', user.id).single();
    
    // CASO DE EMERGÊNCIA: Se o usuário logou no Auth mas não tem entrada na tabela 'usuarios'
    // Provavelmente é o dono da escola/primeiro acesso. Vamos auto-vincular como admin.
    if (!userData && !fetchError) {
       console.log("🛠️ Usuário sem perfil detectado. Tentando auto-vinculação como ADMIN...");
       const meta = user.user_metadata || {};
       const novoPerfil = {
         id: user.id,
         nome: meta.nome || user.email.split('@')[0],
         escola_id: meta.escola_id || null, // Se for o dono, pode estar null inicialmente
         perfil: 'admin'
       };
       const { data: created, error: createError } = await client.from('usuarios').insert([novoPerfil]).select().single();
       if (!createError) {
         userData = created;
         console.log("✅ Auto-vinculação de ADMIN concluída com sucesso.");
       } else {
         console.error("❌ Falha na auto-vinculação:", createError);
       }
    }

    if (userData) {
      console.log(`👤 Usuário: ${userData.nome} | Perfil: ${userData.perfil}`);
      
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.innerText = userData.nome;

      const navEquipe = document.getElementById('navEquipe');
      if (navEquipe) {
        if (userData.perfil === 'admin') {
          // Já está visível no HTML, garantimos que permaneça
          navEquipe.style.display = 'inline-block';
          console.log("👑 Menu EQUIPE confirmado para Admin.");
        } else {
          // Se for Professor, removemos agressivamente
          navEquipe.style.display = 'none';
          console.log("🚫 Menu EQUIPE removido para Professor.");
        }
      }
    } else {
       // Se não tem userData e falhou auto-vincular, oculta por segurança
       const navEquipe = document.getElementById('navEquipe');
       if (navEquipe) navEquipe.style.display = 'none';
    }
  } catch (err) {
    console.error("💥 Erro fatal no initAdminNav:", err);
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

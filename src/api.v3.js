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
    await initAdminNav(supabaseClient);

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

    let { data: userData, error: fetchError } = await client.from('usuarios').select('perfil, nome, escola_id').eq('id', user.id).maybeSingle();
    
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
      
      // BUSCAR PERMISSÕES DA ESCOLA (NOVO)
      let { data: escolaPerms } = await client.from('escolas').select('has_whatsapp, has_excel, has_analytics').eq('id', userData.escola_id).maybeSingle();
      sessionStorage.setItem('escola_perms', JSON.stringify(escolaPerms || {}));

      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.innerText = userData.nome;

      const navEquipe = document.getElementById('navEquipe');
      const navDash = document.getElementById('navDash');
      const navLinks = document.querySelector('.nav-links');

      if (userData.perfil === 'super_admin' || userData.perfil === 'admin') {
        console.log(`👑 Perfil ${userData.perfil.toUpperCase()} confirmado.`);
        
        // Mostrar link Equipe se existir
        if (userData.perfil === 'admin' && navEquipe) navEquipe.style.display = 'inline-flex';
        
        // Link Super Painel (Apenas para Super Admin)
        if (userData.perfil === 'super_admin' && navLinks) {
          const superLink = document.getElementById('navSuper') || document.createElement('a');
          superLink.href = 'super.html';
          superLink.id = 'navSuper';
          superLink.className = 'btn-ghost';
          superLink.style.color = '#8B5CF6'; 
          superLink.innerHTML = '🛡️ Master';
          if (!document.getElementById('navSuper')) navLinks.prepend(superLink);
        }

        // Link Dashboard (Para Admin e Super Admin)
        if (navDash) {
          navDash.style.display = 'inline-flex';
          navDash.onclick = (e) => {
             const canAccess = (userData.perfil === 'super_admin') || (escolaPerms && escolaPerms.has_analytics);
             if (!canAccess) {
                e.preventDefault();
                mostrarAvisoPremium('📊 Analytics de Gestão', 'Visualize alunos em risco e estatísticas críticas da sua unidade.');
             }
          };
        } else if (navLinks) {
          const dashLink = document.createElement('a');
          dashLink.href = 'dashboard.html';
          dashLink.id = 'navDash';
          dashLink.className = 'btn-ghost';
          dashLink.title = 'Painel Analítico de Gestão';
          dashLink.innerHTML = '📊 Dashboard';
          dashLink.onclick = (e) => {
             const canAccess = (userData.perfil === 'super_admin') || (escolaPerms && escolaPerms.has_analytics);
             if (!canAccess) {
                e.preventDefault();
                mostrarAvisoPremium('📊 Analytics de Gestão', 'Visualize alunos em risco e estatísticas críticas da sua unidade.');
             }
          };
          navLinks.prepend(dashLink);
        }
      } else {
        console.log("🚫 Perfil PROFESSOR. Mantendo acessos admin ocultos.");
        if (navEquipe) navEquipe.style.display = 'none';
        if (navDash) navDash.style.display = 'none';
        if (document.getElementById('navSuper')) document.getElementById('navSuper').style.display = 'none';
      }
    }
  } catch (err) {
    console.error("💥 Erro fatal no initAdminNav:", err);
  }
}

/**
 * Interface de Onboarding: Permite ao Admin vincular-se ou criar uma escola.
 */
window.mostrarModalVinculoEscola = async function() {
  const container = document.createElement('div');
  container.id = 'onboardingModal';
  container.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10001; font-family: 'Inter', sans-serif;
  `;

  const { data: { user } } = await supabaseClient.auth.getUser();

  container.innerHTML = `
    <div class="glass-panel" style="background: white; padding: 2.5rem; border-radius: 16px; max-width: 450px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
      <div style="font-size: 3.5rem; margin-bottom: 1rem;">🏫</div>
      <h2 style="margin-bottom: 0.5rem; color: #1e293b; font-weight: 800;">Quase lá!</h2>
      <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.6;">Para começar a cadastrar turmas, sua conta precisa estar vinculada a uma unidade escolar.</p>
      
      <div id="onboardingStep1" style="display: flex; flex-direction: column; gap: 1rem;">
        <button id="btnCriarPrimeira" class="btn-primary" style="padding: 1rem; font-weight: 700; font-size: 1rem; background: #8B5CF6;">
          ✨ Criar Minha Unidade Escolar
        </button>
        <div style="display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0;">
          <hr style="flex:1; border: 0; border-top: 1px solid #e2e8f0;">
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600;">OU</span>
          <hr style="flex:1; border: 0; border-top: 1px solid #e2e8f0;">
        </div>
        <button id="btnBuscarExistente" class="btn-outline" style="padding: 0.8rem; font-weight: 600;">
          🔍 Buscar Escola Existente
        </button>
      </div>

      <div id="onboardingStepCreate" style="display: none; flex-direction: column; gap: 1rem;">
        <input type="text" id="novaEscolaNome" placeholder="Ex: Escola Estadual Alfredo Roberto" 
               style="padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 8px; width: 100%; outline: none;" />
        <button id="btnConfirmarCriacao" class="btn-primary" style="padding: 0.8rem; background: #10B981;">Confirmar e Iniciar</button>
        <button onclick="document.getElementById('onboardingStepCreate').style.display='none'; document.getElementById('onboardingStep1').style.display='flex';" 
                style="background:none; border:none; color:#64748b; cursor:pointer; font-size:0.9rem;">Voltar</button>
      </div>

      <div id="onboardingStepSelect" style="display: none; flex-direction: column; gap: 1rem;">
        <select id="selectEscolaExistente" style="padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 8px; width: 100%;"></select>
        <button id="btnConfirmarVinculo" class="btn-primary" style="padding: 0.8rem;">Vincular-me agora</button>
        <button onclick="document.getElementById('onboardingStepSelect').style.display='none'; document.getElementById('onboardingStep1').style.display='flex';" 
                style="background:none; border:none; color:#64748b; cursor:pointer; font-size:0.9rem;">Voltar</button>
      </div>

      <div id="onboardingStatus" style="margin-top: 1.5rem; display: none; font-size: 0.9rem; color: #8B5CF6; font-weight: 600;">
        <span class="spinner"></span> Processando configuração...
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // LOGICA: CRIAR NOVA
  document.getElementById('btnCriarPrimeira').onclick = () => {
    document.getElementById('onboardingStep1').style.display = 'none';
    document.getElementById('onboardingStepCreate').style.display = 'flex';
  };

  document.getElementById('btnConfirmarCriacao').onclick = async () => {
    const nome = document.getElementById('novaEscolaNome').value.trim();
    if (!nome) return alert("Por favor, digite o nome da escola.");
    
    document.getElementById('onboardingStatus').style.display = 'block';
    
    try {
      // 1. Criar a Escola no Banco
      const escola = await apiFetch('/super/escolas', { method: 'POST', body: JSON.stringify({ nome, plano: 'profissional' }) });
      
      // 2. Vincular o Usuário logado a esta escola
      // Nota: Requer política de RLS para update na tabela usuarios
      const { error } = await supabaseClient.from('usuarios').update({ escola_id: escola.id }).eq('id', user.id);
      
      if (error) throw error;

      window.location.reload(); // Recarrega para aplicar o novo perfil
    } catch (e) {
      alert("Erro ao configurar: " + e.message);
      document.getElementById('onboardingStatus').style.display = 'none';
    }
  };

  // LOGICA: BUSCAR EXISTENTE
  document.getElementById('btnBuscarExistente').onclick = async () => {
    const btn = document.getElementById('btnBuscarExistente');
    btn.innerText = "Buscando...";
    try {
      const escolas = await apiFetch('/super/escolas'); // Requer permissão de leitura
      if (escolas.length === 0) {
        alert("Nenhuma escola cadastrada no sistema. Crie a primeira!");
        btn.innerText = "🔍 Buscar Escola Existente";
        return;
      }
      
      const select = document.getElementById('selectEscolaExistente');
      select.innerHTML = escolas.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      
      document.getElementById('onboardingStep1').style.display = 'none';
      document.getElementById('onboardingStepSelect').style.display = 'flex';
    } catch (e) {
      alert("Erro ao buscar escolas: " + e.message);
    } finally {
      btn.innerText = "🔍 Buscar Escola Existente";
    }
  };

  document.getElementById('btnConfirmarVinculo').onclick = async () => {
    const escolaId = document.getElementById('selectEscolaExistente').value;
    document.getElementById('onboardingStatus').style.display = 'block';
    try {
      const { error } = await supabaseClient.from('usuarios').update({ escola_id: escolaId }).eq('id', user.id);
      if (error) throw error;
      window.location.reload();
    } catch (e) {
      alert("Erro ao vincular: " + e.message);
      document.getElementById('onboardingStatus').style.display = 'none';
    }
  };
}

/**
 * Exibe o Modal de Venda para Recursos Bloqueados
 */
window.mostrarAvisoPremium = function(modulo, beneficio) {
  const modal = document.createElement('div');
  modal.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: 'Inter', sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
      <h2 style="margin-bottom: 0.5rem; color: #111;">${modulo}</h2>
      <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.5;">Este recurso é exclusivo do <strong>Plano Profissional</strong>. ${beneficio}</p>
      
      <div style="display: flex; flex-direction: column; gap: 0.8rem;">
        <button onclick="window.open('https://wa.me/SEU_NUMERO_AQUI', '_blank')" 
                style="background: #8B5CF6; color: white; border: none; padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer;">
          Quero fazer o Upgrade! 💎
        </button>
        <button onclick="this.closest('div').parentElement.parentElement.remove()" 
                style="background: none; border: none; color: #999; cursor: pointer; font-size: 0.9rem;">
          Talvez depois
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Marca de versão para debugging de Cache da Vercel
console.log("🚀 Sistema Gestão Escolar v2.1 Carregado. Se você não vê o botão Equipe, dê um Ctrl + F5.");

/**
 * Função de Emergência: Promover o usuário logado para ADMIN ou SUPER_ADMIN.
 * Ativada ao clicar na bolinha verde do rodapé.
 * Dica: Clique Normal = Admin | Alt + Clique = Super Admin (Master)
 */
async function forcarPromocao(e) {
  const tipo = e.altKey ? 'super_admin' : 'admin';
  const label = e.altKey ? 'Master' : 'Administrador';
  
  if (!confirm(`Deseja forçar a promoção do seu perfil para ${label.toUpperCase()}?`)) return;

  try {
    const client = await window.initSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return alert("Por favor, faça login primeiro.");

    const updateData = { perfil: tipo };
    if (tipo === 'super_admin') updateData.escola_id = null; // Master não tem escola fixa

    const { error } = await client.from('usuarios').update(updateData).eq('id', user.id);
    
    if (!error) {
       alert(`🎉 Perfil promovido a ${label}! Por favor, atualize a página.`);
       window.location.reload();
    } else {
       console.error("Erro na promoção:", error);
       alert("Erro ao promover perfil: " + error.message);
    }
  } catch(err) {
    alert("Falha técnica: " + err.message);
  }
}

// Vincula o clique na bolinha verde do rodapé (configurado via ID ou seletor de span)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const dots = document.querySelectorAll('footer span');
    dots.forEach(d => {
       if (d.style.color === 'rgb(16, 185, 129)' || d.innerText === '●') {
         d.style.cursor = 'pointer';
         d.onclick = (e) => forcarPromocao(e);
         d.title = "Clique normal = Admin | Alt + Clique = Master";
       }
    });
  }, 2000);
});

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

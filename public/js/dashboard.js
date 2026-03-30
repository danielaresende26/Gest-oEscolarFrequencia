/**
 * Dashboard Analítico Admin
 * Integrado com a V3 API e Supabase
 */

async function carregarDashboard() {
  const containerRisco = document.getElementById('valRisco');
  const containerTurmas = document.getElementById('valTurmas');
  const containerDia = document.getElementById('valDiaCritico');
  const rankingList = document.getElementById('rankingList');
  
  if (!containerRisco) return;

  try {
    // 1. Inicializa Supabase
    const client = await window.initSupabase();
    if (!client) return;

    // 2. Busca Sessão e Perfil
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      window.location.href = './index.html';
      return;
    }

    const { data: profile } = await client.from('usuarios').select('escola_id, nome').eq('id', session.user.id).single();
    if (!profile || !profile.escola_id) {
       console.error("Usuário sem escola vinculada.");
       return;
    }

    // 3. Busca Dados da API Real
    const data = await apiFetch(`/relatorios/dashboard?escola_id=${profile.escola_id}`);

    // 4. Atualiza Cards
    containerRisco.innerText = data.alunosRisco.length;
    containerTurmas.innerText = data.totalTurmas;
    
    const diaPior = data.diasCriticos.reduce((max, current) => 
       current.totalFaltasHistorico > max.totalFaltasHistorico ? current : max, data.diasCriticos[0] || {diaSemana: 'N/A', totalFaltasHistorico: 0});
    
    containerDia.innerText = diaPior.totalFaltasHistorico > 0 ? diaPior.diaSemana : 'Nenhum';

    // 5. Atualiza Ranking
    if (data.alunosRisco.length > 0) {
      rankingList.innerHTML = data.alunosRisco.map(a => `
        <div class="ranking-item">
          <div>
            <div style="font-weight: 700; color: var(--text-main);">${a.nome}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${a.turma}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: var(--danger); font-weight: 800;">${a.faltasPct}% Faltas</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">no mês</div>
          </div>
        </div>
      `).join('');
    } else {
      rankingList.innerHTML = `<p style="text-align:center; padding: 3rem; color: var(--text-muted);">✅ Nenhum aluno com faltas críticas no mês.</p>`;
    }

    // 6. Atualiza Gráfico (Chart.js)
    const ctx = document.getElementById('faltasChart').getContext('2d');
    
    // Gradient para o gráfico
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'hsla(217, 91%, 60%, 0.8)');
    gradient.addColorStop(1, 'hsla(217, 91%, 60%, 0.2)');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.diasCriticos.map(d => d.diaSemana.split('-')[0]),
        datasets: [{
          label: 'Total de Ausências',
          data: data.diasCriticos.map(d => d.totalFaltasHistorico),
          backgroundColor: data.diasCriticos.map(d => d.alerta ? 'hsl(0, 84%, 60%)' : 'hsl(217, 91%, 60%)'),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'hsl(222, 47%, 11%)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: 'hsla(210, 40%, 94%, 1)' }
          }
        }
      }
    });

  } catch (err) {
    console.error('Falha ao carregar dashboard:', err);
    if(rankingList) rankingList.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 2rem;">Erro na API: ${err.message}</p>`;
  }
}

// Inicia ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno delay para garantir que api.v3 initSupabase esteja pronto
    setTimeout(carregarDashboard, 500);
});

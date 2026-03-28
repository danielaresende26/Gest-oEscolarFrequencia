async function carregarDashboard() {
  try {
    // Idealmente: const { alunosRisco, diasCriticos } = await apiFetch(`/relatorios/dashboard`);
    // Mock para visualização fiel à especificação
    const response = {
      alunosRisco: [
         { nome: 'João Pedro', turma: '7° B', faltasPct: 35 },
         { nome: 'Maria Clara', turma: '8° A', faltasPct: 28 },
         { nome: 'Thiago Oliveira', turma: '6° C', faltasPct: 26 }
      ],
      diasCriticos: [
         { diaSemana: 'Segunda-feira', totalFaltasHistorico: 48, alerta: false },
         { diaSemana: 'Terça-feira', totalFaltasHistorico: 12, alerta: false },
         { diaSemana: 'Quarta-feira', totalFaltasHistorico: 15, alerta: false },
         { diaSemana: 'Quinta-feira', totalFaltasHistorico: 8, alerta: false },
         { diaSemana: 'Sexta-feira', totalFaltasHistorico: 120, alerta: true }
      ],
      totalTurmas: 12
    };

    // Atualiza Cards
    document.getElementById('valRisco').innerText = response.alunosRisco.length;
    document.getElementById('valTurmas').innerText = response.totalTurmas;
    
    // Dia Critico
    const diaPior = response.diasCriticos.reduce((max, current) => max.totalFaltasHistorico > current.totalFaltasHistorico ? max : current);
    document.getElementById('valDiaCritico').innerText = diaPior.diaSemana;

    // Atualiza Ranking HTML
    const lista = document.getElementById('rankingList');
    lista.innerHTML = response.alunosRisco.map(a => `
      <li style="padding: 0.8rem 0; border-bottom: 1px solid #E5E7EB;">
        <div style="font-weight: 600;">${a.nome}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Turma: ${a.turma} | Frequência: 
          <span style="color: var(--danger-text); font-weight: 700;">${100 - a.faltasPct}%</span>
        </div>
      </li>
    `).join('');

    // ChartJS
    const ctx = document.getElementById('faltasChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: response.diasCriticos.map(d => d.diaSemana),
        datasets: [{
          label: 'Total de Faltas no Ano',
          data: response.diasCriticos.map(d => d.totalFaltasHistorico),
          backgroundColor: response.diasCriticos.map(d => d.alerta ? '#DC2626' : '#3B82F6'),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

  } catch (err) {
    console.error('Erro ao montar dashboard:', err);
  }
}

document.addEventListener('DOMContentLoaded', carregarDashboard);

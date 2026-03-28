let stateBase = {
  calendario: [],
  alunos: [],
  turma_id: null
};

// Mapeamento Status -> Próximo clique
const clickCycle = {
  'P': 'F',
  'F': 'J',
  'J': 'P',
  '': 'P' // Vazio vai para presente
};

// Retorna CSS Class
const getClassForStatus = (status) => {
  if (status === 'P') return 'freq-cell status-P';
  if (status === 'F') return 'freq-cell status-F';
  if (status === 'J') return 'freq-cell status-J';
  return 'freq-cell';
};

// Formata data ISO para PT-BR DD e Dia Semana
const formatDayHeader = (isoString) => {
  const d = new Date(isoString + "T00:00:00");
  const num = d.getDate();
  const diaSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
  return `<span class="dia-num">${num}</span><span class="dia-semana">${diaSemana}</span>`;
};

async function carregarGrade() {
  const container = document.getElementById('gridContainer');
  const turmaId = document.getElementById('turmaSelect').value;
  const mes = document.getElementById('mesSelect').value;
  const ano = new Date().getFullYear();

  if(!turmaId) return;

  container.innerHTML = `<div style="padding: 2rem; text-align: center;">Buscando dados da matriz de frequência...</div>`;

  try {
    // 1. Simular uma requisição ou usar requisição real. 
    // Em Produção será: const res = await apiFetch(`/frequencias?turma_id=${turmaId}&mes=${mes}&ano=${ano}`);
    // stateBase = res;
    
    // COMO NÃO TEMOS CONEXÃO VERDADEIRA AINDA AQUI NO FRONT JS MOCKAMOS PARA A UI MOSTRAR O RESULTADO PERFEITO.
    // === MOCK DATA VIEW ===
    stateBase.calendario = Array.from({length: 22}).map((_, i) => ({
      id: `cal-uuid-${i}`,
      data: `${ano}-${String(mes).padStart(2, '0')}-${String(i+1).padStart(2,'0')}`,
      tipo: [0, 6].includes(new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(i+1).padStart(2,'0')}T00:00:00`).getDay()) ? 'fim_de_semana' : 'aula'
    }));

    stateBase.alunos = [
      { id: 'uuid-aluno1', nome: 'João Silva', frequencia_por_data: {} },
      { id: 'uuid-aluno2', nome: 'Maria Oliveira', frequencia_por_data: {} },
      { id: 'uuid-aluno3', nome: 'Pedro Souza', frequencia_por_data: {} }
    ];
    // === FIM DO MOCK ===

    renderGrid();

  } catch (error) {
    container.innerHTML = `<div style="padding: 2rem; color: var(--danger-text);">Erro ao carregar matriz: ${error.message}</div>`;
  }
}

function renderGrid() {
  const container = document.getElementById('gridContainer');
  const { calendario, alunos } = stateBase;

  const thead = `
    <thead>
      <tr>
        <th class="aluno-col">Aluno</th>
        ${calendario.map(c => {
           let classDia = 'dia-col';
           if(c.tipo === 'feriado') classDia += ' dia-feriado';
           if(c.tipo === 'reuniao') classDia += ' dia-reuniao';
           if(c.tipo === 'fim_de_semana') classDia += ' dia-fim-semana';

           return `<th class="${classDia}">${formatDayHeader(c.data)}</th>`;
        }).join('')}
        <th class="total-col">%</th>
      </tr>
    </thead>
  `;

  const tbody = `
     <tbody>
       ${alunos.map(aluno => {
         return `
           <tr data-aluno-id="${aluno.id}">
             <td class="aluno-nome">${aluno.nome}</td>
             ${calendario.map(c => {
                const status = aluno.frequencia_por_data[c.id] || '';
                
                if (c.tipo !== 'aula' && c.tipo !== 'reuniao') {
                   // Célula vazia/cinza para fds ou feriado
                   return `<td class="${c.tipo === 'fim_de_semana' ? 'dia-fim-semana' : 'dia-feriado'}">-</td>`;
                }

                return `<td class="${getClassForStatus(status)}" 
                            data-cal-id="${c.id}" 
                            onclick="toggleStatus(this, '${aluno.id}', '${c.id}')">
                          ${status || '-'}
                        </td>`;
             }).join('')}
             <td class="total-pct" id="total-${aluno.id}">100%</td>
           </tr>
         `;
       }).join('')}
     </tbody>
  `;

  container.innerHTML = `<table class="excel-grid">${thead}${tbody}</table>`;
  recalcularTotaisLocais();
}

function toggleStatus(element, alunoId, calId) {
  // Lógica de ciclo "P -> F -> J"
  const alunoObj = stateBase.alunos.find(a => a.id === alunoId);
  if (!alunoObj) return;

  const currentStatus = alunoObj.frequencia_por_data[calId] || '';
  const newStatus = clickCycle[currentStatus];

  // Update object
  alunoObj.frequencia_por_data[calId] = newStatus;

  // Update DOM Element
  element.className = getClassForStatus(newStatus);
  element.innerText = newStatus;

  recalcularTotaisLocais();

  // NOVO GATILHO WHATSAPP: Se marcar falta 'F', sugere envio
  if (newStatus === 'F') {
    exibirSugestaoAlerta(alunoObj);
  }
}

function exibirSugestaoAlerta(aluno) {
  const toast = document.getElementById('waToast');
  const btn = document.getElementById('btnEnviarWA');
  const msg = document.getElementById('waToastMsg');
  
  // Nome reduzido para LGPD (Ex: João Silva -> João S.)
  const partesNome = aluno.nome.split(' ');
  const nomeReduzido = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[1][0]}.` : partesNome[0];

  msg.innerHTML = `Deseja enviar aviso de ausência de <strong>${nomeReduzido}</strong> ao responsável?`;
  
  toast.style.display = 'flex';

  // Configura o clique do botão de envio
  btn.onclick = () => enviarAlertaWhatsapp(aluno.nome, nomeReduzido);
}

function fecharToast() {
  const toast = document.getElementById('waToast');
  toast.style.display = 'none';
}

function enviarAlertaWhatsapp(nomeCompleto, nomeReduzido) {
  fecharToast();
  
  const escolaNome = "Minha Escola Modelo";
  const telefoneSecretaria = "(11) 9999-9999";
  
  // TÉXTO 100% LGPD COMPLIANT
  const texto = `Olá! Esta é uma *mensagem automática* da *${escolaNome}*.\n\nRegistramos a ausência do(a) aluno(a) *${nomeReduzido}* na presente data.\n\nPor motivos de segurança e acompanhamento pedagógico, solicitamos que entre em contato direto com a secretaria da unidade escolar para tratar sobre esta frequência.\n\nPor favor, *não responda a este sistema automático*, utilize nossos canais oficiais no número ${telefoneSecretaria}.`;

  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  
  // Abre em nova aba simulação
  window.open(url, '_blank');
}

function recalcularTotaisLocais() {
  const aulasTotais = stateBase.calendario.filter(c => c.tipo === 'aula' || c.tipo === 'reuniao').length;
  if(aulasTotais === 0) return;

  stateBase.alunos.forEach(aluno => {
    let faltas = 0;
    Object.values(aluno.frequencia_por_data).forEach(status => {
      // F ou J conta como falta no percentual
      if (status === 'F' || status === 'J') faltas++; 
    });

    const freqDecimal = (1 - (faltas / aulasTotais)) * 100;
    const finalPct = Math.round(Math.max(0, freqDecimal));

    const tdTotal = document.getElementById(`total-${aluno.id}`);
    if(tdTotal) {
      tdTotal.innerText = `${finalPct}%`;
      // Feedback visual se está em risco (< 75%)
      if(finalPct < 75) {
        tdTotal.classList.add('pct-danger');
      } else {
        tdTotal.classList.remove('pct-danger');
      }
    }
  });
}

function salvarGrade() {
  const btn = document.getElementById('btnSave');
  btn.innerText = 'Salvando...';
  
  // Agrupar payloads para bater na API POST /api/frequencias/lote
  const frequenciasParaSalvar = [];
  stateBase.alunos.forEach(aluno => {
    Object.keys(aluno.frequencia_por_data).forEach(calId => {
       const status = aluno.frequencia_por_data[calId];
       if(status) {
         frequenciasParaSalvar.push({
           aluno_id: aluno.id,
           calendario_id: calId,
           status: status
         });
       }
    });
  });

  // Simulando sucesso da chamada 
  setTimeout(() => {
    console.log("PAYLOAD PRONTO PARA VERCEL:", frequenciasParaSalvar);
    btn.innerHTML = `
      <svg style="width:16px;height:16px" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 2l-6-6h4V3h4v5h4l-6 6z"/>
      </svg>
      Salvo com sucesso!
    `;
    setTimeout(() => {
       btn.innerText = 'Salvar Alterações';
    }, 2000);
  }, 1000);
}

// Inicia automático se já não estiver em login page
if(document.getElementById('turmaSelect')) {
  carregarGrade();
}

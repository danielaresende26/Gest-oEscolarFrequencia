const supabase = require('../models/supabaseClient');

/**
 * Gera uma matriz de frequência semanal para uma turma.
 * Útil para o "Diário de Bordo" consolidado.
 */
exports.gerarMatrizSemanal = async (turma_id, data_inicio, data_fim) => {
  // 1. Buscar alunos da turma
  const { data: alunos, error: alunosErr } = await supabase
    .from('alunos')
    .select('id, nome')
    .eq('turma_id', turma_id)
    .order('nome', { ascending: true });

  if (alunosErr) throw alunosErr;

  // 2. Buscar calendário do período (Segunda a Sexta)
  const { data: calendario, error: calErr } = await supabase
    .from('calendario_aulas')
    .select('id, data, tipo')
    .eq('turma_id', turma_id)
    .gte('data', data_inicio)
    .lte('data', data_fim)
    .order('data', { ascending: true });

  if (calErr) throw calErr;

  // 3. Buscar frequências registradas
  let frequencias = [];
  if (alunos.length > 0 && calendario.length > 0) {
    const { data: freqs, error: freqErr } = await supabase
      .from('frequencias')
      .select('*')
      .in('aluno_id', alunos.map(a => a.id))
      .in('calendario_id', calendario.map(c => c.id));

    if (freqErr) throw freqErr;
    frequencias = freqs;
  }

  // 4. Montar a Matriz (Pivot)
  const matriz = alunos.map(aluno => {
    const frequenciasAluno = {};
    
    calendario.forEach(dia => {
      const registro = frequencias.find(f => f.aluno_id === aluno.id && f.calendario_id === dia.id);
      frequenciasAluno[dia.data] = registro ? registro.status : '-';
    });

    return {
      aluno_id: aluno.id,
      nome: aluno.nome,
      semana: frequenciasAluno
    };
  });

  return {
    calendario,
    matriz
  };
};

/**
 * Consolida dados analíticos reais para o Dashboard da Escola.
 */
exports.gerarDadosDashboard = async (escola_id) => {
  if (!escola_id) throw new Error('escola_id é obrigatório para o Dashboard');

  // 1. Total de Turmas
  const { count: totalTurmas, error: turmasErr } = await supabase
    .from('turmas')
    .select('id', { count: 'exact', head: true })
    .eq('escola_id', escola_id);

  if (turmasErr) throw turmasErr;

  // 2. Alunos em Risco (< 75% Frequência no mês atual)
  // Nota: Em uma base real, isso seria uma View no Postgres. Aqui faremos via agregação JS para simplicidade.
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

  // Buscar todos os alunos da escola com suas turmas
  const { data: alunos, error: alunosErr } = await supabase
    .from('alunos')
    .select('id, nome, turmas!inner(nome, escola_id)')
    .eq('turmas.escola_id', escola_id);

  if (alunosErr) throw alunosErr;

  // Buscar faltas (F ou J) do mês atual
  const { data: faltas, error: faltasErr } = await supabase
    .from('frequencias')
    .select('aluno_id, calendario_aulas!inner(data)')
    .in('status', ['F', 'J'])
    .gte('calendario_aulas.data', inicioMes)
    .in('aluno_id', alunos.map(a => a.id));

  if (faltasErr) throw faltasErr;

  // Buscar total de aulas dadas no mês
  const { data: totalAulas, error: aulasErr } = await supabase
    .from('calendario_aulas')
    .select('id, data, turma_id')
    .in('tipo', ['aula', 'reuniao'])
    .gte('data', inicioMes)
    .in('turma_id', [...new Set(alunos.map(a => a.turmas.id))]);

  if (aulasErr) throw aulasErr;

  const alunosRisco = [];
  alunos.forEach(aluno => {
    const numFaltas = faltas.filter(f => f.aluno_id === aluno.id).length;
    const numAulasTotal = totalAulas.filter(a => a.turma_id === aluno.turmas.id).length;
    
    if (numAulasTotal > 0) {
      const freq = ((numAulasTotal - numFaltas) / numAulasTotal) * 100;
      if (freq < 75) {
        alunosRisco.push({
          nome: aluno.nome,
          turma: aluno.turmas.nome,
          faltasPct: Math.round(100 - freq)
        });
      }
    }
  });

  // 3. Dias Críticos (Padrão de faltas por dia da semana)
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const estatisticasDias = diasSemana.map(d => ({ diaSemana: d, totalFaltasHistorico: 0, alerta: false }));

  faltas.forEach(f => {
    const d = new Date(f.calendario_aulas.data + "T00:00:00");
    const numDia = d.getDay();
    estatisticasDias[numDia].totalFaltasHistorico++;
  });

  // Marcar como alerta o dia com mais faltas
  const maxFaltas = Math.max(...estatisticasDias.map(d => d.totalFaltasHistorico));
  if (maxFaltas > 0) {
    estatisticasDias.forEach(d => { if (d.totalFaltasHistorico === maxFaltas) d.alerta = true; });
  }

  return {
    totalTurmas,
    alunosRisco,
    diasCriticos: estatisticasDias.filter(d => d.diaSemana !== 'Domingo' && d.diaSemana !== 'Sábado') // Apenas dias úteis
  };
};

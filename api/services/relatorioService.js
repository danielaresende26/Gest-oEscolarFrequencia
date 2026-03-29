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
    .from('calendarios')
    .select('id, data, tipo')
    .eq('turma_id', turma_id)
    .gte('data', data_inicio)
    .lte('data', data_fim)
    .order('data', { ascending: true });

  if (calErr) throw calErr;

  // 3. Buscar frequências registradas
  const { data: frequencias, error: freqErr } = await supabase
    .from('frequencias')
    .select('*')
    .in('aluno_id', alunos.map(a => a.id))
    .in('calendario_id', calendario.map(c => c.id));

  if (freqErr) throw freqErr;

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

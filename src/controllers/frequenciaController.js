const supabase = require('../models/supabaseClient');

exports.salvarLote = async (req, res) => {
  try {
    // frequencias: Array de objetos { aluno_id, calendario_id, status }
    const { frequencias, preenchido_por } = req.body;
    
    if (!frequencias || !frequencias.length) {
      return res.status(400).json({ error: 'Lista de frequências vazia.' });
    }

    // Inserir ou atualizar via Upsert
    // O Supabase mapeia on_conflict para as chaves unicas. Precisamos do UNIQUE(aluno_id, calendario_id)
    const payload = frequencias.map(f => ({
      ...f,
      preenchido_por
    }));

    const { data, error } = await supabase
      .from('frequencias')
      .upsert(payload, { onConflict: 'aluno_id,calendario_id' })
      .select();

    if (error) throw error;
    res.json({ message: 'Frequências salvas com sucesso!', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar em lote', details: err.message });
  }
};

exports.obterMatrizMensal = async (req, res) => {
  try {
    const { turma_id, mes, ano } = req.query;
    if (!turma_id || !mes || !ano) return res.status(400).json({ error: 'turma_id, mes e ano são obrigatórios.' });

    // 1. Obter calendário da turma no mes/ano
    const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
    // gambiarra rapida pra ultimo dia do mes: avancamos 1 mes e voltamos 1 dia
    const dateInicioMes = new Date(ano, mes - 1, 1);
    const dateFimMes = new Date(ano, mes, 0);
    const fimMes = dateFimMes.toISOString().split('T')[0];

    const { data: calendario, error: calError } = await supabase
      .from('calendario_aulas')
      .select('*')
      .eq('turma_id', turma_id)
      .gte('data', inicioMes)
      .lte('data', fimMes)
      .order('data', { ascending: true });

    if (calError) throw calError;

    // 2. Obter todos alunos da turma
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('turma_id', turma_id)
      .order('nome', { ascending: true });

    if (alunosError) throw alunosError;

    // 3. Obter frequências preenchidas no mês para esta turma
    const idsCalendario = calendario.map(c => c.id);
    const idsAlunos = alunos.map(a => a.id);

    // Se estiver vazio, não tenta buscar IN (empty) que dá erro
    let frequencias = [];
    if (idsCalendario.length && idsAlunos.length) {
       const { data: freqs, error: fError } = await supabase
         .from('frequencias')
         .select('*')
         .in('calendario_id', idsCalendario)
         .in('aluno_id', idsAlunos);
       if (fError) throw fError;
       frequencias = freqs;
    }

    res.json({
      turma_id,
      calendario,
      alunos: alunos.map(a => {
        // Mapear frequencias por dia
        const freqDoAluno = frequencias.filter(f => f.aluno_id === a.id);
        const frequencia_por_data = {};
        freqDoAluno.forEach(f => {
          frequencia_por_data[f.calendario_id] = f.status;
        });

        // Calcular percentual total do mes (somente nos dias que são 'aula' ou 'reuniao' que exigem presença)
        const aulasTotaism = calendario.filter(c => c.tipo === 'aula' || c.tipo === 'reuniao').length;
        const faltas = freqDoAluno.filter(f => f.status === 'F' || f.status === 'J').length;
        const faltasPct = aulasTotaism === 0 ? 0 : Math.round((faltas / aulasTotaism) * 100);

        return {
           id: a.id,
           nome: a.nome,
           faltasPct,
           presencasPct: 100 - faltasPct,
           frequencia_por_data
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar matriz mensal', details: err.message });
  }
};

const supabase = require('../models/supabaseClient');

exports.obterAno = async (req, res) => {
  try {
    const { turma_id, ano } = req.query;
    if (!turma_id || !ano) return res.status(400).json({ error: 'Faltam parâmetros.' });

    const inicioAno = `${ano}-01-01`;
    const fimAno = `${ano}-12-31`;

    const { data: calendario, error } = await supabase
      .from('calendario_aulas')
      .select('*')
      .eq('turma_id', turma_id)
      .gte('data', inicioAno)
      .lte('data', fimAno)
      .order('data', { ascending: true });

    if (error) throw error;
    res.json(calendario);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar calendário', details: err.message });
  }
};

exports.marcarReuniao = async (req, res) => {
  try {
    const { turma_id, data, descricao } = req.body;
    
    // Atualiza o tipo para reuniao naquele dia
    const { data: updateData, error } = await supabase
      .from('calendario_aulas')
      .update({ tipo: 'reuniao', descricao })
      .eq('turma_id', turma_id)
      .eq('data', data)
      .select();

    if (error) throw error;
    res.json({ message: 'Reunião marcada com sucesso', data: updateData });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar reunião', details: err.message });
  }
};

exports.marcarRecesso = async (req, res) => {
  try {
    const { turma_id, dataInicio, dataFim, descricao } = req.body;
    
    // Atualiza o tipo para recesso no intervalo de dados
    const { data, error } = await supabase
      .from('calendario_aulas')
      .update({ tipo: 'recesso', descricao })
      .eq('turma_id', turma_id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .select();

    if (error) throw error;
    res.json({ message: 'Recesso marcado com sucesso', data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar recesso', details: err.message });
  }
};

const supabase = require('../models/supabaseClient');
const calendarioService = require('../services/calendarioService');

exports.criar = async (req, res) => {
  try {
    const { escola_id, nome, periodo, horario_inicio, horario_fim, dia_semana } = req.body;
    
    const { data: turma, error } = await supabase
      .from('turmas')
      .insert([{ escola_id, nome, periodo, horario_inicio, horario_fim, dia_semana }])
      .select()
      .single();

    if (error) throw error;

    // Assim que a turma for criada, o sistema gerará o calendário automaticamente para o ano atual.
    const anoAtual = new Date().getFullYear();
    await calendarioService.gerarCalendarioTurma(turma.id, turma.dia_semana, anoAtual);

    res.status(201).json({ message: 'Turma criada e calendário gerado!', turma });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar turma', details: err.message });
  }
};

exports.listarPorEscola = async (req, res) => {
  try {
    const { escola_id } = req.query;
    if (!escola_id) return res.status(400).json({ error: 'escola_id é obrigatório.' });

    const { data, error } = await supabase
      .from('turmas')
      .select('*')
      .eq('escola_id', escola_id)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar turmas', details: err.message });
  }
};

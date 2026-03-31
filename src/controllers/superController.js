const supabase = require('../models/supabaseClient');

/**
 * Controller exclusivo para o Super Admin (Você)
 * Gerencia o ecossistema de escolas clientes.
 */

// Listar todas as escolas (Painel Geral)
exports.listarEscolas = async (req, res) => {
  try {
    const { data: escolas, error } = await supabase
      .from('escolas')
      .select('*, usuarios!inner(id, nome, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(escolas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar nova escola cliente
exports.criarEscola = async (req, res) => {
  const { nome, plano, max_professores, max_turmas } = req.body;
  try {
    const { data, error } = await supabase
      .from('escolas')
      .insert([{ 
        nome, 
        plano: plano || 'profissional', 
        max_professores: max_professores || 10,
        max_turmas: max_turmas || 20,
        ativo: true 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar plano ou status de uma escola
exports.atualizarEscola = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const { data, error } = await supabase
      .from('escolas')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

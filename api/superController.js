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
      .select('*, usuarios!inner(id, nome)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(escolas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar nova escola cliente
exports.criarEscola = async (req, res) => {
  const { nome, plano, max_professores, max_turmas, has_whatsapp, has_excel, has_analytics } = req.body;
  try {
    const { data, error } = await supabase
      .from('escolas')
      .insert([{ 
        nome, 
        plano: plano || 'profissional', 
        max_professores: max_professores || 10,
        max_turmas: max_turmas || 20,
        has_whatsapp: has_whatsapp || false,
        has_excel: has_excel || false,
        has_analytics: has_analytics || false,
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

// Listar todos os usuários do sistema (Gestão Master)
exports.listarTodosUsuarios = async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        perfil,
        escola_id,
        escolas (nome)
      `)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar perfil ou escola de qualquer usuário
exports.atualizarPerfilUsuario = async (req, res) => {
  const { id } = req.params;
  const { perfil, escola_id } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ perfil, escola_id })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

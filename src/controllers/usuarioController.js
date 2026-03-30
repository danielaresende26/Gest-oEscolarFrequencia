const supabase = require('../models/supabaseClient');

/**
 * Lista todos os membros da equipe (professores/admins) da mesma escola.
 */
exports.listarEquipe = async (req, res) => {
  try {
    const { escola_id } = req.query;
    if (!escola_id) return res.status(400).json({ error: 'escola_id é obrigatório.' });

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('escola_id', escola_id)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar equipe', details: err.message });
  }
};

/**
 * Cria um novo usuário no Supabase Auth e o vincula à escola.
 * Requer o uso da SERVICE_ROLE_KEY no supabaseClient.js.
 */
exports.criarMembroEquipe = async (req, res) => {
  try {
    const { nome, email, senha, perfil, escola_id } = req.body;

    if (!nome || !email || !senha || !perfil || !escola_id) {
       return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // 1. Criar usuário no Supabase Auth (Admin API)
    // Isso cria a conta sem precisar confirmar e-mail se o Admin API estiver habilitado
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, escola_id, perfil }
    });

    if (authError) throw authError;

    // 2. Criar perfil na tabela 'usuarios'
    const { error: profileError } = await supabase
      .from('usuarios')
      .insert([{
        id: authData.user.id,
        nome,
        escola_id,
        perfil
      }]);

    if (profileError) {
      // Se falhar o perfil, tentamos limpar o auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json({ message: 'Membro da equipe criado com sucesso!', user: authData.user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro: ' + err.message });
  }
};

/**
 * Remove um membro da equipe (Auth e Perfil).
 */
exports.removerMembro = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_user_id } = req.query; // Para validação de segurança

    if (!admin_user_id) return res.status(401).json({ error: 'Usuário administrador não identificado.' });

    // Validar se quem está deletando é ADMIN da mesma escola
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select('perfil, escola_id')
      .eq('id', admin_user_id)
      .single();

    if (adminError || !admin || admin.perfil !== 'admin') {
       return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem remover membros.' });
    }

    // 1. Deletar do Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    if (authDeleteError) throw authDeleteError;

    // 2. Deletar do perfil (O CASCADE pode fazer isso se estiver configurado, mas garantimos)
    await supabase.from('usuarios').delete().eq('id', id);

    res.json({ message: 'Membro removido com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover membro', details: err.message });
  }
};

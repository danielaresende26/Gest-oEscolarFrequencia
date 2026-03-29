const supabase = require('../models/supabaseClient');

exports.criar = async (req, res) => {
  try {
    const { turma_id, nome, contatos } = req.body;
    
    // Inserir Aluno
    const { data: aluno, error: alunoError } = await supabase
      .from('alunos')
      .insert([{ turma_id, nome }])
      .select()
      .single();

    if (alunoError) throw alunoError;

    // Inserir contatos, se existirem
    if (contatos && contatos.length > 0) {
      const contatosPayload = contatos.map(c => ({
        aluno_id: aluno.id,
        nome_contato: c.nome_contato,
        numero: c.numero,
        parentesco: c.parentesco || 'Responsável',
        is_whatsapp: c.is_whatsapp || false
      }));

      const { error: contatosError } = await supabase
        .from('contatos')
        .insert(contatosPayload);

      if (contatosError) console.error('Erro ao inserir contatos:', contatosError);
    }

    res.status(201).json({ message: 'Aluno cadastrado com sucesso', aluno });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar aluno', details: err.message });
  }
};

exports.listarPorTurma = async (req, res) => {
  try {
    const { turma_id } = req.query;
    if (!turma_id) return res.status(400).json({ error: 'turma_id é obrigatório.' });

    const { data, error } = await supabase
      .from('alunos')
      .select(`
        *,
        contatos (*)
      `)
      .eq('turma_id', turma_id)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar alunos', details: err.message });
  }
};
exports.criarBulk = async (req, res) => {
  try {
    const { alunos } = req.body;
    if (!alunos || alunos.length === 0) return res.status(400).json({ error: 'Lista de alunos vazia.' });

    // Inserir Alunos (o Supabase aceita array para insert múltiplo)
    const { data, error } = await supabase
      .from('alunos')
      .insert(alunos.map(a => ({ turma_id: a.turma_id, nome: a.nome })))
      .select();

    if (error) throw error;
    res.json({ message: `${data.length} alunos importados com sucesso.`, alunos: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar alunos', details: err.message });
  }
};
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, turma_id, whatsapp } = req.body;

    // 1. Atualizar Aluno
    const { error: alunoError } = await supabase
      .from('alunos')
      .update({ nome, turma_id })
      .eq('id', id);

    if (alunoError) throw alunoError;

    // 2. Atualizar ou Inserir WhatsApp (Contato)
    if (whatsapp) {
      const { error: contatoError } = await supabase
        .from('contatos')
        .upsert([{ 
          aluno_id: id, 
          numero: whatsapp, 
          nome_contato: 'Principal', 
          is_whatsapp: true 
        }], { onConflict: 'aluno_id,nome_contato' });

      if (contatoError) console.error('Erro ao atualizar contato:', contatoError);
    }

    res.json({ message: 'Aluno atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar aluno', details: err.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query; // Temporário enquanto não temos middleware de auth robusto

    if (!user_id) return res.status(401).json({ error: 'Usuário não identificado.' });

    // Verificar se o usuário é ADMIN
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('perfil')
      .eq('id', user_id)
      .single();

    if (userError || !usuario || usuario.perfil !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar alunos.' });
    }

    // Deletar Aluno (Contatos e Frequências serão deletados via CASCADE no banco)
    const { error } = await supabase.from('alunos').delete().eq('id', id);

    if (error) throw error;
    res.json({ message: 'Aluno removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar aluno', details: err.message });
  }
};

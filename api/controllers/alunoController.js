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

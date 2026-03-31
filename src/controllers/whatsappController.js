const whatsappService = require('../services/whatsappService');
const supabase = require('../models/supabaseClient');

exports.dispararManual = async (req, res) => {
  try {
    const { aluno_id, mensagem } = req.body;
    
    // Obter numero do aluno e permissão da escola
    const { data: aluno, error: alunoError } = await supabase
      .from('alunos')
      .select('escola_id, escola:escolas(has_whatsapp)')
      .eq('id', aluno_id)
      .single();

    if (alunoError || !aluno) throw new Error('Aluno não encontrado.');
    if (!aluno.escola?.has_whatsapp) {
      return res.status(403).json({ error: 'Recurso Premium', details: 'O envio de WhatsApp não está habilitado para o seu plano.' });
    }

    const { data: contatos, error: contatoError } = await supabase
      .from('contatos')
      .select('numero')
      .eq('aluno_id', aluno_id)
      .eq('is_whatsapp', true);

    if (contatoError) throw contatoError;
    if (!contatos || !contatos.length) {
      return res.status(404).json({ error: 'Nenhum contato cadastrado com WhatsApp aparente para este aluno.' });
    }

    // Para cada contato marcado como whatsapp, disparar
    const promessasDisparo = contatos.map(c => 
      whatsappService.enviarMensagem(c.numero, mensagem)
    );

    await Promise.allSettled(promessasDisparo);

    res.json({ message: 'Mensagens enviadas para o WhatsApp do responsável!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao disparar WhatsApp', details: err.message });
  }
};

exports.obterAgendados = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alertas_whatsapp')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendados', details: err.message });
  }
};

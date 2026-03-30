const relatorioService = require('../services/relatorioService');

exports.obterSemanal = async (req, res) => {
  try {
    const { turma_id, data_inicio, data_fim } = req.query;
    
    if (!turma_id || !data_inicio || !data_fim) {
      return res.status(400).json({ error: 'turma_id, data_inicio e data_fim são obrigatórios.' });
    }

    const report = await relatorioService.gerarMatrizSemanal(turma_id, data_inicio, data_fim);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar matriz semanal', details: err.message });
  }
};

exports.obterPorAluno = async (req, res) => {
  // Retorna histórico de faltas do aluno
  res.json({ message: 'Relatório por aluno em construção' });
};

exports.diasCriticos = async (req, res) => {
  // Analisa dias da semana com mais faltas baseados no histórico
  res.json({ message: 'Relatório de dias críticos em construção' });
};

exports.dashboard = async (req, res) => {
  try {
    const { escola_id } = req.query;
    
    if (!escola_id) {
      return res.status(400).json({ error: 'escola_id é necessário para o dashboard.' });
    }

    const data = await relatorioService.gerarDadosDashboard(escola_id);
    res.json(data);
  } catch (err) {
    console.error('Erro no Controller Dashboard:', err);
    res.status(500).json({ error: 'Erro ao montar dashboard', details: err.message });
  }
};

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
    
    // Simulação do resultado de ranking de alunos de risco
    // Futuro: Query complexa ao banco ou view agregada analítica
    res.json({
      alunosRisco: [
        { nome: 'João Pedro', turma: '7° B', faltasPct: 35 },
        { nome: 'Maria Clara', turma: '8° A', faltasPct: 28 }
      ],
      diasCriticos: [
        { diaSemana: 'Sexta-feira', totalFaltasHistorico: 120, alerta: true },
        { diaSemana: 'Segunda-feira', totalFaltasHistorico: 98, alerta: false }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao montar dashboard', details: err.message });
  }
};

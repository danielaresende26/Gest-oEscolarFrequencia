const supabase = require('../models/supabaseClient');

exports.obterPorTurma = async (req, res) => {
  // Retorna % média de faltas de uma turma
  res.json({ message: 'Relatório por turma em construção' });
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

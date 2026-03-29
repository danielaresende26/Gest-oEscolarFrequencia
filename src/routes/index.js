const express = require('express');
const router = express.Router();

// Middlewares: Serão importados aqui para proteger as rotas
// const auth = require('../middleware/auth');
// const admin = require('../middleware/perfil'); // verificaAdmin

// Import Controllers
const alunoController = require('../controllers/alunoController');
const turmaController = require('../controllers/turmaController');
const frequenciaController = require('../controllers/frequenciaController');
const calendarioController = require('../controllers/calendarioController');
const relatorioController = require('../controllers/relatorioController');
const whatsappController = require('../controllers/whatsappController');

// --- Turmas ---
router.post('/turmas', turmaController.criar);
router.get('/turmas', turmaController.listarPorEscola);

// --- Alunos ---
router.post('/alunos', alunoController.criar);
router.post('/alunos/bulk', alunoController.criarBulk);
router.get('/alunos', alunoController.listarPorTurma);
router.put('/alunos/:id', alunoController.atualizar);
router.delete('/alunos/:id', alunoController.deletar);

// --- Frequência ---
router.post('/frequencias/lote', frequenciaController.salvarLote);
router.get('/frequencias', frequenciaController.obterMatrizMensal);

// --- Calendário ---
router.get('/calendario', calendarioController.obterAno);
router.post('/calendario/reuniao', calendarioController.marcarReuniao);
router.post('/calendario/recesso', calendarioController.marcarRecesso);

// --- Relatórios e Analytics ---
router.get('/relatorios/semanal', relatorioController.obterSemanal);
// router.get('/relatorios/turma', relatorioController.obterPorTurma);
router.get('/relatorios/aluno', relatorioController.obterPorAluno);
router.get('/relatorios/dias-criticos', relatorioController.diasCriticos);
router.get('/relatorios/dashboard', relatorioController.dashboard);

// --- WhatsApp (Evolution API) ---
router.post('/whatsapp/disparar', whatsappController.dispararManual);
router.get('/whatsapp/agendados', whatsappController.obterAgendados);

// --- Configurações Iniciais Seguro/Cloud ---
router.get('/config', (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  });
});

module.exports = router;

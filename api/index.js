const path = require('path');
const express = require('express'); 
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Main Router Imports
// Usando caminhos absolutos para garantir que a Vercel encontre os arquivos movidos para /src
const mainRoutes = require(path.join(__dirname, '../src/routes/index'));

app.use('/api', mainRoutes);

// Servir arquivos estáticos da pasta /public quando rodando localmente
// Nota: Na Vercel, isso é tratado pelo vercel.json (rewrites)
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API de Gestão Escolar rodando!', timestamp: new Date() });
});

// Tratamento de Rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno no servidor.', details: err.message });
});

const PORT = process.env.PORT || 3000;
// Em dev roda normal. Na Vercel ele lida dinamicamente.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

// Export app do Serverless da Vercel
module.exports = app;

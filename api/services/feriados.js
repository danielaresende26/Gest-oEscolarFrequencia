const axios = require('axios');

async function obterFeriadosNacionais(ano) {
  try {
    const { data } = await axios.get(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    // data format: [{ date: '2024-01-01', name: 'Confraternização Universal', type: 'national' }]
    
    // Mapear para um Hash O(1) com a data YYYY-MM-DD
    const mapaFeriados = {};
    data.forEach(f => {
      mapaFeriados[f.date] = f.name;
    });
    
    return mapaFeriados;
  } catch (error) {
    console.error(`Erro ao buscar feriados para o ano ${ano}:`, error.message);
    // Em caso de erro, retorna vazio para não bloquear a criação do calendário
    return {};
  }
}

module.exports = { obterFeriadosNacionais };

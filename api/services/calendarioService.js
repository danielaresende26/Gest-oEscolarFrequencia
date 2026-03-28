const supabase = require('../models/supabaseClient');
const { obterFeriadosNacionais } = require('./feriados');

const mapDiasSemana = {
  'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
};

async function gerarCalendarioTurma(turma_id, dias_semana_strings, ano) {
  try {
    const feriados = await obterFeriadosNacionais(ano);
    const validDays = dias_semana_strings.map(d => mapDiasSemana[d.toLowerCase()]);

    const eventos = [];
    
    // Iterar do dia 1 de Janeiro até 31 de Dezembro
    const iterDate = new Date(ano, 0, 1);
    const limitDate = new Date(ano, 11, 31);

    while (iterDate <= limitDate) {
      // YYYY-MM-DD para busca e insercao correta no DB
      const dateString = iterDate.toISOString().split('T')[0];
      const diaDaSemana = iterDate.getUTCDay(); // 0-6 DomingA Sabado (UTC previne Timezone bugs)

      let tipo = 'aula';
      let descricao = null;
      let criarRegistro = false;

      // Se é um dia da semana que a turma estuda
      if (validDays.includes(diaDaSemana)) {
        criarRegistro = true;

        // Se for feriado
        if (feriados[dateString]) {
          tipo = 'feriado';
          descricao = feriados[dateString];
        }
      }

      // Vamos criar o registro no banco mesmo em dias que a turma não tem aula?
      // Pela especificação o calendario apenas os dias de aula. Ou preencher fim de semana.
      // O prompt pedia "Marcar fins de semana e feriados automaticamente como não-aula... Filtrar apenas os dias da semana".
      // Então só inserimos se a turma dever estudar, ou deixamos o front tratar o vazio.
      // Melhor inserir todos os dias do ano para os admins verem tudo, e só marcar 'aula' onde for correto.
      if (!criarRegistro) {
        if (diaDaSemana === 0 || diaDaSemana === 6) {
          tipo = 'fim_de_semana';
        } else {
           // Dia de semana sem aula (ex: turma de 2a, 4a, 6a e hoje é terca)
           tipo = 'recesso';  // Pode usar recesso ou 'nenhuma' (mas recesso atende melhor caso falte tipo custom)
        }
      }

      // Feriado fora do dia de aula normal
      if (feriados[dateString] && !criarRegistro) {
        tipo = 'feriado';
        descricao = feriados[dateString];
      }

      // Adicionar payload
      eventos.push({
        turma_id,
        data: dateString,
        tipo,
        descricao,
        gerado_automaticamente: true
      });

      iterDate.setUTCDate(iterDate.getUTCDate() + 1);
    }

    // Insert em Batch no Supabase
    // Supabase limita a matriz, mandar em lotes de 200 é melhor
    const chunkSize = 200;
    for (let i = 0; i < eventos.length; i += chunkSize) {
      const chunk = eventos.slice(i, i + chunkSize);
      const { error } = await supabase.from('calendario_aulas').insert(chunk);
      if (error) {
        console.error('Erro ao inserir lote calendário:', error);
      }
    }

    return true;
  } catch (err) {
    console.error('Erro final no calendarioService:', err);
    throw err;
  }
}

module.exports = { gerarCalendarioTurma };

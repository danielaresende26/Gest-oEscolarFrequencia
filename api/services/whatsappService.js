const axios = require('axios');
const supabase = require('../models/supabaseClient');
require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_KEY;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'gestaoescolar';

async function enviarMensagem(numero, texto) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_KEY) {
      console.warn(`[SIMULAÇÃO] URL/KEY do WhatsApp não definida. Disparo abortado. Numero: ${numero} | Texto: ${texto}`);
      return;
    }

    // Formatar número para padrão internacional se apenas DDD 
    const numeroPronto = numero.length === 11 ? `55${numero}` : numero;

    const payload = {
      number: numeroPronto,
      options: {
        delay: 1200,
        presence: 'composing'
      },
      textMessage: {
        text: texto
      }
    };

    const config = {
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
      }
    };

    const { data } = await axios.post(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, payload, config);
    return data;
  } catch (error) {
    console.error('Erro ao enviar WhatsApp via Evolution API:', error.response?.data || error.message);
    throw error;
  }
}

// TODO: O Cron Vercel chamará esta rotina para agendar e disparar 
async function processarRotinaFaltas() {
  // 1. Busca os alunos com > 3 faltas
  // 2. Insere na tabela alertas_whatsapp
  // 3. varre a tabela agendando/disparando para os status pendente
  console.log('Rotina de disparo analisando banco em lotes.');
}

module.exports = { enviarMensagem, processarRotinaFaltas };

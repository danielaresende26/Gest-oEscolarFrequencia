const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gdmroyhptflmcomwqcxd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbXJveWhwdGZsbWNvbXdxY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjI0NTksImV4cCI6MjA5MDI5ODQ1OX0.X-Q7DoqEqm21QAO0wU7vlj0g7fbM0x1qOuT4lheVMfg'
);

async function seed() {
  console.log('Iniciando seed...');
  const { data, error } = await supabase
    .from('escolas')
    .insert([{ nome: 'Escola de teste' }])
    .select();
  
  if (error) {
    console.error('Erro ao criar escola:', error);
    return;
  }
  
  console.log('Escola criada com sucesso! ID:', data[0].id);
}

seed();

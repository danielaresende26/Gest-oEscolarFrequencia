// Logica de Cadastro de Alunos e Turmas
let escolaId = null; 
let turmasCarregadas = [];

// Ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Iniciar Supabase (pelo api.v2.js)
    await window.initSupabase();
    
    // 2. Tentar descobrir a escola logada. 
    // Em produção pegaria do User metadata/session. Aqui simulando Escola Global de teste.
    // Futuro: GET /api/me para pegar escola_id do usuario logado.
    escolaId = '77777777-7777-7777-7777-777777777777'; 

    await carregarTurmas();
    initBulkHandlers();
});

async function carregarTurmas() {
    const select = document.getElementById('selectTurmaAlunos');
    try {
        const res = await apiFetch(`/turmas?escola_id=${escolaId}`);
        turmasCarregadas = res;
        
        if (turmasCarregadas.length === 0) {
            select.innerHTML = '<option value="">Crie uma turma primeiro à esquerda</option>';
            return;
        }

        select.innerHTML = turmasCarregadas.map(t => 
            `<option value="${t.id}">${t.nome} (${t.periodo})</option>`
        ).join('');
        
    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Erro ao carregar turmas</option>';
    }
}

// CADASTRO DE TURMA
const formTurma = document.getElementById('formTurma');
formTurma.onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('turmaMsg');
    
    btn.disabled = true;
    btn.innerText = 'Gerando...';

    const payload = {
        escola_id: escolaId,
        nome: document.getElementById('turmaNome').value,
        periodo: document.getElementById('turmaPeriodo').value,
        dia_semana: document.getElementById('turmaDias').value.split(',').map(d => d.trim())
    };

    try {
        await apiFetch('/turmas', { method: 'POST', body: JSON.stringify(payload) });
        msg.innerHTML = '<div class="alert success">Turma criada com sucesso e calendário gerado!</div>';
        msg.style.display = 'block';
        formTurma.reset();
        await carregarTurmas();
    } catch (err) {
        msg.innerHTML = `<div class="alert danger">Erro: ${err.message}</div>`;
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Criar Turma e Calendário';
    }
}

// CADASTRO DE ALUNO MANUAL
const formAluno = document.getElementById('formAluno');
formAluno.onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('alunoMsg');
    
    const payload = {
        turma_id: document.getElementById('selectTurmaAlunos').value,
        nome: document.getElementById('alunoNome').value,
        contatos: document.getElementById('alunoZap').value ? [{
            nome_contato: 'Responsável',
            numero: document.getElementById('alunoZap').value,
            is_whatsapp: true
        }] : []
    };

    if (!payload.turma_id) return alert("Selecione uma turma primeiro!");

    btn.disabled = true;
    btn.innerText = 'Salvando...';

    try {
        await apiFetch('/alunos', { method: 'POST', body: JSON.stringify(payload) });
        msg.innerHTML = '<div class="alert success">Aluno cadastrado!</div>';
        msg.style.display = 'block';
        formAluno.reset();
    } catch (err) {
        msg.innerHTML = `<div class="alert danger">Erro: ${err.message}</div>`;
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Adicionar Aluno';
    }
}

// LÓGICA DE ABAS
function switchTab(tabId) {
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    document.getElementById('tabManual').style.display = tabId === 'manual' ? 'block' : 'none';
    document.getElementById('tabBulk').style.display = tabId === 'bulk' ? 'block' : 'none';
}

// LÓGICA DE BULK (ARRASTAR E SOLTAR)
let dataToImport = [];

function initBulkHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.onclick = () => fileInput.click();
    
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('active'); };
    dropZone.ondragleave = () => dropZone.classList.remove('active');
    
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    fileInput.onchange = (e) => handleFile(e.target.files[0]);
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => showPreview(results.data)
        });
    } else if (file.name.endsWith('.xlsx')) {
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            showPreview(jsonData);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Formato não suportado. Use .csv ou .xlsx");
    }
}

function showPreview(data) {
    dataToImport = data.map(row => ({
        nome: row['Nome'] || row['nome'] || row['Nome Completo'],
        whatsapp: row['WhatsApp'] || row['whatsapp'] || row['Telefone']
    })).filter(r => r.nome);

    const tbody = document.querySelector('#tablePreview tbody');
    tbody.innerHTML = dataToImport.map(r => `
        <tr>
            <td>${r.nome}</td>
            <td>${r.whatsapp || '-'}</td>
        </tr>
    `).join('');

    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('bulkCount').innerText = dataToImport.length;
}

// SALVAR BULK
document.getElementById('btnSalvarBulk').onclick = async () => {
    const turmaId = document.getElementById('selectTurmaAlunos').value;
    const btn = document.getElementById('btnSalvarBulk');
    const msg = document.getElementById('alunoMsg');

    if (!turmaId) return alert("Selecione a turma destino!");

    btn.disabled = true;
    btn.innerText = 'Importando centenas de alunos...';

    const payload = {
        alunos: dataToImport.map(d => ({
            turma_id: turmaId,
            nome: d.nome
        }))
    };

    try {
        await apiFetch('/alunos/bulk', { method: 'POST', body: JSON.stringify(payload) });
        msg.innerHTML = `<div class="alert success">${dataToImport.length} alunos importados com sucesso!</div>`;
        msg.style.display = 'block';
        document.getElementById('previewArea').style.display = 'none';
        dataToImport = [];
    } catch (e) {
        msg.innerHTML = `<div class="alert danger">Erro na importação: ${e.message}</div>`;
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Confirmar Importação';
    }
}

// DOWNLOAD MODELO
function downloadModelo() {
    const csvContent = "data:text/csv;charset=utf-8,Nome,WhatsApp\nJoão da Silva,11988887777\nMaria Oliveira,11977776666";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_alunos.csv");
    document.body.appendChild(link);
    link.click();
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

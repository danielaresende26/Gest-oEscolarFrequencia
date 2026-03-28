-- Enums
CREATE TYPE perfil_usuario AS ENUM ('professor', 'admin');
CREATE TYPE periodo_turma AS ENUM ('Manhã', 'Tarde', 'Noite');
CREATE TYPE tipo_dia AS ENUM ('aula', 'feriado', 'reuniao', 'recesso', 'fim_de_semana');
CREATE TYPE status_frequencia AS ENUM ('P', 'F', 'J');
CREATE TYPE alerta_tipo AS ENUM ('falta_simples', 'falta_recorrente', 'reuniao');
CREATE TYPE alerta_status AS ENUM ('pendente', 'enviado', 'erro');

-- Escolas
CREATE TABLE escolas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Turmas
CREATE TABLE turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    periodo periodo_turma NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dia_semana TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Alunos
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Contatos (Números de Contato / WhatsApp)
CREATE TABLE contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
    nome_contato TEXT NOT NULL,
    numero TEXT NOT NULL,
    parentesco TEXT,
    is_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuarios (Vinculado ao auth.users do Supabase Auth)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    perfil perfil_usuario NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendario de Aulas
CREATE TABLE calendario_aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo tipo_dia NOT NULL,
    descricao TEXT,
    gerado_automaticamente BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(turma_id, data)
);

-- Frequencias
CREATE TABLE frequencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
    calendario_id UUID REFERENCES calendario_aulas(id) ON DELETE CASCADE,
    status status_frequencia NOT NULL,
    preenchido_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(aluno_id, calendario_id)
);

-- Alertas WhatsApp
CREATE TABLE alertas_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
    tipo alerta_tipo NOT NULL,
    mensagem TEXT NOT NULL,
    enviado_em TIMESTAMPTZ,
    status alerta_status DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_whatsapp ENABLE ROW LEVEL SECURITY;

-- Helper Functions para identificar escola e perfil
CREATE OR REPLACE FUNCTION public.auth_user_escola_id() RETURNS UUID AS $$
  SELECT escola_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_user_perfil() RETURNS perfil_usuario AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas para usuários visualizarem e editarem apenas dentro da mesma escola
CREATE POLICY "view_all_same_escola" ON escolas FOR SELECT USING (id = auth_user_escola_id() OR auth_user_escola_id() IS NULL);

CREATE POLICY "turmas_select" ON turmas FOR SELECT USING (escola_id = auth_user_escola_id());
CREATE POLICY "turmas_all" ON turmas FOR ALL USING (auth_user_perfil() = 'admin' AND escola_id = auth_user_escola_id());

CREATE POLICY "alunos_select" ON alunos FOR SELECT USING (turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id()));
CREATE POLICY "alunos_all" ON alunos FOR ALL USING (auth_user_perfil() = 'admin' AND turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id()));

CREATE POLICY "contatos_select" ON contatos FOR SELECT USING (aluno_id IN (SELECT id FROM alunos WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id())));
CREATE POLICY "contatos_all" ON contatos FOR ALL USING (auth_user_perfil() = 'admin' AND aluno_id IN (SELECT id FROM alunos WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id())));

CREATE POLICY "calendario_select" ON calendario_aulas FOR SELECT USING (turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id()));
CREATE POLICY "calendario_all" ON calendario_aulas FOR ALL USING (auth_user_perfil() = 'admin' AND turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id()));

-- Controle de usuários
CREATE POLICY "usu_select" ON usuarios FOR SELECT USING (escola_id = auth_user_escola_id());
CREATE POLICY "usu_all" ON usuarios FOR ALL USING (auth_user_perfil() = 'admin' AND escola_id = auth_user_escola_id());

-- Frequências: Professores e Admins podem ler, inserir e atualizar
CREATE POLICY "freq_select" ON frequencias FOR SELECT USING (aluno_id IN (SELECT id FROM alunos WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id())));
CREATE POLICY "freq_insert" ON frequencias FOR INSERT WITH CHECK (aluno_id IN (SELECT id FROM alunos WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id())));
CREATE POLICY "freq_update" ON frequencias FOR UPDATE USING (aluno_id IN (SELECT id FROM alunos WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = auth_user_escola_id())));

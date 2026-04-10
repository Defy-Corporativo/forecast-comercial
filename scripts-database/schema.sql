
-- ============================================================
-- DROP de índices (ordem inversa de dependência)
-- ============================================================
DROP INDEX IF EXISTS idx_fcst_opportunities_display_priority;
DROP INDEX IF EXISTS idx_fcst_opportunity_forecasts_opportunity_id;
DROP INDEX IF EXISTS idx_fcst_opportunity_forecasts_period_start;
DROP INDEX IF EXISTS idx_fcst_opportunity_forecasts_period_end;
DROP INDEX IF EXISTS idx_fcst_opportunity_notes_opportunity_id;
DROP INDEX IF EXISTS idx_fcst_opportunity_notes_created_at;
DROP INDEX IF EXISTS idx_fcst_opportunity_notes_content;
DROP INDEX IF EXISTS idx_fcst_opportunity_tag_assignments_opportunity;
DROP INDEX IF EXISTS idx_fcst_opportunity_tag_assignments_tag;
DROP INDEX IF EXISTS idx_fcst_opportunities_is_goal;
DROP INDEX IF EXISTS idx_fcst_opportunities_is_potential;
DROP INDEX IF EXISTS idx_fcst_opportunity_actions_opportunity_id;
DROP INDEX IF EXISTS idx_fcst_opportunity_actions_responsible;
DROP INDEX IF EXISTS idx_fcst_opportunity_actions_status;
DROP INDEX IF EXISTS idx_fcst_opportunity_actions_due_date;
DROP INDEX IF EXISTS idx_pepl_responsibles_name;
DROP INDEX IF EXISTS idx_pepl_responsibles_is_active;

-- ============================================================
-- DROP de tabelas (ordem inversa de dependência)
-- ============================================================
DROP TABLE IF EXISTS fcst_opportunity_actions CASCADE;
DROP TABLE IF EXISTS fcst_opportunity_tag_assignments CASCADE;
DROP TABLE IF EXISTS fcst_opportunity_tags CASCADE;
DROP TABLE IF EXISTS fcst_opportunity_notes CASCADE;
DROP TABLE IF EXISTS fcst_custom_charts CASCADE;
DROP TABLE IF EXISTS fcst_opportunity_history CASCADE;
DROP TABLE IF EXISTS fcst_opportunity_forecasts CASCADE;
DROP TABLE IF EXISTS fcst_opportunities CASCADE;
DROP TABLE IF EXISTS fcst_stage_definitions CASCADE;
DROP TABLE IF EXISTS fcst_custom_fields CASCADE;
DROP TABLE IF EXISTS fcst_client_contacts CASCADE;
DROP TABLE IF EXISTS fcst_clients CASCADE;
DROP TABLE IF EXISTS fcst_user_preferences CASCADE;
DROP TABLE IF EXISTS fcst_profiles CASCADE;
DROP TABLE IF EXISTS pepl_responsibles CASCADE;

-- ============================================================
-- CRIAÇÃO DAS TABELAS
-- ============================================================

CREATE TABLE fcst_profiles (
  id text PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT 'user',
  last_login timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE fcst_clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  nickname text,
  document text,
  address text,
  notes text,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(name)
);

CREATE TABLE fcst_client_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES fcst_clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  position text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE fcst_custom_fields (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'percentage', 'currency', 'date', 'select', 'checkbox')),
  is_required boolean DEFAULT false,
  select_options jsonb,
  order_index integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE fcst_stage_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  color varchar(7) DEFAULT '#64748B',
  allowed_next_stages text[] DEFAULT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE fcst_opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_number text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  client_id uuid REFERENCES fcst_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  creation_date date NOT NULL DEFAULT CURRENT_DATE,
  stage text NOT NULL,
  responsible text,
  notes text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  is_goal boolean DEFAULT false,
  is_potential boolean DEFAULT false,
  billing_probability text DEFAULT 'baixa' CHECK (billing_probability IN ('alta', 'media', 'baixa')),
  display_priority integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_fcst_opportunities_display_priority ON fcst_opportunities(display_priority);

-- Tabela de previsões de faturamento (1 oportunidade : N forecasts)
CREATE TABLE fcst_opportunity_forecasts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES fcst_opportunities(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  estimated_value decimal(12, 2) NOT NULL,
  invoiced boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_fcst_opportunity_forecasts_opportunity_id ON fcst_opportunity_forecasts(opportunity_id);
CREATE INDEX idx_fcst_opportunity_forecasts_period_start ON fcst_opportunity_forecasts(period_start);
CREATE INDEX idx_fcst_opportunity_forecasts_period_end ON fcst_opportunity_forecasts(period_end);

CREATE TABLE fcst_opportunity_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES fcst_opportunities(id) ON DELETE CASCADE NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE fcst_user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_view text DEFAULT 'list' CHECK (default_view IN ('list', 'cards')),
  visible_columns jsonb,
  saved_filters jsonb,
  items_per_page integer DEFAULT 20,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO fcst_stage_definitions (name, description, order_index, color)
VALUES
('Pipeline', 'Oportunidades em prospecção inicial ou pipeline geral.', 0, '#9CA3AF'),
('Strong Upside', 'Oportunidades com forte probabilidade de avanço.', 1, '#3B82F6'),
('Committed', 'Oportunidades com previsão assumida para o período.', 2, '#2563EB'),
('Deal', 'Contrato fechado.', 3, '#10B981'),
('Lost', 'Oportunidades perdidas.', 4, '#6B7280');

CREATE TABLE fcst_custom_charts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE fcst_custom_charts IS 'Stores custom dashboard charts configuration';

CREATE TABLE fcst_opportunity_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES fcst_opportunities(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_fcst_opportunity_notes_opportunity_id ON fcst_opportunity_notes(opportunity_id);
CREATE INDEX idx_fcst_opportunity_notes_created_at ON fcst_opportunity_notes(created_at);
CREATE INDEX idx_fcst_opportunity_notes_content ON fcst_opportunity_notes USING gin(to_tsvector('portuguese', content));

-- Tabela de tags para categorização de oportunidades
CREATE TABLE fcst_opportunity_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Relacionamento N:N entre oportunidades e tags
CREATE TABLE fcst_opportunity_tag_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES fcst_opportunities(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES fcst_opportunity_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(opportunity_id, tag_id)
);

CREATE INDEX idx_fcst_opportunity_tag_assignments_opportunity ON fcst_opportunity_tag_assignments(opportunity_id);
CREATE INDEX idx_fcst_opportunity_tag_assignments_tag ON fcst_opportunity_tag_assignments(tag_id);
CREATE INDEX idx_fcst_opportunities_is_goal ON fcst_opportunities(is_goal);
CREATE INDEX idx_fcst_opportunities_is_potential ON fcst_opportunities(is_potential);

-- Tabela de ações para oportunidades
CREATE TABLE fcst_opportunity_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES fcst_opportunities(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  responsible text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_fcst_opportunity_actions_opportunity_id ON fcst_opportunity_actions(opportunity_id);
CREATE INDEX idx_fcst_opportunity_actions_responsible ON fcst_opportunity_actions(responsible);
CREATE INDEX idx_fcst_opportunity_actions_status ON fcst_opportunity_actions(status);
CREATE INDEX idx_fcst_opportunity_actions_due_date ON fcst_opportunity_actions(due_date);

-- Tabela de responsáveis (cadastro centralizado) — prefixo "pepl_" (people)
CREATE TABLE pepl_responsibles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_pepl_responsibles_name ON pepl_responsibles(name);
CREATE INDEX idx_pepl_responsibles_is_active ON pepl_responsibles(is_active);
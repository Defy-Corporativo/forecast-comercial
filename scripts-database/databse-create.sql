CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  id text PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT 'user',
  last_login timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  document text,
  address text,
  notes text,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(name)
);

CREATE TABLE client_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  position text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE custom_fields (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'percentage', 'currency', 'date', 'select', 'checkbox')),
  is_required boolean DEFAULT false,
  select_options jsonb,
  order_index integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE stage_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  color varchar(7) DEFAULT '#64748B',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_number text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  estimated_value decimal(12, 2) NOT NULL,
  creation_date date NOT NULL DEFAULT CURRENT_DATE,
  stage text NOT NULL,
  forecast_date date,
  growth_type text,
  growth_value decimal(12, 2),
  responsible text,
  notes text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  invoiced boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE opportunity_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_view text DEFAULT 'list' CHECK (default_view IN ('list', 'cards')),
  visible_columns jsonb,
  saved_filters jsonb,
  items_per_page integer DEFAULT 20,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO stage_definitions (name, description, order_index, color)
VALUES
('Pipeline', 'Oportunidades em prospecção inicial ou pipeline geral.', 0, '#9CA3AF'),
('Strong Upside', 'Oportunidades com forte probabilidade de avanço.', 1, '#3B82F6'),
('Committed', 'Oportunidades com previsão assumida para o período.', 2, '#2563EB'),
('Deal', 'Contrato fechado.', 3, '#10B981'),
('Lost', 'Oportunidades perdidas.', 4, '#6B7280');

CREATE TABLE custom_charts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE custom_charts IS 'Stores custom dashboard charts configuration';

CREATE TABLE opportunity_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_opportunity_notes_opportunity_id ON opportunity_notes(opportunity_id);
CREATE INDEX idx_opportunity_notes_created_at ON opportunity_notes(created_at);
CREATE INDEX idx_opportunity_notes_content ON opportunity_notes USING gin(to_tsvector('portuguese', content));
-- Drop helper function if exists (legacy)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    DROP FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- Drop tables in dependency order
DO $$ BEGIN IF to_regclass('public.opportunity_history') IS NOT NULL THEN DROP TABLE public.opportunity_history CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.opportunities') IS NOT NULL THEN DROP TABLE public.opportunities CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.custom_fields') IS NOT NULL THEN DROP TABLE public.custom_fields CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.client_contacts') IS NOT NULL THEN DROP TABLE public.client_contacts CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.clients') IS NOT NULL THEN DROP TABLE public.clients CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.companies') IS NOT NULL THEN DROP TABLE public.companies CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.user_preferences') IS NOT NULL THEN DROP TABLE public.user_preferences CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.stage_definitions') IS NOT NULL THEN DROP TABLE public.stage_definitions CASCADE; END IF; END; $$;
DO $$ BEGIN IF to_regclass('public.profiles') IS NOT NULL THEN DROP TABLE public.profiles CASCADE; END IF; END; $$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (auth-related)
CREATE TABLE profiles (
  id text PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT 'user',
  last_login timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Companies (sem vínculo obrigatório a login)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Clients
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

-- Client contacts
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

-- Custom fields (globais)
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

-- Stage definitions (globais)
CREATE TABLE stage_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  color varchar(7) DEFAULT '#64748B',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Opportunities (sem vínculo a login)
CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  estimated_value decimal(12, 2) NOT NULL,
  creation_date date NOT NULL DEFAULT CURRENT_DATE,
  stage text NOT NULL,
  forecast_date date,
  responsible text,
  notes text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  invoiced boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Opportunity history
CREATE TABLE opportunity_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User preferences (opcionais, sem FK obrigatória)
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_view text DEFAULT 'list' CHECK (default_view IN ('list', 'kanban')),
  visible_columns jsonb,
  saved_filters jsonb,
  items_per_page integer DEFAULT 20,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default stages (globais)
INSERT INTO stage_definitions (name, description, order_index, color)
VALUES
('Pipeline', 'Oportunidades em prospecção inicial ou pipeline geral.', 0, '#9CA3AF'),
('Strong Upside', 'Oportunidades com forte probabilidade de avanço.', 1, '#3B82F6'),
('Committed', 'Oportunidades com previsão assumida para o período.', 2, '#2563EB'),
('Deal', 'Contrato fechado.', 3, '#10B981'),
('Lost', 'Oportunidades perdidas.', 4, '#6B7280');

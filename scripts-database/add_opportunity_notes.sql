-- Migração: Criar tabela de notas de oportunidades
-- Data: 2025-11-28

-- Tabela de notas de oportunidades
CREATE TABLE IF NOT EXISTS opportunity_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para busca por oportunidade
CREATE INDEX IF NOT EXISTS idx_opportunity_notes_opportunity_id ON opportunity_notes(opportunity_id);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_opportunity_notes_created_at ON opportunity_notes(created_at);

-- Índice para busca full-text
CREATE INDEX IF NOT EXISTS idx_opportunity_notes_content ON opportunity_notes USING gin(to_tsvector('portuguese', content));


-- =============================================
-- MIGRATION: Adiciona tabelas de Ações e Responsáveis
-- Data: 2026-01-07
-- Descrição: Script incremental para adicionar as novas
--            tabelas sem afetar dados existentes
-- =============================================

-- Tabela de Responsáveis (cadastro centralizado)
CREATE TABLE IF NOT EXISTS responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para responsibles
CREATE INDEX IF NOT EXISTS idx_responsibles_name ON responsibles(name);
CREATE INDEX IF NOT EXISTS idx_responsibles_active ON responsibles(is_active);

-- Tabela de Ações de Oportunidades
CREATE TABLE IF NOT EXISTS opportunity_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    responsible TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para opportunity_actions
CREATE INDEX IF NOT EXISTS idx_opportunity_actions_opportunity ON opportunity_actions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_actions_responsible ON opportunity_actions(responsible);
CREATE INDEX IF NOT EXISTS idx_opportunity_actions_status ON opportunity_actions(status);

-- =============================================
-- HABILITAR RLS (Row Level Security)
-- =============================================

-- RLS para responsibles
ALTER TABLE responsibles ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados podem ver e gerenciar responsáveis
DROP POLICY IF EXISTS "Authenticated users can manage responsibles" ON responsibles;
CREATE POLICY "Authenticated users can manage responsibles" ON responsibles
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS para opportunity_actions
ALTER TABLE opportunity_actions ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados podem ver e gerenciar ações
DROP POLICY IF EXISTS "Authenticated users can manage opportunity actions" ON opportunity_actions;
CREATE POLICY "Authenticated users can manage opportunity actions" ON opportunity_actions
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- FIM DA MIGRATION
-- =============================================
-- Execute este script no Supabase SQL Editor
-- Não é necessário reiniciar nenhum serviço
-- =============================================

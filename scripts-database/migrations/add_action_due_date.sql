-- Migration: Adicionar campo due_date à tabela opportunity_actions
-- Descrição: Data de previsão de conclusão da ação

ALTER TABLE opportunity_actions ADD COLUMN due_date date;
CREATE INDEX idx_opportunity_actions_due_date ON opportunity_actions(due_date);

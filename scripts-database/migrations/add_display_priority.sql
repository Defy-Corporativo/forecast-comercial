-- Migration: Adicionar campo display_priority à tabela opportunities
-- Descrição: Campo para controlar a ordem de exibição na visão "Agrupado"
-- Maior número = aparece primeiro na lista

ALTER TABLE opportunities ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
CREATE INDEX idx_opportunities_display_priority ON opportunities(display_priority);

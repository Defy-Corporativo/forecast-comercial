-- Migration: Adicionar campo nickname à tabela clients
-- Descrição: Apelido do cliente para melhor visualização nas listagens

ALTER TABLE clients ADD COLUMN nickname text;

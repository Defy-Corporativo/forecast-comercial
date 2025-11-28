-- Migração: Adicionar campo title à tabela opportunities
-- Data: 2025-11-28

-- Adiciona a coluna title (pode ser NULL inicialmente para não quebrar dados existentes)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS title text;

-- Atualiza registros existentes para usar o nome do cliente como título padrão
UPDATE opportunities SET title = client_name WHERE title IS NULL;

-- Agora torna o campo NOT NULL (após garantir que todos os registros têm valor)
ALTER TABLE opportunities ALTER COLUMN title SET NOT NULL;

-- Adiciona um valor default para novas inserções sem título
ALTER TABLE opportunities ALTER COLUMN title SET DEFAULT '';


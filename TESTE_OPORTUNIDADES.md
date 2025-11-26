# Instruções para Testar o Sistema de Oportunidades

## 1. Verificar Banco de Dados

Antes de testar, certifique-se de que o banco está configurado:

1. Acesse o Supabase SQL Editor
2. Execute o arquivo `schema.sql` se for um banco novo, OU
3. Execute `migration_clients.sql` e depois `migration_update_clients.sql` se já tem dados

## 2. Iniciar a Aplicação

```bash
npm run dev
```

## 3. Testar Cadastro de Clientes

1. Acesse o menu "Clientes"
2. Clique em "Nova Empresa"
3. Preencha:
   - Nome da Empresa: Teste Empresa Ltda
   - CNPJ: 12.345.678/0001-90
   - Endereço: Rua Teste, 123
4. Adicione um representante:
   - Nome: João Silva
   - Cargo: Gerente
   - Email: joao@teste.com
   - Telefone: (11) 98765-4321
   - Marque como "Principal" (estrela)
5. Clique em "Salvar"
6. Verifique se a empresa aparece na lista

## 4. Testar Criação de Oportunidade

1. Acesse o menu "Oportunidades"
2. Clique em "Nova Oportunidade"
3. No campo "Cliente / Empresa":
   - Digite "Teste" no campo de busca
   - Clique na empresa que acabou de criar
   - Verifique se aparece "✓ Cliente selecionado" em verde
   - Verifique se o campo fica com fundo azul claro
   - Verifique se aparecem os dados do contato principal abaixo
4. Preencha os outros campos:
   - Valor Estimado: 50000
   - Estágio: Pipeline
   - Data de Previsão: (selecione uma data futura)
   - Responsável: Seu nome
   - Observações: Teste de oportunidade
5. Clique em "Salvar Oportunidade"

## 5. Verificar se Salvou

- Abra o Console do Navegador (F12)
- Veja se aparecem logs como:
  ```
  Salvando oportunidade com dados: { ... }
  Oportunidade criada: { ... }
  ```
- A oportunidade deve aparecer na lista
- Se houver erro, verifique a mensagem detalhada no alert

## 6. Possíveis Problemas e Soluções

### Erro: "Por favor, selecione um cliente da lista"
- **Causa**: Você digitou mas não clicou em um cliente da lista dropdown
- **Solução**: Sempre clique no nome da empresa que aparecer na lista

### Erro relacionado a RLS (Row Level Security)
- **Causa**: As políticas do banco não estão configuradas
- **Solução**: Execute o `schema.sql` novamente

### Erro: "duplicate key value violates unique constraint"
- **Causa**: Já existe uma oportunidade com o mesmo número
- **Solução**: Verifique se o banco está gerando números corretamente

### Oportunidade não aparece na lista
- **Causa**: Pode estar filtrada ou erro ao recarregar
- **Solução**:
  1. Limpe todos os filtros
  2. Recarregue a página (F5)
  3. Verifique o console por erros

## 7. Debug Adicional

Se ainda houver problemas:

1. Abra o Console do Navegador (F12)
2. Vá para a aba "Network"
3. Filtre por "supabase"
4. Tente criar uma oportunidade
5. Verifique as requisições HTTP:
   - Se retornou 201 (criado) = sucesso
   - Se retornou 400/401/403 = problema de validação ou permissão
   - Se retornou 500 = erro no servidor

## 8. Verificar Diretamente no Supabase

1. Acesse o Supabase Table Editor
2. Abra a tabela `opportunities`
3. Verifique se a oportunidade foi criada
4. Verifique se os campos `client_id` e `client_name` estão preenchidos

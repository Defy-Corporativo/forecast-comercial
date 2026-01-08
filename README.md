# Forecast Comercial 

## Descrição
Sistema web para gestão e acompanhamento de oportunidades comerciais (pipeline de vendas), permitindo consolidação de informações, previsão de receita e acompanhamento do funil de vendas.

## Tecnologias
- **Frontend**: React 19 + Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **Estilização**: CSS Vanilla com CSS Modules
- **Bibliotecas**: React Router, Recharts, @hello-pangea/dnd

## Pré-requisitos

### 1. Configurar Supabase

Antes de rodar a aplicação, você precisa configurar o Supabase:

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto
3. Vá em **Settings** → **API** e copie:
   - `Project URL` (sua URL do Supabase)
   - `anon/public key` (chave pública)

4. Vá em **SQL Editor** e execute o script `schema.sql` que está na raiz do projeto para criar as tabelas e políticas.

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto e adicione suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
```

## Como Rodar

### Opção 1: Localmente (npm)

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Opção 2: Docker

```bash
# Subir container (usa Node 22)
docker compose up --build
```

A aplicação estará disponível em `http://localhost:3000`

## Funcionalidades

### ✅ Autenticação
- Login e cadastro de usuários
- Recuperação de senha
- Sessão persistente

### ✅ Dashboard
- Métricas do pipeline (valor total, número de oportunidades, ticket médio, taxa de conversão)
- Gráficos interativos (funil de vendas, distribuição por estágio)

### ✅ Gestão de Oportunidades
- **Visualização em Lista**: Tabela com ordenação e ações rápidas
- **Visualização Kanban**: Arrastar e soltar entre estágios
- Formulário dinâmico com campos customizáveis
- Campos obrigatórios: Cliente, Valor, Estágio, Data de Previsão
- Vinculação com cadastro de clientes
- Exibição de informações de contato do cliente (email, telefone)

### ✅ Cadastro de Clientes
- Gerenciamento completo de clientes
- Campos: Nome, Email, Telefone, CNPJ/CPF, Endereço, Observações
- Busca por nome, email, telefone ou documento
- Vinculação automática com oportunidades
- Criação rápida de clientes diretamente do formulário de oportunidades

### ✅ Configurações
- **Clientes**: Cadastro e gerenciamento de clientes
- **Campos Customizados**: Criar campos personalizados (texto, número, data, select, checkbox)
- **Estágios**: Configurar os estágios do pipeline com descrições

### ✅ UI/UX
- Menu lateral retrátil (clique no ícone para expandir/recolher)
- Design responsivo (mobile, tablet, desktop)
- Paleta de cores profissional e moderna
- Transições suaves

## Estrutura do Projeto

```
src/
├── components/
│   ├── auth/          # Login, Register, ProtectedRoute
│   ├── dashboard/     # Dashboard, MetricsCard, Charts
│   ├── layout/        # Sidebar, Header, MainLayout
│   ├── opportunities/ # List, Kanban, Form
│   └── settings/      # CustomFields, StageSettings, ViewSettings
├── contexts/          # AuthContext, StageContext
├── services/          # supabaseClient, settingsService, opportunityService
├── styles/            # variables.css, global.css
└── App.jsx
```

## Próximos Passos

- [ ] Implementar histórico de alterações
- [ ] Adicionar filtros avançados
- [ ] Exportação de relatórios (CSV/Excel)
- [ ] Notificações e alertas
- [ ] Múltiplos usuários/equipes

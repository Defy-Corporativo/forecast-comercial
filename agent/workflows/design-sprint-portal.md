---
description: Design Sprint para criação de portais corporativos padronizados com layout unificado
---

# 🎨 Design Sprint - Portal Corporativo Padrão

Este documento descreve o padrão de design, estrutura e comportamentos para criação de novos portais corporativos com layout unificado. Seguindo estas diretrizes, você conseguirá criar portais visualmente consistentes, mantendo a identidade corporativa.

---

## 1. Estrutura Geral do Layout

### 1.1 Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIEWPORT                                 │
│ ┌──────────┬─────────────────────────────────────────────────┐  │
│ │          │                   HEADER (72px)                  │  │
│ │          │  Logo/Empresa │                    │ User Info   │  │
│ │ SIDEBAR  ├─────────────────────────────────────────────────┤  │
│ │  (260px  │                                                  │  │
│ │    ou    │                                                  │  │
│ │   70px)  │               ÁREA DE CONTEÚDO                   │  │
│ │          │                  (Outlet)                        │  │
│ │ • Nav 1  │                                                  │  │
│ │ • Nav 2  │            [LIVRE PARA CADA PROJETO]             │  │
│ │ • Nav 3  │                                                  │  │
│ │ • Nav 4  │                                                  │  │
│ │          │                                                  │  │
│ └──────────┴─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Componentes Necessários

| Arquivo | Descrição |
|---------|-----------|
| `MainLayout.jsx` | Componente principal que orquestra sidebar, header e área de conteúdo |
| `Sidebar.jsx` | Menu lateral de navegação |
| `Header.jsx` | Cabeçalho com logo, nome da empresa e informações do usuário |
| `Layout.module.css` | Estilos de todos os componentes de layout |
| `variables.css` | Design tokens (cores, espaçamentos, tipografia, etc.) |
| `global.css` | Estilos globais e classes utilitárias |

---

## 2. Menu Lateral (Sidebar)

### 2.1 Dimensões

| Estado | Largura | Comportamento |
|--------|---------|---------------|
| **Expandido** | 260px | Mostra ícones e labels |
| **Colapsado** | 70px | Mostra apenas ícones com tooltips |
| **Mobile** | 280px (slide-in) | Aparece sobre overlay escurecido |

### 2.2 Estrutura Visual

```
┌─────────────────────────────┐
│  🎯 App Name              ◀ │  ← Header com logo/nome do app + botão toggle
│  Tagline                    │
├─────────────────────────────┤
│  │  📊 Painel               │  ← Item ativo (com indicador azul lateral)
│     📁 Item 2               │
│     📋 Item 3               │
│     👥 Item 4               │
│     ⚙️ Configurações        │
│                             │
│                             │
└─────────────────────────────┘
```

### 2.3 Estilos CSS do Sidebar

```css
/* Sidebar Base */
.sidebar {
    width: 260px;
    background-color: var(--bg-sidebar);           /* #FFFFFF */
    border-right: 1px solid var(--border-color-light);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    z-index: 100;
    transition: all var(--transition-slow);        /* 300ms */
    box-shadow: var(--shadow-sm);
}

.sidebar.collapsed {
    width: 70px;
}

/* Sidebar Header */
.sidebarHeader {
    min-height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color-light);
    background: var(--bg-sidebar);
    gap: 12px;
}

/* Brand Area - Ícone do App + Nome */
.appBrand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.appIcon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.appName {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}

.appTagline {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
```

### 2.4 Navegação - Itens do Menu

```css
.nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.navItem {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--text-secondary);
    font-weight: 500;
    transition: all var(--transition-base);
    text-decoration: none;
    white-space: nowrap;
    border-radius: var(--border-radius-sm);        /* 8px */
    margin: 0 4px;
    position: relative;
}

.navItem:hover {
    background-color: var(--bg-hover);             /* #F1F5F9 */
    color: var(--text-primary);
    transform: translateX(2px);
}

/* Item Ativo - com barra lateral azul */
.navItem.active {
    background-color: var(--color-primary-light);  /* #EFF6FF */
    color: var(--color-primary);                   /* #2563EB */
    font-weight: 600;
}

.navItem.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background-color: var(--color-primary);
    border-radius: 0 2px 2px 0;
}
```

### 2.5 Comportamento JavaScript

```jsx
// Estado de colapso - inicia colapsado
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
};

// Props passadas ao Sidebar
<Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
```

### 2.6 Responsividade Mobile

```css
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
        z-index: 200;
    }

    .sidebar:not(.collapsed) {
        transform: translateX(0);
        width: 280px;
        box-shadow: var(--shadow-xl);
    }

    /* Overlay escurecido quando menu aberto */
    .sidebarOverlay {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 199;
    }
}
```

---

## 3. Cabeçalho (Header)

### 3.1 Dimensões e Posicionamento

| Propriedade | Valor |
|-------------|-------|
| Altura | 72px (desktop), 64px (mobile) |
| Posição | sticky, top: 0 |
| z-index | 90 |
| Padding | 0 32px (desktop), 0 20px (mobile) |

### 3.2 Estrutura Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  [LOGO]  Nome Empresa  │                           │  Nome  [Avatar]  │
│  ↑                        │                           │          ↓       │
│  Mobile only              │                           │   Dropdown menu  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Estilos CSS do Header

```css
.header {
    height: 72px;
    background-color: var(--bg-secondary);          /* #FFFFFF */
    border-bottom: 1px solid var(--border-color-light);
    display: flex;
    align-items: center;
    padding: 0 32px;
    position: sticky;
    top: 0;
    z-index: 90;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
}

.headerContent {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.headerLeft {
    display: flex;
    align-items: center;
    gap: 16px;
}

/* Logo Container */
.logoContainer {
    display: flex;
    align-items: center;
    gap: 12px;
}

.companyLogo {
    height: 48px;
    max-width: 180px;
    object-fit: contain;
}

.companyName {
    font-size: 13px;
    color: var(--text-tertiary);
    font-weight: 500;
    padding-left: 12px;
    border-left: 1px solid var(--border-color-light);
}

/* Título padrão quando não há logo */
.pageTitle {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
}
```

### 3.4 Área do Usuário

```css
.userInfo {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
}

.userName {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.userAvatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #e2e8f0;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    cursor: pointer;
}

/* Dropdown Menu do Usuário */
.userMenu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
    min-width: 200px;
    border: 1px solid var(--border-color-light);
    z-index: 1000;
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### 3.5 Botão Menu Mobile

```css
.mobileMenuBtn {
    display: none;           /* Oculto por padrão */
    background: var(--bg-hover);
    border: none;
    padding: 8px;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    color: var(--text-primary);
}

@media (max-width: 768px) {
    .mobileMenuBtn {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .userName {
        display: none;       /* Oculta nome em mobile */
    }
}
```

---

## 4. Design Tokens (Variáveis CSS)

### 4.1 Cores Principais

```css
:root {
    /* Cores Primárias */
    --color-primary: #2563EB;
    --color-primary-hover: #1D4ED8;
    --color-primary-light: #EFF6FF;
    
    /* Cores Secundárias */
    --color-secondary: #64748B;
    
    /* Cores de Estado */
    --color-success: #10B981;
    --color-success-light: #D1FAE5;
    --color-danger: #EF4444;
    --color-danger-light: #FEE2E2;
    --color-warning: #F59E0B;
    --color-warning-light: #FEF3C7;
    --color-info: #3B82F6;
    --color-info-light: #DBEAFE;
}
```

### 4.2 Backgrounds

```css
:root {
    --bg-main: #F8FAFC;        /* Fundo geral da página */
    --bg-secondary: #FFFFFF;    /* Cards e header */
    --bg-sidebar: #FFFFFF;      /* Sidebar */
    --bg-input: #FFFFFF;        /* Inputs */
    --bg-hover: #F1F5F9;        /* Hover states */
    --bg-active: #EFF6FF;       /* Estados ativos */
}
```

### 4.3 Textos

```css
:root {
    --text-primary: #0F172A;    /* Textos principais */
    --text-secondary: #64748B;  /* Textos secundários */
    --text-tertiary: #94A3B8;   /* Hints, placeholders */
    --text-light: #F8FAFC;      /* Texto sobre fundos escuros */
}
```

### 4.4 Bordas e Sombras

```css
:root {
    /* Bordas */
    --border-color: #E2E8F0;
    --border-color-light: #F1F5F9;
    --border-radius-sm: 8px;
    --border-radius-md: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 20px;
    
    /* Sombras */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### 4.5 Espaçamentos

```css
:root {
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;
}
```

### 4.6 Tipografia

```css
:root {
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    --font-size-xs: 12px;
    --font-size-sm: 13px;
    --font-size-md: 14px;
    --font-size-lg: 16px;
    --font-size-xl: 20px;
    --font-size-2xl: 24px;
    --font-size-3xl: 30px;
}
```

### 4.7 Transições

```css
:root {
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 5. Componente MainLayout (Orquestrador)

### 5.1 Estrutura Completa

```jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';

const MainLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className={styles.layout}>
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
            <div className={`${styles.mainContent} ${isSidebarCollapsed ? styles.expanded : ''}`}>
                <Header onMenuToggle={toggleSidebar} />
                <main className={styles.pageContent}>
                    <Outlet />  {/* ÁREA LIVRE - CONTEÚDO DE CADA PROJETO */}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
```

### 5.2 Estilos do Layout Principal

```css
.layout {
    display: flex;
    min-height: 100vh;
    background-color: var(--bg-main);
}

.mainContent {
    flex: 1;
    margin-left: 260px;
    display: flex;
    flex-direction: column;
    transition: margin-left var(--transition-slow);
}

.mainContent.expanded {
    margin-left: 70px;
}

.pageContent {
    padding: 32px;
    flex: 1;
    background-color: var(--bg-main);
}

@media (max-width: 768px) {
    .mainContent {
        margin-left: 0;
    }
    
    .mainContent.expanded {
        margin-left: 0;
    }
    
    .pageContent {
        padding: 20px;
    }
}
```

---

## 6. Classes Utilitárias Globais

### 6.1 Cards

```css
.card {
    background-color: var(--bg-secondary);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-color);
    transition: all var(--transition-base);
}

.card:hover {
    box-shadow: var(--shadow-md);
}
```

### 6.2 Botões

```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    transition: all var(--transition-base);
    border: none;
    font-size: var(--font-size-md);
    cursor: pointer;
    gap: 8px;
}

.btn-primary {
    background-color: var(--color-primary);
    color: white;
}

.btn-primary:hover {
    background-color: var(--color-primary-hover);
    transform: translateY(-1px);
}

.btn-secondary {
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.btn-danger {
    background-color: var(--color-danger);
    color: white;
}
```

### 6.3 Inputs

```css
.input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-md);
    transition: all var(--transition-base);
    background-color: var(--bg-input);
}

.input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}

.label {
    display: block;
    margin-bottom: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
}
```

---

## 7. Biblioteca de Ícones

Utilizamos a biblioteca **Lucide React** para ícones consistentes:

```bash
npm install lucide-react
```

### 7.1 Ícones Comuns

```jsx
import { 
    LayoutDashboard,   // Dashboard
    Briefcase,         // Negócios/Oportunidades
    Settings,          // Configurações
    Menu,              // Menu hamburger
    ChevronLeft,       // Colapsar
    Building2,         // Empresas/Clientes
    TrendingUp,        // Tendências/Forecast
    LogOut,            // Logout
    User,              // Usuário
    CheckSquare        // Ações/Tarefas
} from 'lucide-react';

// Uso: <LayoutDashboard size={20} />
```

---

## 8. Checklist para Novo Portal

### 8.1 Arquivos Obrigatórios

- [ ] `src/styles/variables.css` - Design tokens
- [ ] `src/styles/global.css` - Estilos globais
- [ ] `src/components/layout/MainLayout.jsx`
- [ ] `src/components/layout/Sidebar.jsx`
- [ ] `src/components/layout/Header.jsx`
- [ ] `src/components/layout/Layout.module.css`

### 8.2 Personalização por Projeto

| Item | Descrição |
|------|-----------|
| **Nome do App** | Alterar em `Sidebar.jsx` → `appName` e `appTagline` |
| **Ícone do App** | Alterar gradiente em `.appIcon` e ícone Lucide |
| **Itens do Menu** | Adicionar/remover NavLinks em `Sidebar.jsx` |
| **Logo da Empresa** | Carregado dinamicamente no `Header.jsx` |
| **Cor Primária** | Alterar `--color-primary` em `variables.css` |

### 8.3 Dependências

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "lucide-react": "^0.x"
  }
}
```

---

## 9. Referência Rápida de Cores

| Token | Cor | Uso |
|-------|-----|-----|
| `--color-primary` | #2563EB | Botões principais, links ativos |
| `--color-primary-hover` | #1D4ED8 | Hover de primários |
| `--color-success` | #10B981 | Sucesso, confirmação |
| `--color-danger` | #EF4444 | Erros, exclusão |
| `--color-warning` | #F59E0B | Alertas |
| `--bg-main` | #F8FAFC | Fundo geral |
| `--bg-secondary` | #FFFFFF | Cards, modais |
| `--text-primary` | #0F172A | Textos principais |
| `--text-secondary` | #64748B | Textos secundários |
| `--border-color` | #E2E8F0 | Bordas padrão |

---

## 10. Exemplo de Estrutura de Pastas

```
src/
├── components/
│   └── layout/
│       ├── MainLayout.jsx
│       ├── Sidebar.jsx
│       ├── Header.jsx
│       └── Layout.module.css
├── styles/
│   ├── variables.css
│   └── global.css
├── pages/
│   ├── Dashboard/
│   ├── [Módulo1]/
│   └── [Módulo2]/
├── contexts/
│   └── AuthContext.jsx
├── services/
│   └── api.js
├── App.jsx
└── main.jsx
```

---

> [!TIP]
> **Dica de Produtividade**: Copie toda a pasta `components/layout/` e `styles/` para iniciar um novo portal rapidamente. Apenas ajuste os itens de navegação e cores conforme necessário.

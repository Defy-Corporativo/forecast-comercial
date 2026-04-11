#!/usr/bin/env python3
"""
Script de Migração de Dados - Forecast Comercial
=================================================
Migra dados do Supabase Origem para o Supabase Destino.

NOTA: Antes de inserir cada tabela, faz um DELETE em todos os registros
      do destino (ordem reversa para respeitar FKs), garantindo idempotência.

Mapeamento de tabelas:
  profiles                  -> fcst_profiles
  clients                   -> fcst_clients
  client_contacts           -> fcst_client_contacts
  custom_fields             -> fcst_custom_fields
  stage_definitions         -> fcst_stage_definitions
  opportunities             -> fcst_opportunities
  opportunity_forecasts     -> fcst_opportunity_forecasts
  opportunity_history       -> fcst_opportunity_history
  user_preferences          -> fcst_user_preferences
  custom_charts             -> fcst_custom_charts
  opportunity_notes         -> fcst_opportunity_notes
  opportunity_tags          -> fcst_opportunity_tags
  opportunity_tag_assignments -> fcst_opportunity_tag_assignments
  opportunity_actions       -> fcst_opportunity_actions
  responsibles              -> pepl_responsibles

Se alguma tabela retornar 0 registros da origem mesmo devendo ter dados,
o problema é RLS (Row Level Security) bloqueando a chave anon.
Nesse caso, adicione a service_role key nas variáveis ORIGEM_SERVICE_KEY abaixo.
"""

import sys
import os
import json
import time
from datetime import datetime

# ---------------------------------------------------------------------------
# Tenta importar supabase, orienta instalação se necessário
# ---------------------------------------------------------------------------
try:
    from supabase import create_client, Client
except ImportError:
    print("❌  Biblioteca 'supabase' não encontrada.")
    print("    Instale com: pip install supabase")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Credenciais
# ---------------------------------------------------------------------------

# --- ORIGEM ---
ORIGEM_URL  = "https://iugjnefiuqxtlggkzvmw.supabase.co"
ORIGEM_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Z2puZWZpdXF4dGxnZ2t6dm13Iiwi"
    "cm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjM4MjYsImV4cCI6MjA4MDI5OTgyNn0"
    ".eIiv2di1sl2pa8cpKlbiRMp2QGVZyiXlWj7koKkF17k"
)

# Se a origem usar RLS, preencha aqui a service_role key do Supabase Origem:
# (Painel Supabase → Settings → API → service_role key)
ORIGEM_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Z2puZWZpdXF4dGxnZ2t6dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDcyMzgyNiwiZXhwIjoyMDgwMjk5ODI2fQ.iN0W5dvD8fukOMW1nqnKhMA1qkOIAzgMM4CeSL2IDIc"   # ← preencha se as tabelas retornarem 0 registros indevidos

# --- DESTINO (lê do .env da aplicação se existir, senão usa valor fixo) ---
DESTINO_URL = "https://uvjoslhhikvxkpjnxyvk.supabase.co"
DESTINO_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2am9zbGhoaWt2eGtwam54eXZrIiwi"
    "cm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ4MTcsImV4cCI6MjA4Mzc0MDgxN30"
    ".-EFp1a_gEpoe8b-fhgbEHYw09fY9jE-X3iEicVmp_-w"
)

# Tenta sobrescrever com variáveis do .env da aplicação
_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
if os.path.exists(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                DESTINO_URL = line.split("=", 1)[1].strip()
            elif line.startswith("SUPABASE_ANON_KEY="):
                DESTINO_KEY = line.split("=", 1)[1].strip()

# ---------------------------------------------------------------------------
# Ordem de migração (respeita dependências de FK)
# Formato: (tabela_origem, tabela_destino, campo_para_delete)
# campo_para_delete: campo NOT NULL usado como filtro no DELETE (impossível ser nulo)
# ---------------------------------------------------------------------------
TABELAS = [
    # Tabelas sem dependências externas primeiro
    ("profiles",                    "fcst_profiles",                  "id"),
    ("clients",                     "fcst_clients",                   "id"),
    ("custom_fields",               "fcst_custom_fields",             "id"),
    ("stage_definitions",           "fcst_stage_definitions",         "id"),
    ("opportunity_tags",            "fcst_opportunity_tags",          "id"),
    ("responsibles",                "pepl_responsibles",              "id"),
    ("user_preferences",            "fcst_user_preferences",          "id"),
    # Tabelas com FK para clients
    ("client_contacts",             "fcst_client_contacts",           "id"),
    # Tabelas com FK para clients + stage_definitions
    ("opportunities",               "fcst_opportunities",             "id"),
    # Tabelas com FK para opportunities
    ("opportunity_forecasts",       "fcst_opportunity_forecasts",     "id"),
    ("opportunity_history",         "fcst_opportunity_history",       "id"),
    ("opportunity_notes",           "fcst_opportunity_notes",         "id"),
    ("opportunity_actions",         "fcst_opportunity_actions",       "id"),
    ("opportunity_tag_assignments", "fcst_opportunity_tag_assignments", "id"),
    # Tabela sem FK
    ("custom_charts",               "fcst_custom_charts",             "id"),
]

TAMANHO_LOTE = 500   # registros por lote

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(msg: str, nivel: str = "INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    prefixos = {"INFO": "ℹ️ ", "OK": "✅", "WARN": "⚠️ ", "ERROR": "❌"}
    print(f"[{ts}] {prefixos.get(nivel, '')} {msg}")


def buscar_todos(cliente: Client, tabela: str) -> list:
    """Busca todos os registros de uma tabela com paginação."""
    todos = []
    offset = 0
    while True:
        resp = (
            cliente.table(tabela)
            .select("*")
            .range(offset, offset + TAMANHO_LOTE - 1)
            .execute()
        )
        dados = resp.data or []
        todos.extend(dados)
        if len(dados) < TAMANHO_LOTE:
            break
        offset += TAMANHO_LOTE
    return todos


def limpar_tabela(cliente: Client, tabela: str, campo_id: str = "id"):
    """
    Deleta todos os registros da tabela de destino antes de inserir.
    Usa filtro 'campo_id != IMPOSSIBLE_VALUE' para contornar a exigência
    de filtro obrigatório do PostgREST.
    """
    VALOR_IMPOSSIVEL = "00000000-0000-0000-0000-000000000000"
    try:
        # Tenta com valor UUID impossível (funciona para uuid e text)
        resp = (
            cliente.table(tabela)
            .delete()
            .neq(campo_id, VALOR_IMPOSSIVEL)
            .execute()
        )
        deletados = len(resp.data or [])
        if deletados > 0:
            log(f"  🗑️  {deletados} registro(s) removido(s) do destino antes do insert.")
        else:
            log(f"  🗑️  Destino já estava vazio.")
    except Exception as exc:
        log(f"  Não foi possível limpar '{tabela}': {exc}", "WARN")
        log(f"  Continuando com UPSERT (pode causar duplicatas se houver dados).", "WARN")


def inserir_lote(cliente: Client, tabela: str, registros: list) -> int:
    """Insere registros em lotes. Retorna número de registros inseridos."""
    inseridos = 0
    for i in range(0, len(registros), TAMANHO_LOTE):
        lote = registros[i : i + TAMANHO_LOTE]
        resp = cliente.table(tabela).upsert(lote).execute()
        inseridos += len(resp.data or [])
    return inseridos


# ---------------------------------------------------------------------------
# Migração principal
# ---------------------------------------------------------------------------

def migrar():
    print("=" * 65)
    print("  MIGRAÇÃO DE DADOS - FORECAST COMERCIAL")
    print("=" * 65)
    print(f"  Origem  : {ORIGEM_URL}")
    print(f"  Destino : {DESTINO_URL}")
    print(f"  Tabelas : {len(TABELAS)}")
    print("=" * 65)
    print()

    # Aviso sobre RLS
    if not ORIGEM_SERVICE_KEY:
        print("ℹ️  Usando chave ANON na origem. Se algumas tabelas retornarem")
        print("   0 registros indevidamente, configure ORIGEM_SERVICE_KEY no script.")
        print()

    # Confirmação de segurança
    print("⚠️  ATENÇÃO: Este script irá:")
    print("   1. DELETAR todos os dados existentes nas tabelas de destino")
    print("   2. Reinserir todos os dados da origem")
    print()
    confirmacao = input("   Digite 'CONFIRMAR' para prosseguir: ").strip()
    if confirmacao != "CONFIRMAR":
        print("\n❌  Migração cancelada pelo usuário.")
        sys.exit(0)
    print()

    # Conecta aos dois Supabase
    try:
        log("Conectando ao Supabase Origem...")
        chave_origem = ORIGEM_SERVICE_KEY if ORIGEM_SERVICE_KEY else ORIGEM_KEY
        origem = create_client(ORIGEM_URL, chave_origem)
        if ORIGEM_SERVICE_KEY:
            log("  Usando SERVICE ROLE KEY na origem (bypass RLS).", "OK")
        log("Conectando ao Supabase Destino...")
        destino = create_client(DESTINO_URL, DESTINO_KEY)
        log("Conexões estabelecidas com sucesso.\n", "OK")
    except Exception as exc:
        log(f"Falha ao conectar: {exc}", "ERROR")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # ETAPA 1: Limpa o destino em ordem REVERSA (respeitar FK ao deletar)
    # -----------------------------------------------------------------------
    print(f"{'─' * 65}")
    log("ETAPA 1: Limpando tabelas de destino (ordem reversa de FK)...")
    print()

    for tabela_orig, tabela_dest, campo_id in reversed(TABELAS):
        log(f"  Limpando {tabela_dest}...")
        limpar_tabela(destino, tabela_dest, campo_id)
        time.sleep(0.1)

    print()

    # -----------------------------------------------------------------------
    # ETAPA 2: Migra os dados
    # -----------------------------------------------------------------------
    print(f"{'─' * 65}")
    log("ETAPA 2: Inserindo dados da origem no destino...")
    print()

    resumo = []
    erro_total = 0

    for tabela_orig, tabela_dest, campo_id in TABELAS:
        print(f"{'─' * 65}")
        log(f"Migrando  {tabela_orig}  →  {tabela_dest}")

        # 1. Busca dados na origem
        try:
            registros = buscar_todos(origem, tabela_orig)
        except Exception as exc:
            log(f"  Erro ao ler '{tabela_orig}': {exc}", "ERROR")
            resumo.append({"tabela": tabela_orig, "lidos": 0, "inseridos": 0, "status": "ERRO LEITURA"})
            erro_total += 1
            continue

        total_lidos = len(registros)
        log(f"  {total_lidos} registro(s) lido(s) na origem.")

        if total_lidos == 0:
            log(f"  Nenhum dado — tabela vazia ou bloqueada por RLS.", "WARN")
            if not ORIGEM_SERVICE_KEY:
                log(f"  → Configure ORIGEM_SERVICE_KEY no script para ignorar RLS.", "WARN")
            resumo.append({"tabela": tabela_orig, "lidos": 0, "inseridos": 0,
                           "status": "VAZIO/RLS"})
            continue

        # 2. Insere no destino
        try:
            inseridos = inserir_lote(destino, tabela_dest, registros)
            log(f"  {inseridos} registro(s) inserido(s) no destino.", "OK")
            resumo.append({"tabela": tabela_orig, "lidos": total_lidos, "inseridos": inseridos,
                           "status": "OK"})
        except Exception as exc:
            log(f"  Erro ao inserir em '{tabela_dest}': {exc}", "ERROR")
            resumo.append({"tabela": tabela_orig, "lidos": total_lidos, "inseridos": 0,
                           "status": "ERRO ESCRITA"})
            erro_total += 1

        time.sleep(0.2)

    # ---------------------------------------------------------------------------
    # Relatório final
    # ---------------------------------------------------------------------------
    print()
    print("=" * 65)
    print("  RELATÓRIO FINAL")
    print("=" * 65)
    print(f"  {'TABELA ORIGEM':<35} {'LIDOS':>6} {'INSERIDOS':>9}  STATUS")
    print(f"  {'─' * 35} {'─' * 6} {'─' * 9}  {'─' * 14}")
    for r in resumo:
        if r["status"] == "OK":
            icone = "✅"
        elif r["status"] in ("VAZIO/RLS", "VAZIO"):
            icone = "⚠️ "
        else:
            icone = "❌"
        print(f"  {r['tabela']:<35} {r['lidos']:>6} {r['inseridos']:>9}  {icone} {r['status']}")
    print("=" * 65)

    tabelas_rls = [r for r in resumo if "RLS" in r["status"]]
    if tabelas_rls and not ORIGEM_SERVICE_KEY:
        print()
        print("⚠️  ATENÇÃO: As tabelas abaixo retornaram 0 registros.")
        print("   Isso pode ser bloqueio de RLS. Para corrigir:")
        print("   1. Acesse o painel Supabase da ORIGEM")
        print("   2. Vá em Settings → API → copie a 'service_role secret'")
        print("   3. Cole em ORIGEM_SERVICE_KEY no topo deste script")
        print("   4. Execute novamente")
        for r in tabelas_rls:
            print(f"      → {r['tabela']}")

    if erro_total == 0:
        print("\n✅  Migração concluída com sucesso!")
    else:
        print(f"\n⚠️   Migração finalizada com {erro_total} erro(s). Verifique os logs acima.")

    # Salva log em arquivo
    log_path = os.path.join(os.path.dirname(__file__), "migracao_log.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump({
            "executado_em": datetime.now().isoformat(),
            "origem": ORIGEM_URL,
            "destino": DESTINO_URL,
            "resumo": resumo,
            "erros": erro_total,
        }, f, ensure_ascii=False, indent=2)
    log(f"Log salvo em: {log_path}")


if __name__ == "__main__":
    migrar()

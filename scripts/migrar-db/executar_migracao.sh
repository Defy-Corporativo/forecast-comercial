#!/bin/bash
# Executa a migração usando o Python 3.12 (onde o supabase está instalado)
PYTHON="/Library/Frameworks/Python.framework/Versions/3.12/bin/python3"

if [ ! -f "$PYTHON" ]; then
  echo "❌ Python 3.12 não encontrado em $PYTHON"
  exit 1
fi

echo "✅ Usando: $($PYTHON --version)"
"$PYTHON" "$(dirname "$0")/migrar_dados.py"

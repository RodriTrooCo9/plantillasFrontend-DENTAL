#!/usr/bin/env bash
# ==============================================================================
# Lumina Odontología - Inicialización de Ollama para Servidor de Producción / GPU
# ==============================================================================
# Este script descarga e inicializa el modelo open-source seleccionado
# (qwen2.5:7b-instruct o llama3.2) dentro del contenedor de Ollama.
#
# INSTRUCCIÓN: Ejecútalo en el equipo con capacidad de cómputo adecuada (GPU).
# ==============================================================================

set -e

MODEL_NAME="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
CONTAINER_NAME="lumina_dental_ollama"

echo "🤖 [Lumina Dental AI] Verificando servicio Ollama en Docker..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "⚠️ El contenedor ${CONTAINER_NAME} no está en ejecución."
  echo "Iniciando contenedor con docker compose..."
  docker compose up -d ollama
  sleep 3
fi

echo "📥 Descargando modelo open-source '${MODEL_NAME}' en Ollama..."
docker compose exec ollama ollama pull "${MODEL_NAME}"

echo "✅ Modelo '${MODEL_NAME}' listo para Function Calling y Tool Calling en Lumina Dental."
echo "🔗 Endpoint Ollama local: http://localhost:11434/api"

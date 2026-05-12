#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/infra/docker/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing root .env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing Docker Compose file: $COMPOSE_FILE" >&2
  exit 1
fi

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
if [[ -z "$PROJECT_NAME" ]]; then
  PROJECT_NAME="$(grep -E '^COMPOSE_PROJECT_NAME=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
fi
PROJECT_NAME="${PROJECT_NAME:-patriotic-rebuild-v2}"
PROJECT_NAME="${PROJECT_NAME%\"}"
PROJECT_NAME="${PROJECT_NAME#\"}"
PROJECT_NAME="${PROJECT_NAME%\'}"
PROJECT_NAME="${PROJECT_NAME#\'}"

docker compose \
  --env-file "$ENV_FILE" \
  -p "$PROJECT_NAME" \
  -f "$COMPOSE_FILE" \
  up -d postgres redis

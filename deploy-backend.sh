#!/bin/bash
set -euo pipefail

SERVICE_NAME="${CLOUD_RUN_SERVICE:-patriotic-virtual-backend}"
SOURCE_DIR="${BACKEND_SOURCE_DIR:-emr-backend}"
PROJECT_ID="${GCP_PROJECT_ID:-patriotic-virtual-prod}"
REGION="${GCP_REGION:-us-central1}"
ENV_FILE="${BACKEND_ENV_FILE:-${SOURCE_DIR}/.env}"
RESERVED_ENV_REGEX='^(PORT|K_SERVICE|K_REVISION|K_CONFIGURATION)='
VALID_ENV_REGEX='^[A-Za-z_][A-Za-z0-9_]*='

echo "🚀 Deploying backend service to Cloud Run..."
echo "   Service: ${SERVICE_NAME}"
echo "   Source:  ${SOURCE_DIR}"
echo "   Region:  ${REGION}"
echo "   Project: ${PROJECT_ID}"

if ! command -v gcloud >/dev/null 2>&1; then
    echo "❌ gcloud CLI is not installed or not on PATH."
    exit 1
fi

if [ ! -d "${SOURCE_DIR}" ]; then
    echo "❌ Source directory not found: ${SOURCE_DIR}"
    exit 1
fi

ENV_ARGS=()
SANITIZED_ENV_FILE=""
if [ -f "${ENV_FILE}" ]; then
    SANITIZED_ENV_FILE="$(mktemp "${TMPDIR:-/tmp}/deploy-backend.XXXXXX.env")"
    grep -E "${VALID_ENV_REGEX}" "${ENV_FILE}" | grep -vE "${RESERVED_ENV_REGEX}" > "${SANITIZED_ENV_FILE}" || true
    echo "📄 Using env file: ${ENV_FILE}"
    echo "🧹 Removed comments, blank lines, and Cloud Run reserved env vars before deploy."
    ENV_ARGS=(--env-vars-file "${SANITIZED_ENV_FILE}")
else
    echo "⚠️  Env file not found, reusing existing Cloud Run env configuration."
fi

cleanup() {
    if [ -n "${SANITIZED_ENV_FILE}" ] && [ -f "${SANITIZED_ENV_FILE}" ]; then
        rm -f "${SANITIZED_ENV_FILE}"
    fi
}
trap cleanup EXIT

gcloud run deploy "${SERVICE_NAME}" \
  --source "${SOURCE_DIR}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --project "${PROJECT_ID}" \
  "${ENV_ARGS[@]}"

echo "✅ Backend deployed successfully!"

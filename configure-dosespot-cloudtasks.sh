#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   chmod +x ./configure-dosespot-cloudtasks.sh
#   ./configure-dosespot-cloudtasks.sh
#
# Optional overrides:
#   PROJECT_ID=patriotic-virtual-prod \
#   REGION=us-central1 \
#   SERVICE=patriotic-virtual-backend \
#   QUEUE=dosespot-webhook \
#   TASK_SA_NAME=dosespot-tasks \
#   BACKEND_PUBLIC_URL=https://your-service-url.run.app \
#   USE_EXPLICIT_TARGET_URL=false \
#   ./configure-dosespot-cloudtasks.sh

PROJECT_ID="${PROJECT_ID:-patriotic-virtual-prod}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-patriotic-virtual-backend}"
QUEUE="${QUEUE:-dosespot-webhook}"
TASK_SA_NAME="${TASK_SA_NAME:-dosespot-tasks}"
TASK_SA_EMAIL="${TASK_SA_EMAIL:-${TASK_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com}"
BACKEND_PUBLIC_URL="${BACKEND_PUBLIC_URL:-}"
USE_EXPLICIT_TARGET_URL="${USE_EXPLICIT_TARGET_URL:-false}"
DOSESPOT_REQUIRE_CLOUD_TASKS="${DOSESPOT_REQUIRE_CLOUD_TASKS:-true}"
SKIP_IAM_BINDINGS="${SKIP_IAM_BINDINGS:-false}"

log() {
  printf '[setup] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Error: required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

require_cmd gcloud

log "Project: ${PROJECT_ID}"
log "Region: ${REGION}"
log "Service: ${SERVICE}"
log "Queue: ${QUEUE}"
log "Task SA: ${TASK_SA_EMAIL}"
log "Skip IAM bindings: ${SKIP_IAM_BINDINGS}"

# Ensure project context for command defaults.
gcloud config set project "${PROJECT_ID}" >/dev/null

log "Enabling required APIs (idempotent)..."
gcloud services enable \
  cloudtasks.googleapis.com \
  run.googleapis.com \
  iam.googleapis.com \
  --project "${PROJECT_ID}" >/dev/null

if ! gcloud iam service-accounts describe "${TASK_SA_EMAIL}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  log "Creating service account ${TASK_SA_EMAIL}..."
  gcloud iam service-accounts create "${TASK_SA_NAME}" \
    --display-name "DoseSpot Cloud Tasks Invoker" \
    --project "${PROJECT_ID}" >/dev/null
else
  log "Service account already exists."
fi

if ! gcloud tasks queues describe "${QUEUE}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  log "Creating Cloud Tasks queue ${QUEUE}..."
  gcloud tasks queues create "${QUEUE}" \
    --location "${REGION}" \
    --project "${PROJECT_ID}" >/dev/null
else
  log "Cloud Tasks queue already exists."
fi

RUNTIME_SA="${RUNTIME_SA:-$(gcloud run services describe "${SERVICE}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(spec.template.spec.serviceAccountName)')}"
if [[ -z "${RUNTIME_SA}" ]]; then
  # Cloud Run default runtime identity fallback.
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

PROJECT_NUMBER="${PROJECT_NUMBER:-$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')}"
CLOUD_TASKS_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-cloudtasks.iam.gserviceaccount.com"

if [[ "${SKIP_IAM_BINDINGS,,}" != "true" ]]; then
  log "Granting roles/run.invoker to task service account on Cloud Run service..."
  if ! gcloud run services add-iam-policy-binding "${SERVICE}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${TASK_SA_EMAIL}" \
    --role "roles/run.invoker" >/dev/null; then
    log "WARN: Could not grant roles/run.invoker (missing run.services.setIamPolicy)."
  fi

  log "Granting roles/iam.serviceAccountUser to backend runtime SA on task SA..."
  if ! gcloud iam service-accounts add-iam-policy-binding "${TASK_SA_EMAIL}" \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${RUNTIME_SA}" \
    --role "roles/iam.serviceAccountUser" >/dev/null; then
    log "WARN: Could not grant runtime SA -> task SA iam.serviceAccountUser."
  fi

  log "Granting roles/iam.serviceAccountUser to Cloud Tasks service agent on task SA..."
  if ! gcloud iam service-accounts add-iam-policy-binding "${TASK_SA_EMAIL}" \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${CLOUD_TASKS_SERVICE_AGENT}" \
    --role "roles/iam.serviceAccountUser" >/dev/null; then
    log "WARN: Could not grant Cloud Tasks service agent -> task SA iam.serviceAccountUser."
  fi
else
  log "Skipping IAM bindings by request."
fi

if [[ -z "${BACKEND_PUBLIC_URL}" ]]; then
  BACKEND_PUBLIC_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')"
fi

if [[ -z "${BACKEND_PUBLIC_URL}" ]]; then
  printf 'Error: unable to resolve BACKEND_PUBLIC_URL from Cloud Run service.\n' >&2
  exit 1
fi

TARGET_URL="${CLOUD_TASKS_TARGET_URL:-${BACKEND_PUBLIC_URL%/}/api/v1/dosespot/push-notifications/process}"
AUDIENCE="${CLOUD_TASKS_AUDIENCE:-${TARGET_URL}}"

ENV_VARS="DOSESPOT_REQUIRE_CLOUD_TASKS=${DOSESPOT_REQUIRE_CLOUD_TASKS},CLOUD_TASKS_PROJECT_ID=${PROJECT_ID},CLOUD_TASKS_LOCATION=${REGION},CLOUD_TASKS_QUEUE=${QUEUE},CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=${TASK_SA_EMAIL},CLOUD_TASKS_AUDIENCE=${AUDIENCE}"

case "${USE_EXPLICIT_TARGET_URL,,}" in
  true|1|yes)
    ENV_VARS+=" ,CLOUD_TASKS_TARGET_URL=${TARGET_URL}"
    ;;
  *)
    ENV_VARS+=" ,BACKEND_PUBLIC_URL=${BACKEND_PUBLIC_URL}"
    ;;
esac

# Remove accidental spaces before commas introduced by shell concatenation style.
ENV_VARS="${ENV_VARS// ,/,}"

log "Updating Cloud Run env vars..."
gcloud run services update "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "${ENV_VARS}" >/dev/null

log "Checking runtime health endpoint..."
HEALTH_URL="${BACKEND_PUBLIC_URL%/}/api/v1/dosespot/push-notifications/health"
if command -v curl >/dev/null 2>&1; then
  if command -v jq >/dev/null 2>&1; then
    curl -fsSL "${HEALTH_URL}" | jq .
  else
    curl -fsSL "${HEALTH_URL}"
  fi
else
  log "curl not available, skipped health check output."
fi

log "Done. If cloudTasksRequired=true and queueConfigured=true in health output, setup is complete."
cat <<ADMIN_STEPS

[setup] If any IAM step above failed, ask a Project Admin to run:

gcloud run services add-iam-policy-binding "${SERVICE}" \\
  --region "${REGION}" --project "${PROJECT_ID}" \\
  --member "serviceAccount:${TASK_SA_EMAIL}" \\
  --role "roles/run.invoker"

gcloud iam service-accounts add-iam-policy-binding "${TASK_SA_EMAIL}" \\
  --project "${PROJECT_ID}" \\
  --member "serviceAccount:${RUNTIME_SA}" \\
  --role "roles/iam.serviceAccountUser"

gcloud iam service-accounts add-iam-policy-binding "${TASK_SA_EMAIL}" \\
  --project "${PROJECT_ID}" \\
  --member "serviceAccount:${CLOUD_TASKS_SERVICE_AGENT}" \\
  --role "roles/iam.serviceAccountUser"
ADMIN_STEPS

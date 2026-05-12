#!/usr/bin/env bash
set -euo pipefail

staging_project="${STAGING_GCP_PROJECT_ID:-patriotic-virtual-dev}"
production_project="${PRODUCTION_GCP_PROJECT_ID:-patriotic-virtual-prod}"
staging_emr_secret="${STAGING_EMR_SECRET_NAME:-emr-portal-env-staging}"
production_emr_secret="${PRODUCTION_EMR_SECRET_NAME:-emr-portal-env-production}"
production_backend_secret="${PRODUCTION_BACKEND_SECRET_NAME:-emr-backend-env-production}"
workload_identity_pool="${WORKLOAD_IDENTITY_POOL_NAME:-github-actions}"
workload_identity_provider="${WORKLOAD_IDENTITY_PROVIDER_NAME:-github-oidc}"
deploy_service_account_name="${DEPLOY_SERVICE_ACCOUNT_NAME:-github-actions-deployer}"
cloud_run_service="${CLOUD_RUN_SERVICE_NAME:-patriotic-virtual-backend}"
production_region="${PRODUCTION_GCP_REGION:-us-central1}"
production_api_domain="${PRODUCTION_API_DOMAIN:-api.patriotictelehealth.com}"

usage() {
  cat <<'EOF'
Usage:
  npm run verify:gcp-deployment-setup

Optional overrides:
  STAGING_GCP_PROJECT_ID
  PRODUCTION_GCP_PROJECT_ID
  STAGING_EMR_SECRET_NAME
  PRODUCTION_EMR_SECRET_NAME
  PRODUCTION_BACKEND_SECRET_NAME
  WORKLOAD_IDENTITY_POOL_NAME
  WORKLOAD_IDENTITY_PROVIDER_NAME
  DEPLOY_SERVICE_ACCOUNT_NAME
  CLOUD_RUN_SERVICE_NAME
  PRODUCTION_GCP_REGION
  PRODUCTION_API_DOMAIN

Requirements:
  - gcloud CLI installed
  - gcloud auth login or equivalent completed
  - access to the target GCP projects
EOF
}

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required" >&2
  exit 1
fi

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  usage
  echo
  echo "gcloud auth/config is invalid or unusable in this shell; run: gcloud auth login" >&2
  exit 1
fi

failures=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

check_project() {
  local project="$1"
  if gcloud projects describe "${project}" >/dev/null 2>&1; then
    pass "GCP project exists and is accessible: ${project}"
  else
    fail "GCP project missing or inaccessible: ${project}"
  fi
}

check_secret() {
  local project="$1"
  local secret="$2"
  if gcloud secrets describe "${secret}" --project="${project}" >/dev/null 2>&1; then
    pass "Secret exists: ${project}/${secret}"
  else
    fail "Secret missing: ${project}/${secret}"
  fi
}

check_service_account() {
  local project="$1"
  local email="${deploy_service_account_name}@${project}.iam.gserviceaccount.com"
  if gcloud iam service-accounts describe "${email}" --project="${project}" >/dev/null 2>&1; then
    pass "Deploy service account exists: ${email}"
  else
    fail "Deploy service account missing: ${email}"
  fi
}

check_workload_identity() {
  local project="$1"
  if gcloud iam workload-identity-pools describe "${workload_identity_pool}" --project="${project}" --location=global >/dev/null 2>&1; then
    pass "Workload Identity pool exists: ${project}/${workload_identity_pool}"
  else
    fail "Workload Identity pool missing: ${project}/${workload_identity_pool}"
  fi

  if gcloud iam workload-identity-pools providers describe "${workload_identity_provider}" --project="${project}" --location=global --workload-identity-pool="${workload_identity_pool}" >/dev/null 2>&1; then
    pass "Workload Identity provider exists: ${project}/${workload_identity_pool}/${workload_identity_provider}"
  else
    fail "Workload Identity provider missing: ${project}/${workload_identity_pool}/${workload_identity_provider}"
  fi
}

check_cloud_run_service() {
  local project="$1"
  if gcloud run services describe "${cloud_run_service}" --project="${project}" --region="${production_region}" >/dev/null 2>&1; then
    pass "Cloud Run service exists: ${project}/${cloud_run_service}"
  else
    fail "Cloud Run service missing: ${project}/${cloud_run_service}"
  fi
}

check_cloud_run_domain_mapping() {
  local project="$1"
  if gcloud beta run domain-mappings describe --domain="${production_api_domain}" --project="${project}" --region="${production_region}" >/dev/null 2>&1; then
    pass "Cloud Run domain mapping exists: ${project}/${production_api_domain}"
  else
    fail "Cloud Run domain mapping missing: ${project}/${production_api_domain}"
  fi
}

echo "Verifying GCP deployment setup"
echo "STAGING_GCP_PROJECT_ID=${staging_project}"
echo "PRODUCTION_GCP_PROJECT_ID=${production_project}"
echo

check_project "${staging_project}"
check_project "${production_project}"

check_secret "${staging_project}" "${staging_emr_secret}"
check_secret "${production_project}" "${production_emr_secret}"
check_secret "${production_project}" "${production_backend_secret}"

check_service_account "${production_project}"
check_workload_identity "${production_project}"
check_cloud_run_service "${production_project}"
check_cloud_run_domain_mapping "${production_project}"

echo
if (( failures > 0 )); then
  printf 'GCP deployment setup verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "GCP deployment setup verification passed"

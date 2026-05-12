#!/usr/bin/env bash
set -euo pipefail

origin_url="$(git remote get-url origin 2>/dev/null || true)"
repo_slug="$(
  printf '%s\n' "${origin_url}" \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##'
)"
if [[ -z "${repo_slug}" ]]; then
  repo_slug="OWNER/REPO"
fi

cat <<'EOF' | sed -e "s#__REPO_SLUG__#${repo_slug}#g"
Recommended branch protection bootstrap flow using GitHub CLI:

Prerequisites:
- gh auth login
- gh repo set-default __REPO_SLUG__

Staging branch protection example:

gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/__REPO_SLUG__/branches/staging/protection \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]='tracked-env-guard' \
  -f required_status_checks.contexts[]='changes' \
  -f required_status_checks.contexts[]='validate-public' \
  -f required_status_checks.contexts[]='build-emr-portal' \
  -f required_status_checks.contexts[]='build-emr-backend' \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -F enforce_admins=true \
  -F restrictions=

Production branch protection example:

gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/__REPO_SLUG__/branches/production/protection \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]='tracked-env-guard' \
  -f required_status_checks.contexts[]='changes' \
  -f required_status_checks.contexts[]='validate-public' \
  -f required_status_checks.contexts[]='build-emr-portal' \
  -f required_status_checks.contexts[]='build-emr-backend' \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -F enforce_admins=true \
  -F restrictions=

Recommended follow-up in GitHub UI:

- staging:
  - require pull requests
  - require these CI checks:
    - tracked-env-guard
    - changes
    - validate-public
    - build-emr-portal
    - build-emr-backend

- production:
  - require pull requests
  - require at least 1 reviewer
  - require these CI checks:
    - tracked-env-guard
    - changes
    - validate-public
    - build-emr-portal
    - build-emr-backend
  - block direct pushes
  - require environment approval on the production environment

Notes:
- These names are derived from the current jobs in `.github/workflows/ci.yml`.
- After the first PR run against staging/production, confirm GitHub records the check names exactly as listed above before applying protection.
- The `validate-public`, `build-emr-portal`, and `build-emr-backend` jobs are path-conditional. When a path is not relevant they should show as skipped rather than missing.
- This helper prints the plan only. It does not call the GitHub API.
EOF

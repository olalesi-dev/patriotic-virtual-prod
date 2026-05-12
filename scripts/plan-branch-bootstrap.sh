#!/usr/bin/env bash
set -euo pipefail

base_branch="${BASE_BRANCH:-main}"
staging_branch="${STAGING_BRANCH:-staging}"
production_branch="${PRODUCTION_BRANCH:-production}"
remote_name="${GIT_REMOTE_NAME:-origin}"
origin_url="$(git remote get-url "${remote_name}" 2>/dev/null || true)"
repo_slug="$(
  printf '%s\n' "${origin_url}" \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##'
)"
if [[ -z "${repo_slug}" ]]; then
  repo_slug="OWNER/REPO"
fi

cat <<EOF
Create the deployment branches from ${base_branch} using:

git checkout ${base_branch}
git pull ${remote_name} ${base_branch}
git checkout -b ${staging_branch}
git push -u ${remote_name} ${staging_branch}
git checkout ${base_branch}
git checkout -b ${production_branch}
git push -u ${remote_name} ${production_branch}
git checkout ${base_branch}

Notes:
- Use \`${staging_branch}\`, not \`development\`, for the non-production branch.
- Create both branches from the same current ${base_branch} tip after the env-history cleanup plan is understood.
- After pushing the branches, continue with:
  - npm run plan:github-environments-bootstrap
  - npm run plan:branch-protection-bootstrap
  - GITHUB_REPO=${repo_slug} npm run verify:github-deployment-setup
  - GITHUB_REPO=${repo_slug} npm run verify:branch-protection-setup
EOF

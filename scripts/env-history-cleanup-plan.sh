#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

origin_url="$(git remote get-url origin 2>/dev/null || true)"
if [[ -z "${origin_url}" ]]; then
  origin_url="git@github.com:OWNER/REPO.git"
fi

readarray -t cleanup_targets < <(
  {
    git ls-files
    git log --all --name-only --pretty=format:
  } \
    | grep -E '(^|/)\.env($|(\.[^/]+)$)' \
    | grep -vE '(^|/)\.env\.example$' \
    | sed '/^$/d' \
    | sort -u
)

echo "Tracked env files currently detected:"
if (( ${#cleanup_targets[@]} == 0 )); then
  echo "No tracked non-example env files were found in the current index or Git history."
  exit 0
fi

current_index_targets="$(
  printf '%s\n' "${cleanup_targets[@]}" | while IFS= read -r path; do
    git ls-files --error-unmatch "${path}" >/dev/null 2>&1 && printf '%s\n' "${path}"
  done || true
)"

if [[ -n "${current_index_targets}" ]]; then
  printf '%s\n' "${current_index_targets}"
else
  echo "None of the discovered env files are currently indexed."
fi

echo
echo "Recommended safe rewrite flow:"
echo "1. Run the rewrite in a fresh mirror clone, not in this working checkout:"
echo "   git clone --mirror ${origin_url} patriotic-virtual-prod-history-cleanup.git"
echo "   cd patriotic-virtual-prod-history-cleanup.git"
echo "2. Inside that mirror clone, run:"
printf '   git filter-repo'
for target in "${cleanup_targets[@]}"; do
  printf ' --path %q' "${target}"
done
printf ' --invert-paths\n'
echo "3. Force-push the rewritten mirror back to origin:"
echo "   git push --force --mirror origin"

echo
echo "History rewrite command inside the mirror clone:"
printf 'git filter-repo'
for target in "${cleanup_targets[@]}"; do
  printf ' --path %q' "${target}"
done
printf ' --invert-paths\n'

echo
echo "After the rewrite:"
echo "1. In this working repo, re-run ./scripts/check-tracked-envs.sh"
echo "   Re-run ./scripts/verify-env-history-cleanup.sh"
echo "2. Re-run npm run audit:deployment-readiness"
echo "3. Rotate every secret that ever lived in those files."

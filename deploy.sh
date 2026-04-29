#!/bin/bash
# ──────────────────────────────────────────────────────────
# Patriotic Virtual Telehealth — Firebase Hosting Deploy
# Project: patriotic-virtual-prod
# ──────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  🇺🇸  Patriotic Virtual Telehealth — Deploy"
echo "═══════════════════════════════════════════════════════"
echo ""

# Pre-flight checks
if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found. Install: npm install -g firebase-tools"
  exit 1
fi

if [ ! -f "public/index.html" ]; then
  echo "❌ public/index.html not found."
  exit 1
fi

FILE_SIZE=$(wc -c < public/index.html)
echo "📄 public/index.html — ${FILE_SIZE} bytes"
echo "🔗 Project: patriotic-virtual-prod"
echo ""

# Authenticate check
echo "🔑 Checking Firebase auth..."
if ! firebase projects:list --limit 1 &> /dev/null; then
  echo "⚠️  Not authenticated. Run: firebase login --no-localhost"
  exit 1
fi

# Deploy to EMR target only
echo "🚀 Deploying to Firebase Hosting (EMR Target)..."
echo ""
firebase deploy --only hosting:emr --project patriotic-virtual-prod

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅  Deployed successfully!"
echo "  🌐  https://patriotic-virtual-emr.web.app"
echo "  🌐  https://patriotic-virtual-emr.firebaseapp.com"
echo "═══════════════════════════════════════════════════════"

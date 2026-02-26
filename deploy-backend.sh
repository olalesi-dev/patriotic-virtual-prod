#!/bin/bash
set -e

echo "🚀 Deploying Backend Service to Cloud Run..."

# Check if .env exists to set variables
ENV_ARGS=""
if [ -f "backend/.env" ]; then
    echo "📄 Found backend/.env, setting environment variables..."
    # Read .env file line by line and construct --set-env-vars string
    # Handling simple key-value pairs
    VARS=$(grep -v '^#' backend/.env | grep -v '^$' | tr '\n' ',' | sed 's/,$//')
    ENV_ARGS="--set-env-vars=$VARS"
fi

# Deploy
gcloud run deploy patriotic-virtual-backend \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  "$ENV_ARGS" \
  --project patriotic-virtual-prod

echo "✅ Backend Deployed Successfully!"

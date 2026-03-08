Write-Host "🚀 Deploying Backend Service to Cloud Run..." -ForegroundColor Cyan

# Deploy command using env.yaml for environment variables
$deployCmd = "gcloud run deploy patriotic-virtual-backend --source backend --env-vars-file backend/env.yaml --region us-central1 --allow-unauthenticated --project patriotic-virtual-prod --quiet"

Write-Host "Executing: $deployCmd" -ForegroundColor Gray
Invoke-Expression $deployCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend Deployed Successfully!" -ForegroundColor Green
}
else {
    Write-Host "❌ Backend Deployment Failed!" -ForegroundColor Red
}

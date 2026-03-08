Write-Host "🚀 Deploying Backend Service to Cloud Run..." -ForegroundColor Cyan

# Check if .env exists
$EnvFile = "backend/.env"
$EnvArgs = ""

if (Test-Path $EnvFile) {
    Write-Host "📄 Found backend/.env, setting environment variables..." -ForegroundColor Green
    
    # Read .env file, ignore comments and empty lines
    $content = Get-Content $EnvFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' }
    
    # Escape commas inside values to prevent gcloud from parsing them as variable separators
    $content = $content -replace ',', '^,'

    # Ensure variables are joined with commas and wrapped in quotes to prevent shell parsing issues
    $vars = $content -join ","
    
    if ($vars) {
        $EnvArgs = "--set-env-vars=`"$vars`""
    }
} else {
    Write-Host "⚠️  backend/.env not found, proceeding without setting new env vars..." -ForegroundColor Yellow
}

# Deploy command
$deployCmd = "gcloud run deploy patriotic-virtual-backend --source backend --region us-central1 --allow-unauthenticated --project patriotic-virtual-prod $EnvArgs --quiet"

Write-Host "Executing: $deployCmd" -ForegroundColor Gray
Invoke-Expression $deployCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend Deployed Successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Deployment Failed!" -ForegroundColor Red
}

$ServiceName = if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { "patriotic-virtual-backend" }
$SourceDir = if ($env:BACKEND_SOURCE_DIR) { $env:BACKEND_SOURCE_DIR } else { "emr-backend" }
$ProjectId = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "patriotic-virtual-prod" }
$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$EnvFile = if ($env:BACKEND_ENV_FILE) { $env:BACKEND_ENV_FILE } else { "$SourceDir/.env" }
$ReservedEnvPattern = '^(PORT|K_SERVICE|K_REVISION|K_CONFIGURATION)='
$ValidEnvPattern = '^[A-Za-z_][A-Za-z0-9_]*='

Write-Host "🚀 Deploying backend service to Cloud Run..." -ForegroundColor Cyan
Write-Host "   Service: $ServiceName" -ForegroundColor Gray
Write-Host "   Source:  $SourceDir" -ForegroundColor Gray
Write-Host "   Region:  $Region" -ForegroundColor Gray
Write-Host "   Project: $ProjectId" -ForegroundColor Gray

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ gcloud CLI is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $SourceDir)) {
    Write-Host "❌ Source directory not found: $SourceDir" -ForegroundColor Red
    exit 1
}

$deployArgs = @(
    "run", "deploy", $ServiceName,
    "--source", $SourceDir,
    "--region", $Region,
    "--allow-unauthenticated",
    "--project", $ProjectId
)

if (Test-Path $EnvFile) {
    $TempName = [System.IO.Path]::GetRandomFileName()
    $SanitizedEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) ($TempName + ".env")
    Get-Content $EnvFile | Where-Object { $_ -match $ValidEnvPattern -and $_ -notmatch $ReservedEnvPattern } | Set-Content $SanitizedEnvFile
    Write-Host "📄 Using env file: $EnvFile" -ForegroundColor Green
    Write-Host "🧹 Removed comments, blank lines, and Cloud Run reserved env vars before deploy." -ForegroundColor Yellow

    $requiredVars = @("STRIPE_SECRET_KEY", "FRONTEND_URL")
    foreach ($requiredVar in $requiredVars) {
        if (-not (Select-String -Path $SanitizedEnvFile -Pattern "^${requiredVar}=" -Quiet)) {
            Write-Host "❌ Required backend env var missing from ${EnvFile}: ${requiredVar}" -ForegroundColor Red
            exit 1
        }
    }

    $deployArgs += @("--env-vars-file", $SanitizedEnvFile)
}
else {
    Write-Host "⚠️  Env file not found, reusing existing Cloud Run env configuration." -ForegroundColor Yellow
}

Write-Host ("Executing: gcloud " + ($deployArgs -join " ")) -ForegroundColor Gray
try {
    & gcloud @deployArgs
}
finally {
    if ($SanitizedEnvFile -and (Test-Path $SanitizedEnvFile)) {
        Remove-Item $SanitizedEnvFile -Force
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
}
else {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
}

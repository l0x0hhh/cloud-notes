# cloud-notes benchmark + pprof (PowerShell)
# Usage: .\scripts\benchmark\run_hey.ps1
# Prereq: go run main.go

param(
    [string]$Server = "localhost",
    [string]$Port = "8080"
)

$ErrorActionPreference = "Stop"
$Base = "http://${Server}:${Port}"
$Hey = "$env:USERPROFILE\go\bin\hey.exe"
$ResultDir = "scripts\benchmark\results"
$ProfileDir = "scripts\benchmark\profiles"

New-Item -ItemType Directory -Force -Path $ResultDir | Out-Null
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  cloud-notes Benchmark (hey + pprof)" -ForegroundColor Cyan
Write-Host "  Target: $Base" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Helper: run hey and save output
# ============================================================
function Run-Hey($OutFile, $Arguments) {
    $result = & $Hey @Arguments 2>&1
    $result | Out-File -FilePath $OutFile -Encoding utf8
    $result
}

# ============================================================
# Check
# ============================================================
Write-Host "[Check] Testing server..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "$Base/debug/pprof/" -TimeoutSec 3 -UseBasicParsing
    Write-Host "  Server is up" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Cannot connect to $Base" -ForegroundColor Red
    Write-Host "  Run: go run main.go" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Hey)) {
    Write-Host "  ERROR: hey not found" -ForegroundColor Red
    Write-Host "  Run: go install github.com/rakyll/hey@latest" -ForegroundColor Red
    exit 1
}

# ============================================================
# Get token
# ============================================================
Write-Host "[Token] Getting test token..." -ForegroundColor Yellow

$BENCH_USER = "bench_$(Get-Random -Minimum 10000 -Maximum 99999)"

$null = Invoke-RestMethod -Uri "$Base/register" -Method Post `
    -ContentType "application/json" `
    -Body "{`"username`":`"$BENCH_USER`",`"password`":`"bench123`"}" `
    -ErrorAction SilentlyContinue

$loginResp = Invoke-RestMethod -Uri "$Base/login" -Method Post `
    -ContentType "application/json" `
    -Body "{`"username`":`"$BENCH_USER`",`"password`":`"bench123`"}"
$Token = $loginResp.token
Write-Host "  Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Green

# ============================================================
# Warmup
# ============================================================
Write-Host "[Warmup] Creating test notes..." -ForegroundColor Yellow
for ($i = 1; $i -le 10; $i++) {
    $null = Invoke-RestMethod -Uri "$Base/api/notes" -Method Post `
        -ContentType "application/json" `
        -Headers @{Authorization = "Bearer $Token"} `
        -Body '{"title":"warmup","content":"warmup"}' `
        -ErrorAction SilentlyContinue
}

# ============================================================
# Start CPU profile in background (30s)
# ============================================================
Write-Host ""
Write-Host "[pprof] Starting 30s CPU profile..." -ForegroundColor Yellow
$AbsProfileDir = (Resolve-Path $ProfileDir).Path

$cpuJob = Start-Job -ScriptBlock {
    param($Base, $Dir)
    Invoke-WebRequest -Uri "$Base/debug/pprof/profile?seconds=30" `
        -OutFile "$Dir\cpu_hey.pprof" -TimeoutSec 35 -UseBasicParsing
} -ArgumentList $Base, $AbsProfileDir

Start-Sleep -Seconds 2
Write-Host "  CPU profile sampling in background (30s)" -ForegroundColor Green

# ============================================================
# 1/5: Register
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [1/5] POST /register (1000 req, 50 concurrency)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Run-Hey "$ResultDir\1_register.txt" @(
    "-n", "1000", "-c", "50", "-m", "POST",
    "-H", "Content-Type: application/json",
    "-d", '{"username":"new_user","password":"123"}',
    "$Base/register"
)

# ============================================================
# 2/5: Login
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [2/5] POST /login (2000 req, 100 concurrency)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Run-Hey "$ResultDir\2_login.txt" @(
    "-n", "2000", "-c", "100", "-m", "POST",
    "-H", "Content-Type: application/json",
    "-d", "{`"username`":`"$BENCH_USER`",`"password`":`"bench123`"}",
    "$Base/login"
)

# ============================================================
# 3/5: Create Note
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [3/5] POST /api/notes (2000 req, 100 concurrency)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Run-Hey "$ResultDir\3_create_note.txt" @(
    "-n", "2000", "-c", "100", "-m", "POST",
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer $Token",
    "-d", '{"title":"bench","content":"hey benchmark"}',
    "$Base/api/notes"
)

# ============================================================
# 4/5: List Notes
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [4/5] GET /api/notes (5000 req, 200 concurrency)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Run-Hey "$ResultDir\4_list_notes.txt" @(
    "-n", "5000", "-c", "200",
    "-H", "Authorization: Bearer $Token",
    "$Base/api/notes"
)

# ============================================================
# 5/5: High concurrency Create Note
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [5/5] POST /api/notes (3000 req, 200 concurrency)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Run-Hey "$ResultDir\5_stress.txt" @(
    "-n", "3000", "-c", "200", "-m", "POST",
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer $Token",
    "-d", '{"title":"stress","content":"high concurrency"}',
    "$Base/api/notes"
)

# ============================================================
# Collect heap & goroutine
# ============================================================
Write-Host ""
Write-Host "[pprof] Collecting heap and goroutine profiles..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "$Base/debug/pprof/heap" `
    -OutFile "$ProfileDir\heap_hey.pprof" -UseBasicParsing
Invoke-WebRequest -Uri "$Base/debug/pprof/goroutine?debug=1" `
    -OutFile "$ProfileDir\goroutine_hey.txt" -UseBasicParsing
Write-Host "  heap:      $ProfileDir\heap_hey.pprof" -ForegroundColor Green
Write-Host "  goroutine:  $ProfileDir\goroutine_hey.txt" -ForegroundColor Green

# Wait for CPU profile
Write-Host "[pprof] Waiting for CPU profile to finish..." -ForegroundColor Yellow
Wait-Job $cpuJob | Out-Null
Receive-Job $cpuJob | Out-Null
Write-Host "  cpu:       $ProfileDir\cpu_hey.pprof" -ForegroundColor Green

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "======= QPS Summary =======" -ForegroundColor Cyan
Get-ChildItem "$ResultDir\*.txt" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "Requests/sec:\s+([\d.]+)") {
        Write-Host "  $($_.Name): $($Matches[1]) req/s" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "======= Analysis =======" -ForegroundColor Cyan
Write-Host "  go tool pprof -top $ProfileDir\cpu_hey.pprof" -ForegroundColor White
Write-Host "  go tool pprof -http=:9090 $ProfileDir\cpu_hey.pprof" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Green

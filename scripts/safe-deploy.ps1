<#
.SYNOPSIS
  Деплой на VPS с Telegram-апрувом.

.DESCRIPTION
  1. Показывает что будет деплоено
  2. Запрашивает апрув в Telegram
  3. При Approve — SSH на VPS, git pull, pm2 restart, healthcheck
  4. Отправляет результат в Telegram

.EXAMPLE
  .\scripts\safe-deploy.ps1
  .\scripts\safe-deploy.ps1 -Target backend
  .\scripts\safe-deploy.ps1 -Target web
#>

param(
  [ValidateSet('backend','web','all')]
  [string]$Target = 'backend'
)

$ScriptDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.cjs"
if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.cjs"
}

# Загружаем .env
$EnvFile = "E:\Mobile app = web + web ios\docs\.env"
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim(); $val = $Matches[2].Trim().Trim('"')
      if (-not [System.Environment]::GetEnvironmentVariable($key, 'Process')) {
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
      }
    }
  }
}

# Описание деплоя
$deployInfo = switch ($Target) {
  'backend' { 'ДЕПЛОЙ BACKEND → VPS | git pull + npm install + pm2 restart + healthcheck' }
  'web'     { 'ДЕПЛОЙ WEB → VPS | git pull + npm run build + копирование dist/' }
  'all'     { 'ДЕПЛОЙ ALL → VPS | backend + web' }
}

Write-Host ""
Write-Host "🚀 $deployInfo" -ForegroundColor Magenta
Write-Host "📨 Запрашиваем апрув в Telegram..." -ForegroundColor Cyan
Write-Host ""

node $ApproveScript $deployInfo
$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -ne 0) {
  Write-Host "🛑 Деплой отменён." -ForegroundColor Yellow
  exit 1
}

# ─── Выполняем деплой ─────────────────────────────────────────────────────────────────
Write-Host "🚀 Начинаем деплой: $Target" -ForegroundColor Green
Write-Host ""

# Читаем SSH конфиг из .env
$VPS_HOST = [System.Environment]::GetEnvironmentVariable('VPS_HOST', 'Process')
$VPS_USER = [System.Environment]::GetEnvironmentVariable('VPS_USER', 'Process')
if (-not $VPS_HOST) { $VPS_HOST = 'mindandmotion.ru' }
if (-not $VPS_USER) { $VPS_USER = 'root' }

if ($Target -eq 'backend' -or $Target -eq 'all') {
  Write-Host "🖥️  SSH → $VPS_USER@$VPS_HOST — деплой backend..." -ForegroundColor Cyan

  $sshCommands = @"
cd /var/www/backend && \
git pull origin backend && \
npm install --production && \
pm2 restart mindandmotion-backend && \
pm2 status
"@

  ssh "$VPS_USER@$VPS_HOST" $sshCommands

  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH-деплой backend завершился с ошибкой!" -ForegroundColor Red
    Write-Host "   Смотри docs/runbooks/rollback.md" -ForegroundColor Yellow
    exit 1
  }

  # Healthcheck
  Write-Host ""
  Write-Host "🔍 Healthcheck..." -ForegroundColor Cyan
  try {
    $response = Invoke-WebRequest -Uri "https://mindandmotion.ru/api/health" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
      Write-Host "✅ Backend живой! Status: $($response.StatusCode)" -ForegroundColor Green
    }
  } catch {
    Write-Host "⚠️  Healthcheck не прошёл — проверь вручную: https://mindandmotion.ru/api/health" -ForegroundColor Yellow
  }
}

if ($Target -eq 'web' -or $Target -eq 'all') {
  Write-Host ""
  Write-Host "🌐 SSH → деплой web..." -ForegroundColor Cyan

  $sshWebCommands = @"
cd /var/www/web && \
git pull origin web-review && \
npm install && \
npm run build
"@

  ssh "$VPS_USER@$VPS_HOST" $sshWebCommands

  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web-деплой завершился с ошибкой!" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "✅ Деплой завершён успешно!" -ForegroundColor Green

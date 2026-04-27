<#
.SYNOPSIS
  Накатка SQL-миграции с Telegram-апрувом.

.EXAMPLE
  .\scripts\safe-migrate.ps1 -File "migrations/2026-04-27_add_streaks.sql"
#>

param(
  [Parameter(Mandatory)]
  [string]$File
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

if (-not (Test-Path $File)) {
  Write-Host "❌ Файл миграции не найден: $File" -ForegroundColor Red
  exit 1
}

# Показываем содержимое SQL
$sqlPreview = Get-Content $File | Select-Object -First 10
Write-Host ""
Write-Host "🗄️  SQL-миграция: $File" -ForegroundColor Red
Write-Host "🔍 Превью (10 строк):" -ForegroundColor Yellow
$sqlPreview | ForEach-Object { Write-Host "   $_" }
Write-Host ""

$Description = "СОБЫТИЕ SQL-МИГРАЦИЯ: $File — ЭТО НЕОБРАТИМО!"

Write-Host "📨 Запрашиваем апрув в Telegram..." -ForegroundColor Cyan

node $ApproveScript $Description
$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -ne 0) {
  Write-Host "🛑 Миграция отменена." -ForegroundColor Yellow
  exit 1
}

# Читаем SSH/DB конфиг из .env
$VPS_HOST = [System.Environment]::GetEnvironmentVariable('VPS_HOST', 'Process')
$VPS_USER = [System.Environment]::GetEnvironmentVariable('VPS_USER', 'Process')
$DB_NAME  = [System.Environment]::GetEnvironmentVariable('DB_NAME',  'Process')
$DB_USER  = [System.Environment]::GetEnvironmentVariable('DB_USER',  'Process')
$DB_PASS  = [System.Environment]::GetEnvironmentVariable('DB_PASS',  'Process')

if (-not $VPS_HOST) { $VPS_HOST = 'mindandmotion.ru' }
if (-not $VPS_USER) { $VPS_USER = 'root' }
if (-not $DB_NAME)  { $DB_NAME  = 'mindandmotion' }
if (-not $DB_USER)  { $DB_USER  = 'root' }

Write-Host "🗔️  Запускаем миграцию на VPS..." -ForegroundColor Magenta

# Копируем SQL на VPS
$remotePath = "/tmp/migration_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
scp $File "$VPS_USER@$VPS_HOST`:$remotePath"

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Не удалось скопировать файл на VPS." -ForegroundColor Red
  exit 1
}

# Запускаем SQL
if ($DB_PASS) {
  ssh "$VPS_USER@$VPS_HOST" "mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < $remotePath && rm $remotePath"
} else {
  ssh "$VPS_USER@$VPS_HOST" "mysql -u $DB_USER $DB_NAME < $remotePath && rm $remotePath"
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Миграция выполнена успешно!" -ForegroundColor Green
} else {
  Write-Host "❌ Ошибка при выполнении SQL." -ForegroundColor Red
  Write-Host "   Смотри docs/runbooks/rollback.md" -ForegroundColor Yellow
  exit 1
}

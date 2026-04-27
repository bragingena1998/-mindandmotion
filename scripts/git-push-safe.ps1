<#
.SYNOPSIS
  Безопасный git push с Telegram-апрувом.
  Использование: .\scripts\git-push-safe.ps1 ["Описание изменений"]
#>

param(
  [string]$Description = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$CurrentDir  = Get-Location

Write-Host ""
Write-Host "📁 Папка: $CurrentDir" -ForegroundColor Cyan

# Собираем инфо о коммите
try {
  $branch     = git branch --show-current 2>$null
  $lastCommit = git log --oneline -1 2>$null
  $status     = git status --short 2>$null
} catch {
  Write-Host "❌ Не git-репозиторий." -ForegroundColor Red
  exit 1
}

Write-Host "🌿 Ветка:  $branch" -ForegroundColor Yellow
Write-Host "📝 Коммит: $lastCommit" -ForegroundColor Yellow
if ($status) { Write-Host $status }
Write-Host ""

if (-not $Description) {
  $Description = "git push → $branch | $lastCommit"
}

# Ищем telegram-approve.cjs
$ApproveScript = Join-Path $ScriptDir "telegram-approve.cjs"
if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.cjs"
}
if (-not (Test-Path $ApproveScript)) {
  Write-Host "❌ telegram-approve.cjs не найден. Подтяни ветку docs." -ForegroundColor Red
  exit 1
}

# Загружаем .env
$EnvFile = Join-Path $CurrentDir ".env"
if (-not (Test-Path $EnvFile)) {
  $EnvFile = "E:\Mobile app = web + web ios\docs\.env"
}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim().Trim('"')
      if (-not [System.Environment]::GetEnvironmentVariable($key, 'Process')) {
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
      }
    }
  }
}

Write-Host "📨 Отправляем запрос апрува в Telegram..." -ForegroundColor Cyan
Write-Host ""

node $ApproveScript $Description
$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -eq 0) {
  Write-Host "🚀 Выполняем git push..." -ForegroundColor Green
  git push
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push выполнен успешно!" -ForegroundColor Green
  } else {
    Write-Host "❌ git push завершился с ошибкой." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "🛑 Push отменён." -ForegroundColor Yellow
  exit 1
}

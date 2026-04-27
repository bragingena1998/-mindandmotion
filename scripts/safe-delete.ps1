<#
.SYNOPSIS
  Удаление файла/папки с Telegram-апрувом.
  Использование: .\scripts\safe-delete.ps1 "путь/к/файлу"
#>

param(
  [Parameter(Mandatory)]
  [string]$Target
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.js"

if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.js"
}

if (-not (Test-Path $Target)) {
  Write-Host "⚠️  Файл/папка не найдена: $Target" -ForegroundColor Yellow
  exit 0
}

$Description = "УДАЛЕНИЕ: $Target"

Write-Host ""
Write-Host "🗑️  $Description" -ForegroundColor Red
Write-Host "📨 Запрашиваем апрув в Telegram..." -ForegroundColor Cyan
Write-Host ""

# Загружаем .env
$EnvFile = Join-Path (Get-Location) ".env"
if (-not (Test-Path $EnvFile)) {
  $EnvFile = "E:\Mobile app = web + web ios\docs\.env"
}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim().Trim('"')
      if (-not [System.Environment]::GetEnvironmentVariable($key)) {
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
      }
    }
  }
}

node $ApproveScript $Description
$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -eq 0) {
  Write-Host "🗑️  Удаляем: $Target" -ForegroundColor Red
  Remove-Item -Recurse -Force $Target
  Write-Host "✅ Удалено." -ForegroundColor Green
} else {
  Write-Host "🛑 Удаление отменено." -ForegroundColor Yellow
  exit 1
}

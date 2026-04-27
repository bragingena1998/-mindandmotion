<#
.SYNOPSIS
  npm install / uninstall с Telegram-апрувом.
  Использование:
    .\scripts\safe-install.ps1 install axios
    .\scripts\safe-install.ps1 uninstall lodash
    .\scripts\safe-install.ps1 install  (без пакета — просто npm install)
#>

param(
  [ValidateSet('install','uninstall','i','un')]
  [string]$Action = 'install',
  [string]$Package = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.js"

if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.js"
}

$ActionLabel = if ($Package) { "npm $Action $Package" } else { "npm $Action" }
$Description = "$ActionLabel в $(Get-Location)"

Write-Host ""
Write-Host "📦 $Description" -ForegroundColor Cyan
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
  Write-Host "▶️  Выполняем: $ActionLabel" -ForegroundColor Green
  if ($Package) {
    npm $Action $Package
  } else {
    npm $Action
  }
  Write-Host ""
  Write-Host "✅ Готово!" -ForegroundColor Green
} else {
  Write-Host "🛑 Отменено." -ForegroundColor Yellow
  exit 1
}

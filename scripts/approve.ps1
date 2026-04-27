<#
.SYNOPSIS
  Универсальный Telegram-апрув для любой команды.

  Использование:
    # Простой апрув
    .\scripts\approve.ps1 -Message "Описание"

    # Апрув + команда при успехе
    .\scripts\approve.ps1 -Message "Описание" -Command "npm run build"

    # Апрув + ScriptBlock
    .\scripts\approve.ps1 -Message "Описание" -Action { npm run build; npm run deploy }

.EXAMPLE
  # В Windsurf/Cascade использовать так:
  .\scripts\approve.ps1 -Message "npm install dotenv" -Command "npm install dotenv"
#>

param(
  [Parameter(Mandatory)]
  [string]$Message,

  [string]$Command = "",

  [ScriptBlock]$Action = $null
)

$ScriptDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.cjs"
if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.cjs"
}

# Загружаем .env
$EnvFile = Join-Path (Get-Location) ".env"
if (-not (Test-Path $EnvFile)) {
  $EnvFile = "E:\Mobile app = web + web ios\docs\.env"
}
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

Write-Host ""
Write-Host "🔐 APPROVE: $Message" -ForegroundColor Magenta
Write-Host "📨 Ожидаем ответа в Telegram..." -ForegroundColor Cyan
Write-Host ""

node $ApproveScript $Message
$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -ne 0) {
  Write-Host "🛑 Отменено." -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Approved! Выполняем..." -ForegroundColor Green
Write-Host ""

if ($Action) {
  & $Action
} elseif ($Command) {
  Invoke-Expression $Command
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Команда завершилась с ошибкой." -ForegroundColor Red
  exit 1
} else {
  Write-Host "✅ Готово!" -ForegroundColor Green
}

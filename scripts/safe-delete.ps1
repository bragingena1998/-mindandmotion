<#
.SYNOPSIS
  Удаление файла/папки с Telegram-апрувом.
  Использование: .\scripts\safe-delete.ps1 "путь/к/файлу"
#>

param([Parameter(Mandatory)][string]$Target)

$ScriptDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.cjs"
if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.cjs"
}

if (-not (Test-Path $Target)) {
  Write-Host "⚠️  Не найдено: $Target" -ForegroundColor Yellow
  exit 0
}

$Description = "УДАЛЕНИЕ: $Target"
Write-Host ""
Write-Host "🗑️  $Description" -ForegroundColor Red

$EnvFile = Join-Path (Get-Location) ".env"
if (-not (Test-Path $EnvFile)) { $EnvFile = "E:\Mobile app = web + web ios\docs\.env" }
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

node $ApproveScript $Description
if ($LASTEXITCODE -eq 0) {
  Remove-Item -Recurse -Force $Target
  Write-Host "✅ Удалено." -ForegroundColor Green
} else {
  Write-Host "🛑 Отменено." -ForegroundColor Yellow
  exit 1
}

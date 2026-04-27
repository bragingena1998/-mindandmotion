<#
.SYNOPSIS
  npm install/uninstall с Telegram-апрувом.
  Использование:
    .\scripts\safe-install.ps1 install axios
    .\scripts\safe-install.ps1 uninstall lodash
#>

param(
  [ValidateSet('install','uninstall','i','un')]
  [string]$Action = 'install',
  [string]$Package = ""
)

$ScriptDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApproveScript = Join-Path $ScriptDir "telegram-approve.cjs"
if (-not (Test-Path $ApproveScript)) {
  $ApproveScript = "E:\Mobile app = web + web ios\docs\scripts\telegram-approve.cjs"
}

$ActionLabel = if ($Package) { "npm $Action $Package" } else { "npm $Action" }
$Description = "$ActionLabel в $(Get-Location)"

Write-Host ""
Write-Host "📦 $Description" -ForegroundColor Cyan

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
  if ($Package) { npm $Action $Package } else { npm $Action }
  Write-Host "✅ Готово!" -ForegroundColor Green
} else {
  Write-Host "🛑 Отменено." -ForegroundColor Yellow
  exit 1
}

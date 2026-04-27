<#
.SYNOPSIS
  Безопасный git push с Telegram-апрувом.
  Использование: .\scripts\git-push-safe.ps1 ["Описание изменений"]

.DESCRIPTION
  1. Показывает статус и последний коммит
  2. Отправляет запрос апрува в Telegram
  3. При Approve — выполняет git push
  4. При Cancel/Timeout — прерывает push

.EXAMPLE
  .\scripts\git-push-safe.ps1
  .\scripts\git-push-safe.ps1 "Добавил экран привычек"
#>

param(
  [string]$Description = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Определяем корень проекта ────────────────────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# ─── Переходим в папку откуда запущен скрипт (или текущую) ───────────────────
$CurrentDir = Get-Location
Write-Host ""
Write-Host "📁 Папка: $CurrentDir" -ForegroundColor Cyan

# ─── Собираем информацию о коммите ───────────────────────────────────────────
try {
  $branch     = git branch --show-current 2>$null
  $lastCommit = git log --oneline -1 2>$null
  $status     = git status --short 2>$null
} catch {
  Write-Host "❌ Не удалось получить git-информацию. Убедись что ты в git-репозитории." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "🌿 Ветка:        $branch" -ForegroundColor Yellow
Write-Host "📝 Коммит:       $lastCommit" -ForegroundColor Yellow
if ($status) {
  Write-Host "📋 Статус:" -ForegroundColor Yellow
  Write-Host $status
}
Write-Host ""

# ─── Формируем описание ───────────────────────────────────────────────────────
if (-not $Description) {
  $Description = "git push → $branch | $lastCommit"
}

# ─── Проверяем наличие Node.js ────────────────────────────────────────────────
try {
  $nodeVersion = node --version 2>$null
  Write-Host "🟢 Node.js: $nodeVersion" -ForegroundColor Green
} catch {
  Write-Host "❌ Node.js не найден. Установи Node.js для работы Telegram-апрува." -ForegroundColor Red
  exit 1
}

# ─── Ищем telegram-approve.js ────────────────────────────────────────────────
$ApproveScript = Join-Path $ScriptDir "telegram-approve.js"
if (-not (Test-Path $ApproveScript)) {
  # Ищем в docs/scripts/ если запускаем из другого места
  $DocsDir = "E:\Mobile app = web + web ios\docs"
  $ApproveScript = Join-Path $DocsDir "scripts\telegram-approve.js"
}

if (-not (Test-Path $ApproveScript)) {
  Write-Host "❌ telegram-approve.js не найден." -ForegroundColor Red
  Write-Host "   Убедись что ветка docs подтянута: git fetch origin docs" -ForegroundColor Yellow
  exit 1
}

Write-Host "📨 Отправляем запрос апрува в Telegram..." -ForegroundColor Cyan
Write-Host ""

# ─── Запускаем telegram-approve.js ───────────────────────────────────────────
# Передаём .env из текущей директории или из docs
$EnvFile = Join-Path $CurrentDir ".env"
if (-not (Test-Path $EnvFile)) {
  $EnvFile = Join-Path "E:\Mobile app = web + web ios\docs" ".env"
}

# Устанавливаем переменные из .env если файл есть
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

# ─── Обрабатываем результат ───────────────────────────────────────────────────
if ($ExitCode -eq 0) {
  Write-Host "🚀 Выполняем git push..." -ForegroundColor Green
  Write-Host ""
  git push
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push выполнен успешно!" -ForegroundColor Green
  } else {
    Write-Host ""
    Write-Host "❌ git push завершился с ошибкой." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "🛑 Push отменён. Никаких изменений не отправлено." -ForegroundColor Yellow
  exit 1
}

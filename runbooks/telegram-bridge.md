# Runbook: Telegram Bridge

> Система апрува опасных операций через Telegram

## Как это работает

```
Windsurf / терминал
      ↓
 scripts/git-push-safe.ps1  (или approve.ps1, safe-deploy.ps1 и т.)
      ↓
 scripts/telegram-approve.cjs
      ↓
 Telegram Bot API → твой телефон
      ↓
  [✅ Approve] [❌ Cancel]
      ↓
 выполняется / отменяется
```

## Настройка

### 1. Создать бота
1. Открыть [@BotFather](https://t.me/BotFather)
2. `/newbot` → имя → username (must end in `bot`)
3. Скопировать **BOT_TOKEN** (формат: `1234567890:AAFxxx...`)

### 2. Узнать CHAT_ID
1. Написать любое сообщение своему боту
2. Открыть: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Найти `"chat":{"id":XXXXXXXX}` — это и есть CHAT_ID

### 3. Добавить в .env

Файл: `E:\Mobile app = web + web ios\docs\.env`

```env
# Telegram Bridge
TG_BOT_TOKEN=1234567890:AAFxxx...
TG_CHAT_ID=1815370777

# VPS (для safe-deploy.ps1)
VPS_HOST=mindandmotion.ru
VPS_USER=root

# DB (для safe-migrate.ps1)
DB_NAME=mindandmotion
DB_USER=root
DB_PASS=твой_пароль
```

## Справочник по скриптам

| Скрипт | Назначение | Пример |
|---|---|---|
| `git-push-safe.ps1` | Push в Git | `.\scripts\git-push-safe.ps1 "описание"` |
| `safe-install.ps1` | npm install/uninstall | `.\scripts\safe-install.ps1 install axios` |
| `safe-delete.ps1` | Удаление файлов | `.\scripts\safe-delete.ps1 "path/to/file"` |
| `safe-deploy.ps1` | Деплой на VPS | `.\scripts\safe-deploy.ps1 -Target backend` |
| `safe-migrate.ps1` | SQL-миграция | `.\scripts\safe-migrate.ps1 -File migration.sql` |
| `approve.ps1` | Универсальный апрув | `.\scripts\approve.ps1 -Message "что" -Command "cmd"` |

## Как использовать approve.ps1 (универсальный)

```powershell
# Просто спросить апрув без команды
.\scripts\approve.ps1 -Message "Зайти на продакшн-сервер"

# Апрув + команда строкой
.\scripts\approve.ps1 -Message "npm install dotenv" -Command "npm install dotenv"

# Апрув + несколько команд
.\scripts\approve.ps1 -Message "Сброс безопасности" -Action {
  git stash
  git reset --hard HEAD~1
  git stash pop
}
```

## Как использовать в Windsurf (Cascade)

При любой опасной операции Windsurf должен вызывать:

```powershell
# Вместо: git push
.\scripts\git-push-safe.ps1 "что пушаем"

# Вместо: npm install X
.\scripts\safe-install.ps1 install X

# Вместо: Remove-Item ...
.\scripts\safe-delete.ps1 "путь"

# Вместо: деплоя через SSH
.\scripts\safe-deploy.ps1 -Target backend

# Вместо: mysql ... < migration.sql
.\scripts\safe-migrate.ps1 -File migration.sql

# Любая другая опасная команда:
.\scripts\approve.ps1 -Message "описание" -Command "команда"
```

## Добавить в AGENTS.md

Чтобы Windsurf знал об этих скриптах — смотри Terminal Safety раздел в AGENTS.md.

## Timeout

По умолчанию 60 секунд — автоматически Cancel.
Изменить в `scripts/telegram-approve.cjs` → `const TIMEOUT_MS = 120_000` (для 2 минут).

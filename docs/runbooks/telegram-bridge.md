# Telegram Bridge — Approve Workflow

Система подтверждения опасных операций через Telegram перед выполнением.

---

## Архитектура

```
Агент / разработчик хочет сделать push/deploy/rm
           ↓
  scripts/telegram-approve.js
           ↓
  Telegram-бот отправляет сообщение с кнопками
           ↓
  Ты нажимаешь ✅ Approve или ❌ Cancel
           ↓
  Скрипт продолжает или прерывает операцию
```

---

## Шаг 1 — Создать Telegram-бота

1. Открой [@BotFather](https://t.me/botfather) в Telegram
2. Отправь `/newbot`
3. Придумай имя и username (например `MindMotionDevBot`)
4. Скопируй полученный **BOT_TOKEN**
5. Узнай свой **CHAT_ID**:
   - Напиши боту любое сообщение
   - Открой в браузере: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   - Найди `"chat":{"id": XXXXXX}` — это твой CHAT_ID

---

## Шаг 2 — Добавить переменные в .env

```env
TELEGRAM_BOT_TOKEN=xxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
```

---

## Шаг 3 — Создать scripts/telegram-approve.js

Файл уже должен быть в `scripts/telegram-approve.js`.
Запуск: `node scripts/telegram-approve.js "Описание операции"`

Возвращает exit code:
- `0` — Approved (можно продолжать)
- `1` — Cancelled или timeout (прервать)

---

## Шаг 4 — PowerShell-обёртка для git push

Файл `scripts/git-push-safe.ps1`:
```powershell
# Использование: .\scripts\git-push-safe.ps1 origin backend
param($remote = "origin", $branch = "backend")

$result = node scripts/telegram-approve.js "git push $remote $branch"
if ($LASTEXITCODE -eq 0) {
    git push $remote $branch
} else {
    Write-Host "Push отменён"
    exit 1
}
```

---

## Операции, требующие approve

| Операция | Скрипт | Приоритет |
|---|---|---|
| `git push` | `git-push-safe.ps1` | 🔴 Обязательно |
| `deploy` на VPS | `deploy-safe.ps1` | 🔴 Обязательно |
| SQL-миграции | `migrate-safe.ps1` | 🔴 Обязательно |
| `npm install` новых пакетов | approve в терминале | 🟡 Желательно |
| `rm` / `Remove-Item` | approve в терминале | 🟡 Желательно |

---

## Timeout

Если нет ответа в течение 60 секунд — операция автоматически отменяется.

---

## Связанные файлы

- `scripts/telegram-approve.js` — основной скрипт
- `scripts/git-push-safe.ps1` — обёртка для push
- `.env` — BOT_TOKEN и CHAT_ID (никогда не коммитить!)
- `.windsurf/workflows/git-push.md` — workflow для Windsurf

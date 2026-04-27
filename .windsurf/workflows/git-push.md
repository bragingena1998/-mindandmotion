---
name: Safe Git Push (Telegram Approve)
description: Выполняет git push только после Telegram-апрува от владельца
---

# Safe Git Push

## Когда использовать

Вместо `git push` — **всегда** использовать этот workflow или `scripts/git-push-safe.ps1`.

## Шаги

### 1. Проверить статус
```powershell
git status
git log --oneline -3
```

### 2. Убедиться что коммит уже сделан
Если нет — сначала закоммитить:
```powershell
git add .
git commit -m "тип: описание изменений"
```

### 3. Запустить safe push с описанием
```powershell
Set-Location "E:\Mobile app = web + web ios\docs"
.\scripts\git-push-safe.ps1 "Описание что именно пушим"
```

Для web-review:
```powershell
Set-Location "E:\Mobile app = web + web ios\apps\web"
..\..\docs\scripts\git-push-safe.ps1 "Описание изменений"
```

### 4. Проверить Telegram
- Откроется уведомление с кнопками **✅ Approve** / **❌ Cancel**
- Нажать **✅ Approve** — push выполнится
- Нажать **❌ Cancel** — push будет остановлен
- Если не ответить за 60 секунд — автоматически Cancel

## Переменные окружения

В `.env` должны быть:
```
TG_BOT_TOKEN=токен_от_botfather
TG_CHAT_ID=твой_chat_id
```

Смотри `docs/runbooks/telegram-bridge.md` для настройки.

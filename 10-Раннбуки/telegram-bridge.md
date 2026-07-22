---
tags: [runbook, tg-bot, archive-context]
platform: tg-bot
verified: false
source: "docs/runbooks/telegram-bridge.md (перенесено; относится к workflow под Windsurf)"
---

# Telegram Bridge — апрув опасных операций

> ⚠️ Контекст: этот механизм строился под workflow "Windsurf как исполнитель + Telegram как пульт подтверждения с телефона" (см. [[90-Архив/old-workflow/Индекс|старый workflow]]). Сейчас основная работа идёт через Claude Code напрямую в терминале, поэтому актуальность моста как "обязательного шлюза" под вопросом — но сам принцип (не выполнять опасные операции — деплой, миграции, `rm`, `npm install/uninstall` — без явного подтверждения владельца) остаётся действующим правилом независимо от инструмента.

## Как это работало

```
Windsurf / терминал → scripts/git-push-safe.ps1 (approve.ps1, safe-deploy.ps1...)
                     → scripts/telegram-approve.cjs
                     → Telegram Bot API → телефон владельца
                     → [✅ Approve] [❌ Cancel] → выполняется/отменяется
```

## Настройка (если решите поднимать снова)

1. `@BotFather` → `/newbot` → получить `BOT_TOKEN`.
2. Написать боту любое сообщение → `https://api.telegram.org/bot<TOKEN>/getUpdates` → найти `chat.id` → это `CHAT_ID`.
3. `.env` в `tg-bot/` (не в git!): `TG_BOT_TOKEN`, `TG_CHAT_ID`, `VPS_HOST`, `VPS_USER`, `DB_NAME`, `DB_USER`, `DB_PASS`.

## Итоговая рабочая архитектура (по истории, после долгой отладки)

Финальная и единственная надёжная версия — **единый бот `scripts/telegram-bridge.cjs`** (а не связка из двух отдельных ботов, которая конфликтовала за токен), с файловым протоколом задач: задание пишется в `windsurf-task.md`, результат — в `windsurf-result.md`, фоновый watcher сам читает файлы и шлёт в Telegram. Ключевой вывод по итогам отладки — Windsurf сам читал `windsurf-task.md` без дополнительной команды; вся ранее выстроенная эмуляция кликов (`SendInput`/`AttachThreadInput`) оказалась не нужна.

Известные грабли (все решены на момент последней сессии, подробности — в [[90-Архив/old-workflow/Индекс]]): кракозябры кириллицы в CMD (CP866 vs UTF-8), `FileSystemWatcher` пропускал события на Windows (заменено на polling), блокирующий `await` в polling loop не давал реагировать на кнопку Approve.

## Approve-лист (какие операции требуют подтверждения)

Требует подтверждения: `npm install/uninstall`, `rm`/`Remove-Item`, SQL-миграции, деплой на VPS.
Без подтверждения: `git status/diff/add/commit`, `npm test`, `npm run lint`, `npx expo start`.

## Timeout

По умолчанию 60 секунд — авто-Cancel. Меняется в `scripts/telegram-bridge.cjs` → `TIMEOUT_MS`.

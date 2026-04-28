# MVP-план: Telegram Intake Pipeline

> Статус: 🔄 В реализации | Дата: 28.04.2026

---

## Цель

Собрать рабочий полуавтоматический пайплайн:
**голос/текст → Telegram-бот → [INTAKE]-блок → Perplexity → Windsurf-ready prompt → Windsurf → approve**

---

## Чеклист

### Этап 1 — Текстовый intake ✅/❌
- [ ] Бот принимает текстовое сообщение
- [ ] Бот возвращает структурированный [INTAKE]-блок
- [ ] Формат соответствует `docs/workflow/telegram-intake-format.md`

### Этап 2 — Голосовой intake ✅/❌
- [ ] Бот принимает voice message
- [ ] Голос транскрибируется в текст
- [ ] Возвращается такой же [INTAKE]-блок

### Этап 3 — Связка с Perplexity ✅/❌
- [ ] Ты копируешь [INTAKE]-блок в Perplexity
- [ ] Perplexity возвращает Windsurf-ready prompt по шаблону
- [ ] Prompt вставлен в Windsurf
- [ ] Windsurf выполнил тестовый мини-фикс

### Этап 4 — Approve flow ✅/❌
- [ ] Push идёт через `scripts/git-push-safe.ps1`
- [ ] Telegram approve отрабатывает корректно
- [ ] При необходимости — deploy через `scripts/safe-deploy.ps1`

---

## Файлы MVP

### Создать в `tg-bot`
- `scripts/telegram-intake-bot.cjs` — Node.js бот: text + voice → [INTAKE]
- `scripts/transcribe-voice.js` — загрузка и транскрипция voice-файла
- `scripts/format-intake.js` — форматирование структурированного блока

### Создать в `docs`
- `workflow/telegram-intake-format.md` ✅
- `workflow/perplexity-windsurf-pipeline.md` ✅
- `workflow/tomorrow-mvp-plan.md` ✅ (этот файл)
- `templates/intake-message-template.md`
- `templates/perplexity-request-template.md`
- `templates/windsurf-execution-template.md`

### Обновить
- `AGENTS.md` — добавить правило про `perplexity-reviewed`
- `.windsurfrules` — добавить запрет самостоятельного анализа архитектуры

---

## Технологии

| Задача | Решение |
|---|---|
| Telegram bot | Node.js (node-telegram-bot-api или raw API) |
| Voice transcription | Telegram file download → Whisper API / Yandex SpeechKit (на выбор) |
| Intake форматирование | Rule-based formatter в `format-intake.js` |
| Анализ и prompt | Perplexity |
| Исполнение | Windsurf |
| Approve | `telegram-approve.js` (уже готов) |

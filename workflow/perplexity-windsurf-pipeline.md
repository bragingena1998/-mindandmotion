# Perplexity → Windsurf Pipeline

> Актуальная схема работы. Последнее обновление: 28.04.2026

---

## Роли

| Участник | Роль | Что делает |
|---|---|---|
| **Ты** | Owner / Supervisor | Постановка задач, approve опасных действий, финальный контроль |
| **Telegram-бот** | Intake channel | Принимает голос/текст, возвращает структурированный [INTAKE]-блок |
| **Perplexity** | Brain / Architect | Анализ, root-cause, создание Windsurf-ready prompt |
| **Windsurf** | Executor / Hands | Выполняет prompt по шагам, коммитит, не думает самостоятельно |
| **Telegram approve** | Safety gate | Подтверждает опасные действия (push, deploy, install, delete) |

---

## Схема пайплайна

```
Ты (голос или текст)
       ↓
[Telegram intake-бот]
       ↓
  транскрипт + форматирование
       ↓
  ответ: [INTAKE]-блок в чат
       ↓
Ты копируешь блок → Perplexity
       ↓
  root-cause analysis
  пошаговый план
  Windsurf-ready prompt
       ↓
Ты вставляешь prompt → Windsurf
       ↓
  Windsurf выполняет по шагам
       ↓
  опасное действие? → Telegram approve
       ↓
Ты нажимаешь ✅ Approve / ❌ Cancel
       ↓
  git push / deploy
```

---

## Принципы

1. **Windsurf не анализирует архитектуру сам**, если задача пришла с пометкой `perplexity-reviewed: true`
2. **Windsurf не делает опасные действия без approve** — список в `AGENTS.md → Terminal safety`
3. **Perplexity = prompt compiler**, Windsurf = executor — не путать роли
4. **Intake-бот не принимает решений** — только форматирует и возвращает блок

---

## Шаги вызова Perplexity (стандартный запрос)

Копируй шаблон из `docs/templates/perplexity-request-template.md`.

```
Сделай Windsurf-ready prompt.

Вот intake:
[INTAKE]
...
[/INTAKE]

Нужно:
1. Краткий root-cause analysis (2-3 предложения)
2. Пошаговый план реализации
3. Точный prompt для Windsurf
4. Что проверить после выполнения
```

---

## Когда НЕ гонять через весь пайплайн

- Косметические правки (текст, цвет, отступ) → сразу в Windsurf, без Perplexity
- Очевидный тайпо в коде → сразу фикс
- Обновление документации → сразу

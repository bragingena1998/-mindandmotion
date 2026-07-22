# Mind & Motion — Документация проекта (АРХИВ, DEPRECATED)

> ⚠️ **Эта ветка больше не источник правды.** С 2026-07-22 вся актуальная документация,
> правила, статус платформ и история решений ведутся в Obsidian-vault:
> `E:\ProjectMM\vault` (git-подмодуль, ветка `docs-vault`), см. `00-Обзор/Обзор.md`.
>
> Причины переноса: workflow под Windsurf/Perplexity, под который писалась эта
> документация, больше не используется (сейчас — Claude Code); часть файлов здесь
> противоречит друг другу и реальному коду (см. `vault/08-Решения/История-решений.md`).
> Часть материала (раннбуки, домен, API) перенесена в vault и сверена с кодом;
> workflow-специфичные файлы (`.windsurf/rules/`, `prompts/`, `templates/`,
> `workflow/`) перенесены в `vault/90-Архив/old-workflow/` как историческая справка.
>
> Эта ветка сохраняется как замороженный архив — не обновлять, не использовать как
> источник для новых решений без сверки с реальным кодом.

---

> Эта ветка (`docs`) — единственный источник правды для AI-агентов и разработчика.
> Читать файлы в порядке нумерации.

## Структура

```
docs/  (локально: E:\ProjectMM\docs)
├── AGENTS.md                  ← ЧИТАТЬ ПЕРВЫМ. Общий контракт: стек, API, законы
├── REPO_MAP.md                ← Карта всех веток, папок и путей
├── STATUS.md                  ← Текущий статус всех платформ и фич
├── .windsurf/
│   ├── rules/
│   │   ├── 00-project.md      ← Проект, роли, рабочий процесс
│   │   ├── 01-web.md          ← Web + PWA (React/Vite, ветка web)
│   │   ├── 02-mobile.md       ← React Native + Expo (ветка mobile)
│   │   └── 03-backend.md      ← Node.js + Express + MySQL (ветка backend)
│   └── workflows/             ← Windsurf automation workflows
├── .agent/
│   ├── wiki/
│   │   └── domain.md          ← Домен: типы, сущности, маппинг полей
│   │   ⚠️ mobile-screens.md  ← НЕ СОЗДАН (запланирован)
│   │   ⚠️ api.md             ← НЕ СОЗДАН (запланирован)
│   └── spec/
│       ├── feature-parity.md  ← Паритет функций: mobile/web/backend
│       └── tasks.md           ← Шаблон постановки задачи агенту
├── prompts/
│   ├── new-feature.md         ← Шаблон промта: новая фича
│   ├── bugfix.md              ← Шаблон промта: багфикс
│   └── mobile-to-web.md       ← Шаблон промта: перенос фичи mobile→web
├── runbooks/
│   ├── setup-local.md
│   ├── deploy-backend.md
│   ├── deploy-web-vps.md
│   ├── build-android.md
│   ├── rollback.md
│   └── telegram-bridge.md
├── workflow/
│   └── perplexity-windsurf-pipeline.md
├── audit/                     ← Детальный аудит структуры
└── handoffs/
    └── TEMPLATE.md            ← Шаблон отчёта после сессии
```

## Как работать

1. **Я (владелец)** → ставлю задачу в чат Perplexity (мозг)
2. **Perplexity** → читает документацию из GitHub, проектирует план, даёт промт для Windsurf
3. **Windsurf** → получает промт, читает нужные файлы, делает изменения локально
4. **Я** → тестирую, пушу в нужную ветку, отчёт в чат
5. **Perplexity** → обновляет документацию если нужно

## Ветки репозитория

| Ветка | Локальная папка | Назначение |
|-------|-------|------------|
| `web` | `E:\ProjectMM\web` | React/Vite сайт + PWA |
| `mobile` | `E:\ProjectMM\mobile` | React Native Android |
| `backend` | `E:\ProjectMM\backend` | Node.js + Express + MySQL |
| `docs` | `E:\ProjectMM\docs` | Эта ветка — документация |
| `tg-bot` | `E:\ProjectMM\tg-bot` | Telegram-бот |
| `habits-app` | `E:\ProjectMM\habits-app` | Архив — не трогать |

# Mind & Motion — Документация проекта

> Эта ветка (`docs`) — единственный источник правды для AI-агентов и разработчика.
> Читать файлы в порядке нумерации.

## Структура

```
docs/
├── AGENTS.md                  ← ЧИТАТЬ ПЕРВЫМ. Общий контракт: стек, API, законы
├── .windsurf/
│   └── rules/
│       ├── 00-project.md      ← Проект, роли, рабочий процесс
│       ├── 01-web.md          ← Web + PWA (React/Vite, web-review)
│       ├── 02-mobile.md       ← React Native + Expo (mobile-dev3.0)
│       └── 03-backend.md      ← Node.js + Express + MySQL (backend)
├── .agent/
│   ├── wiki/
│   │   ├── domain.md          ← Домен: типы, сущности, маппинг полей
│   │   ├── mobile-screens.md  ← Функции всех экранов RN (референс для web)
│   │   └── api.md             ← Полный список эндпоинтов
│   └── spec/
│       ├── feature-parity.md  ← Паритет функций: mobile/web/backend
│       └── tasks.md           ← Шаблон постановки задачи агенту
└── prompts/
    ├── new-feature.md         ← Шаблон промта: новая фича
    ├── bugfix.md              ← Шаблон промта: багфикс
    └── mobile-to-web.md       ← Шаблон промта: перенос фичи mobile→web
```

## Как работать

1. **Я (владелец)** → ставлю задачу в чат Perplexity (мозг)
2. **Perplexity** → читает документацию из GitHub, проектирует план, даёт промт для Windsurf
3. **Windsurf/Kimi** → получает промт, читает нужные файлы, делает изменения локально
4. **Я** → тестирую, пушу в нужную ветку, отчёт в чат
5. **Perplexity** → обновляет документацию если нужно

## Ветки репозитория

| Ветка | Назначение |
|-------|------------|
| `web-review` | Новый React/Vite сайт + PWA (основная разработка) |
| `mobile-dev3.0` | React Native приложение Android |
| `backend` | Node.js + Express + MySQL API |
| `docs` | **Эта ветка** — только документация |

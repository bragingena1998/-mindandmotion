# Mind & Motion — Карта репозитория

> Навигационный файл. Читать первым при старте любой сессии.
> Последнее обновление: апрель 2026

---

## Ветки и локальные папки

| Ветка | Локальная папка | Назначение | Статус |
|-------|-----------------|------------|--------|
| `web` | `E:\ProjectMM\web` | React + Vite + PWA (новый сайт) | 🟡 В разработке |
| `backend` | `E:\ProjectMM\backend` | Node.js + Express + MySQL | 🟢 Продакшн |
| `mobile` | `E:\ProjectMM\mobile` | React Native + Expo (Android) | 🟢 Продакшн |
| `docs` | `E:\ProjectMM\docs` | Документация, правила агентов | 🟢 Актуально |
| `habits-app` | `E:\ProjectMM\habits-app` | Старая веб-версия (HTML/CSS/JS) | 🗄️ Архив, не трогать |
| `tg-bot` | `E:\ProjectMM\tg-bot` | Telegram-бот (уведомления, деплой) | 🟡 В разработке |

---

## Что читать перед задачей

| Тип задачи | Файлы для чтения |
|------------|------------------|
| Любая задача | `AGENTS.md` → `STATUS.md` |
| Web / PWA | + `.windsurf/rules/01-web.md` → `ARCHITECTURE.md` |
| Mobile | + `.windsurf/rules/02-mobile.md` |
| Backend / API | + `.windsurf/rules/03-backend.md` → `.agent/wiki/domain.md` |
| Новая фича | + `.agent/spec/feature-parity.md` |
| Деплой бэкенда | + `runbooks/deploy-backend.md` |
| Деплой сайта | + `runbooks/deploy-web-vps.md` |
| Первый запуск локально | + `runbooks/setup-local.md` |
| Android сборка | + `runbooks/build-android.md` |
| TG-бот | + `runbooks/tg-bot.md` |

---

## Структура docs-ветки (E:\ProjectMM\docs)

```
docs/  (ветка: docs)
├── AGENTS.md                  ← Главный контракт для агентов (читать первым)
├── REPO_MAP.md                ← Этот файл
├── STATUS.md                  ← Текущий статус всех платформ и фич
├── ARCHITECTURE.md            ← Архитектура веб-клиента
├── DOMAIN.md                  ← Доменные сущности и бизнес-логика
├── HABITS_AUDIT.md            ← Аудит экранов привычек (мобилка → веб)
├── WEB_TRANSFER_GUIDE.md      ← Гайд переноса функций с мобилки на веб
├── ANALYSIS.md                ← Анализ текущего состояния
├── MIGRATION.md               ← Описание миграций БД
├── MIGRATION_PRIORITIES.md    ← Приоритеты миграции
├── runbooks/
│   ├── setup-local.md         ← Первый запуск проекта локально
│   ├── deploy-backend.md      ← Деплой Node.js бэкенда на VPS
│   ├── deploy-web-vps.md      ← Деплой веб-сайта на VPS
│   ├── build-android.md       ← Сборка APK через EAS + публикация
│   ├── rollback.md            ← Откат деплоя
│   └── telegram-bridge.md     ← TG approve-gate для деплоев
├── workflow/
│   └── perplexity-windsurf-pipeline.md ← Рабочий процесс Perplexity→Windsurf
├── handoffs/
│   └── TEMPLATE.md            ← Шаблон отчёта после сессии
├── audit/                     ← Детальный аудит структуры файлов
├── prompts/                   ← Шаблоны промтов для агентов
├── .windsurf/
│   ├── rules/
│   │   ├── 00-project.md      ← Общие правила проекта
│   │   ├── 01-web.md          ← Web + PWA специфика
│   │   ├── 02-mobile.md       ← React Native специфика
│   │   └── 03-backend.md      ← Backend специфика
│   └── workflows/             ← Windsurf automation workflows
└── .agent/
    ├── spec/
    │   ├── feature-parity.md  ← Список фич для переноса с мобилки
    │   └── tasks.md           ← Текущие задачи
    └── wiki/
        └── domain.md          ← Доменная модель, схема БД
```

> ⚠️ Файлы `.agent/wiki/mobile-screens.md` и `.agent/wiki/api.md` — **не созданы**, запланированы.

---

## Структура остальных веток

### web (E:\ProjectMM\web)
```
web/
├── src/
│   ├── api/           ← client.ts, habits.ts, tasks.ts
│   ├── components/    ← 15 компонентов (HabitTable, TaskCard, модалки...)
│   ├── context/       ← AuthContext, BannerContext
│   ├── pages/         ← Habits.tsx, Tasks.tsx, Login.tsx
│   │                     ⚠️ Dashboard.tsx — заглушка в App.tsx (не создана)
│   │                     ⚠️ Register.tsx — заглушка в App.tsx (не создана)
│   ├── styles/        ← global.css, habits.css, tasks.css, variables.css
│   └── utils/         ← habitUtils.ts
├── .windsurfrules
└── package.json       ⚠️ tsconfig.json отсутствует
```

### mobile (E:\ProjectMM\mobile)
```
mobile/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/       ⚠️ TasksScreen.js.save — резервная копия, удалить
│   ├── services/
│   ├── theme/
│   └── utils/
├── App.js
├── app.json
├── eas.json
└── package.json
```

### backend (E:\ProjectMM\backend)
```
backend/
├── routes/            ← auth, tasks, habits, folders, subtasks, users, birthdays
├── middleware/        ← auth.js
├── db.js
├── server.js
├── emailService.js
├── initDB.js
└── package.json
```

### tg-bot (E:\ProjectMM\tg-bot)
```
tg-bot/
├── index.js           ← Основной файл бота
└── package.json
```
> Telegram-бот для уведомлений и approve-gate перед деплоем.
> Использует переменные из общего .env в backend.

### habits-app (E:\ProjectMM\habits-app) — АРХИВ
```
habits-app/
├── web/               ← Старая HTML/CSS/JS версия
├── index.html         ← 93KB — основной файл (~91KB)
├── tasks.css          ← 46KB
├── auth.js
└── header.html
```
> ⛔ Не трогать. Архив старой версии.

---

## VPS — серверная инфраструктура

| Ресурс | Адрес / Путь |
|--------|-------------|
| Сайт | `https://mindandmotion.ru` |
| API | `https://mindandmotion.ru/api` |
| Хостинг | VPS Beget |
| Backend на сервере | `/var/www/backend/` |
| Веб-сайт на сервере | `/var/www/web/dist/` (после деплоя) |
| Process manager | PM2 (`pm2 list`, `pm2 restart backend`) |

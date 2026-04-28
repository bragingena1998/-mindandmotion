# Mind & Motion — Карта репозитория

> Навигационный файл. Читать первым при старте любой сессии.
> Последнее обновление: апрель 2026

---

## Ветки и локальные папки

| Ветка | Локальная папка | Назначение | Статус |
|-------|-----------------|------------|--------|
| `web-review` | `E:\Mobile app = web + web ios\apps\web` | React + Vite + PWA | 🟡 В разработке |
| `backend` | `E:\Mobile app = web + web ios\backend` | Node.js + Express + MySQL | 🟢 Продакшн |
| `mobile-dev3.0` | `E:\Mobile app = web + web ios\mindandmotion-mobile` | React Native + Expo | 🟢 Продакшн |
| `docs` | `E:\Mobile app = web + web ios\docs` | Документация, правила | 🟢 Актуально |
| `web-dev` | `E:\Mobile app = web + web ios\habits-app` | Старая версия | 🗄️ Архив, не трогать |

---

## Что читать перед задачей

| Тип задачи | Файлы для чтения |
|------------|------------------|
| Любая задача | `AGENTS.md` → `docs/STATUS.md` |
| Web / PWA | + `.windsurf/rules/01-web.md` → `docs/ARCHITECTURE.md` |
| Mobile | + `.windsurf/rules/02-mobile.md` |
| Backend / API | + `.windsurf/rules/03-backend.md` → `.agent/wiki/domain.md` |
| Новая фича | + `.agent/spec/feature-parity.md` |
| Деплой бэкенда | + `docs/runbooks/deploy-backend.md` |
| Деплой сайта | + `docs/runbooks/deploy-web-vps.md` |
| Первый запуск локально | + `docs/runbooks/setup-local.md` |
| Android сборка | + `docs/runbooks/build-android.md` |

---

## Структура docs-ветки

```
docs/
├── AGENTS.md                  ← Главный контракт для агентов (читать первым)
├── REPO_MAP.md                ← Этот файл
├── STATUS.md                  ← Текущий статус всех платформ и фич
├── ARCHITECTURE.md            ← Архитектура веб-клиента
├── DOMAIN.md                  ← Доменные сущности и бизнес-логика
├── WEB_TRANSFER_GUIDE.md      ← Гайд переноса функций с мобилки на веб
├── runbooks/
│   ├── setup-local.md         ← Первый запуск проекта локально
│   ├── deploy-backend.md      ← Деплой Node.js бэкенда на VPS
│   ├── deploy-web-vps.md      ← Деплой веб-сайта на VPS
│   └── build-android.md       ← Сборка APK через EAS + публикация
└── handoffs/
    └── TEMPLATE.md            ← Шаблон отчёта после сессии

.windsurf/
└── rules/
    ├── 00-project.md          ← Общие правила проекта
    ├── 01-web.md              ← Web + PWA специфика
    ├── 02-mobile.md           ← React Native специфика
    └── 03-backend.md          ← Backend специфика

.agent/
├── spec/
│   ├── feature-parity.md      ← Список фич для переноса с мобилки
│   └── tasks.md               ← Текущие задачи
└── wiki/
    └── domain.md              ← Доменная модель, схема БД
```

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

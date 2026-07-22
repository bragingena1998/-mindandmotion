# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Источник правды: `vault/`, не `docs/`

**Read `vault/00-Обзор/Обзор.md` first.** As of 2026-07-22, the Obsidian vault at `E:\ProjectMM\vault` (git submodule, branch `docs-vault`) is the authoritative source for architecture, current platform status, domain model, known issues, decisions log, and agent rules — not `docs/`.

`docs/` (submodule, branch `docs`) is a **frozen archive** — it was written for an old Windsurf/Perplexity workflow, is marked deprecated in its own `README.md`, and several of its files contradict each other and the real code (verified by a fresh code audit on 2026-07-22 — see `vault/08-Решения/История-решений.md` for specifics). Do not treat anything in `docs/` as current without cross-checking the real code. `docs-v2/` (plain folder, not a submodule) has been retired the same way — its content moved into `vault/08-Решения/` and `vault/09-Проблемы/`.

## Session start/end automation

- **Session start** (owner greets, e.g. "привет"): run `git pull` in every submodule that has a remote (`backend`, `mobile`, `web`, `docs`, `vault`, `tg-bot`, `landing`) before doing anything else — the owner may be switching machines (home PC vs laptop). Note: `vault/` uses the `obsidian-git` plugin with `autoPullInterval: 10` (minutes) and `autoBackupAfterFileChange: true`, so it may already be in sync if Obsidian was open there — pull anyway, it's cheap and safe.
- **Session end** (owner says something like "на сегодня всё"/"на этом всё"): write a dated session-summary note in `vault/` (what changed, new decisions/problems opened or closed — use `vault/Templates/Итог-сессии.md`), then `git push` any submodule with local commits made during the session (typically `docs`/`vault`; others only if the session actually touched them — never push `backend`/`mobile`/`web` without the owner reviewing what's in them first, since those often carry the owner's own in-progress uncommitted work alongside anything I did).
- This is a standing, pre-authorized instruction for `git pull`/`git push` on the submodules listed above — no need to ask before each one. Still always state what was pulled/pushed and to which branch. Deploys, DB migrations, and anything touching the Beget VPS remain **never silent** — always confirm before executing, per the owner's explicit instruction.

Key vault entry points:
- `vault/00-Обзор/Обзор.md` — home/MOC, links to everything, open issues list
- `vault/07-Правила/Правила-агента.md` — the actual working contract (git rules, code rules, process, documentation protocol)
- `vault/01-Backend/`, `02-Mobile/`, `03-Web/`, `04-Landing/`, `05-TG-Bot/` — per-platform "Текущее-состояние.md" (verified against real code)
- `vault/06-Домен/Сущности.md` — cross-platform entity shapes
- `vault/09-Проблемы/` — known bugs/tech debt, each note has `status`/`platform`/`severity` frontmatter (queryable via Dataview)

## Структура репозитория

`E:\ProjectMM` — superproject; `backend/`, `mobile/`, `web/`, `tg-bot/`, `habits-app/`, `docs/`, `vault/` are **git submodules**, each with its own remote branch. `docs-v2/` and `context-perplexity/` are plain folders (not submodules) tracked directly in the superproject.

Always check `git -C <submodule> branch --show-current` before trusting any doc's claimed branch name. As of this writing the submodules are checked out as:

| Папка | Ветка (актуально) | Стек | Статус |
|-------|--------------------|------|--------|
| `mobile/` | `mobile` | React Native + Expo (bare), React Navigation, Expo SQLite, AsyncStorage | 🟢 Продакшн |
| `backend/` | `backend` | Node.js + Express + MySQL (mysql2), JWT, bcrypt, nodemailer | 🟢 Продакшн |
| `web/` | `web` | React 18 + Vite + TypeScript, React Router, Axios, date-fns, Lucide | 🟡 Разработка |
| `tg-bot/` | `tg-bot` | Node.js — Telegram-мост для approve-gate (старый workflow) | 🟡 Частично актуален |
| `docs/` | `docs` | **Архив, deprecated** — см. выше | 🗄️ Архив |
| `vault/` | `docs-vault` | Obsidian vault — актуальная документация | 🟢 Источник правды |
| `landing/` | `landing` | Статический HTML/CSS/JS — сайт mindandmotion.store | 🟢 Готов |
| `habits-app/` | `web-dev` (remote: Beget) | Старый HTML/CSS/JS — **архив, не трогать** | 🗄️ Архив |

`landing/` подключён как submodule 2026-07-22 (до этого жил отдельно в незакоммиченной как submodule локальной папке `E:\ProjectMM-landing` — та папка всё ещё существует на диске, но избыточна теперь, submodule её заменяет).

## Команды запуска

```powershell
# Mobile (из E:\ProjectMM\mobile)
npm start          # Expo dev server
npm run android    # expo run:android
npm run ios        # expo run:ios (macOS only)
npm run web        # expo start --web

# Backend (из E:\ProjectMM\backend)
npm start          # node server.js (prod)
npm run dev        # nodemon server.js (dev)

# Web (из E:\ProjectMM\web)
npm run dev        # vite --port 3001 (overrides vite.config.ts's default 3002)
npm run build      # vite build
npm run preview    # vite preview

# TG Bot (из E:\ProjectMM\tg-bot) — no package.json here; run scripts directly
node scripts/telegram-bridge.cjs
powershell -File scripts/watch-task.ps1
# start-bot.cmd only covers watch-result.js, not the full pipeline — see vault/05-TG-Bot
```

Нет настроенных lint/test-скриптов ни в одном из подпроектов — проверять изменения запуском dev-сервера / ручным тестированием.

## Архитектура (сверено с кодом 2026-07-22 — детали в vault)

**Backend** (`backend/server.js`): все роуты смонтированы под `/api` (включая auth — `/api/login`, не `/auth/login`). Роуты в `backend/routes/`: `auth`, `users`, `tasks`, `subtasks`, `subtaskActions`, `habits`, `folders`, `birthdays`, `secretChat`, `policies`. JWT-проверка — `backend/middleware/auth.js`, секрет с небезопасным хардкод-фолбэком (см. `vault/09-Проблемы/JWT-секрет-фолбэк.md`). Порт — `process.env.PORT || 3000`; `.env` бэкенда переменной `PORT` не содержит вовсе, значит фактический локальный порт **3000**, не 5000. Известная IDOR-дыра в subtasks-роутах — `vault/09-Проблемы/IDOR-подзадачи.md`.

**Web** (`web/src`): React + Vite + TS. Dashboard **полностью реализован** (5 рабочих виджетов) — старая документация, называвшая его заглушкой, неверна. Calendar/Profile/Register/SecretChat — реальные inline-заглушки в `App.tsx`. `App.tsx` не использует `AuthContext` для проверки авторизации (держит свой отдельный state) — известный технический долг, см. `vault/09-Проблемы/Технический-долг-web.md`.

**Mobile** (`mobile/src`): React Native (Expo bare workflow). Офлайн-режим на `expo-sqlite` реально реализован и используется (`utils/cacheManager.js`, `utils/syncQueue.js`, `hooks/useLocalFirst.js`) — миграция с MMKV завершена, но мёртвый MMKV-файл остался в репозитории. ⚠️ Токен хранится в **AsyncStorage** (`services/storage.js`), не в SecureStore — SecureStore используется только для PIN-кода блокировки приложения. Цвета — через `useTheme()`.

**Данные**: `User`, `Task`, `Subtask`, `Folder`, `Habit` + `HabitRecord`, `Birthday` — полная актуальная схема полей (снята с `initDB.js`, не с домыслов) в `vault/06-Домен/Сущности.md`.

## Ключевые факты

- **API Base URL:** `https://mindandmotion.ru/api` (prod), `http://localhost:3000/api` (local backend, дефолтный порт — см. выше)
- **Auth:** JWT в `Authorization: Bearer <token>`; web — localStorage (`app-auth-token`/`mm_token`), mobile — **AsyncStorage** (не SecureStore)
- **БД:** MySQL на VPS Beget, PM2-процесс `mindandmotion-backend`; раннбуки — `vault/10-Раннбуки/`
- **Ветки строгие** — пушить изменения только в свою ветку (см. таблицу выше); не переключать ветки подмодулей без явной команды владельца
- **PowerShell only** на Windows (нет `&&`, пути в кавычках, диск `E:\`)
- **Документация:** после задачи, затрагивающей архитектуру/статус — обновить соответствующую заметку в `vault/`, не в `docs/`. Полный протокол — `vault/07-Правила/Правила-агента.md`
- **Не создавать** `.save`, `.bak`, `*_copy` и прочие мусорные файлы в рабочих директориях
- ⚠️ **Известная критическая проблема:** в `context-perplexity/` (не submodule, обычная папка в суперпроекте) в открытом виде лежат боевые секреты (пароль MySQL, JWT_SECRET, пароль почты, Groq API key) в 5 из 11 файлов истории переписки. Не запускать `git push`/не подключать remote к веткам суперпроекта без предварительной очистки истории. Подробности — `vault/09-Проблемы/Утечка-секретов-context-perplexity.md`

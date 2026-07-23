# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Источник правды: `vault/`, не `docs/`

**Read `vault/00-Обзор/Обзор.md` first.** As of 2026-07-22, the Obsidian vault at `E:\ProjectMM\vault` (git submodule, branch `docs-vault`) is the authoritative source for architecture, current platform status, domain model, known issues, decisions log, and agent rules — not `docs/`.

`docs/` (submodule, branch `docs`) is a **frozen archive** — it was written for an old Windsurf/Perplexity workflow, is marked deprecated in its own `README.md`, and several of its files contradict each other and the real code (verified by a fresh code audit on 2026-07-22 — see `vault/08-Решения/История-решений.md` for specifics). Do not treat anything in `docs/` as current without cross-checking the real code. `docs-v2/` (plain folder, not a submodule) has been retired the same way — its content moved into `vault/08-Решения/` and `vault/09-Проблемы/`.

## Session start/end automation

- **Session start** (owner greets, e.g. "привет"): run `git pull` in every submodule that has a remote (`backend`, `mobile`, `web`, `docs`, `vault`, `landing`) **and** in the superproject itself (`E:\ProjectMM`, branch `meta`, remote `origin` = `https://github.com/bragingena1998/mindandmotion.git`) before doing anything else — the owner may be switching machines (home PC vs laptop). Note: `vault/` uses the `obsidian-git` plugin with `autoPullInterval: 10` (minutes) and `autoBackupAfterFileChange: true`, so it may already be in sync if Obsidian was open there — pull anyway, it's cheap and safe.
- **Morning report** (part of the greeting response, 2026-07-23): after pulling, give a short briefing — open/unresolved issues per platform from `vault/09-Проблемы/` (status ≠ resolved), and what was planned/left in progress from the last session's note in `vault/` (see session-summary notes, dated). Keep it scannable — bullet points per branch/platform, not a wall of text.
- **Session end** (owner says something like "на сегодня всё"/"на этом всё"): give an **evening report** first — what was actually done this session (features, fixes, decisions), which branches/files changed, any new open issues — then write it as a dated session-summary note in `vault/` (use `vault/Templates/Итог-сессии.md`), then commit + `git push` **every** submodule with local changes made during the session (`backend`, `mobile`, `web`, `docs`, `vault`, `landing`) plus the superproject itself (bump submodule pointers, push `meta`). This is symmetric — pull and push both happen at both ends, on all tracked branches, per the owner's explicit instruction (2026-07-22).
- This is a standing, pre-authorized instruction for `git pull`/`git push`/routine commits on the submodules + superproject listed above — no need to ask before each one. Still always state what was pulled/pushed and to which branch. **Never touch `habits-app/` or `tg-bot/`** (both frozen archives, out of scope — see below). Deploys, DB migrations, and anything touching the Beget VPS remain **never silent** — always confirm before executing, per the owner's explicit instruction.
- These morning/evening reports are a deliberate, low-tech replacement for the Telegram-bot idea explored and abandoned 2026-07-23 — see `vault/05-TG-Bot/Текущее-состояние.md`. The owner uses Claude Code's built-in **Remote Control** (mobile app, Code tab) for working from the phone instead; no scheduled/always-on process is needed since these reports just hook into the greeting/farewell already happening at session boundaries.
- **Before committing anything, `git status` first and eyeball the file list** — this project has twice had a `.env` file get force-staged despite `.gitignore` (once in `backend/`, caught 2026-07-22 before it was pushed). Never blind `git add -A && git commit` on a submodule without checking what's actually staged.
- **After writing or editing any `.gitignore` (or other plain-text config file) on this machine, verify its encoding before committing** — `Write`/`Edit` have intermittently produced UTF-16 output here (root cause not fully understood; happened to `backend/.gitignore` and `tg-bot/.gitignore`, silently defeating the ignore rules and nearly causing a second secrets leak on 2026-07-22). Check with `head -c 40 <file> | xxd` — real UTF-8/ASCII has no `00` bytes between characters. If corrupted, rewrite via `cat > file <<'EOF' ... EOF` in Bash (not the Write tool), which has been reliable.
- 2026-07-22 incident: a rename of the superproject's local branch (`landing` → `meta`) was pushed to GitHub without checking its commit history first, briefly publishing `context-perplexity/` (with real secrets) to this **public** repo. Branch was deleted by the owner within minutes and all affected secrets were rotated same-day. Lesson: **before pushing any branch that didn't already exist on the remote, check `git log -- context-perplexity` (or just `git show --stat` on the tip commit) for that branch first.** `context-perplexity/`'s history must be scrubbed (`git filter-repo`) before `meta` is ever pushed again with that folder's history intact.

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
| `tg-bot/` | *(ветка удалена с GitHub)* | Node.js — Telegram-мост, заменён на Remote Control | 🗄️ Архив, не трогать |
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
```

`tg-bot/` — archived 2026-07-23, do not run. See `vault/05-TG-Bot/Текущее-состояние.md`.

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
- `context-perplexity/` — resolved 2026-07-22/23: contained real secrets in plaintext, briefly leaked via a bad branch push, cleaned from git history (`git filter-branch`) and added to `.gitignore`; all affected secrets rotated same day. Files still exist on disk (untracked, restored from backup) for historical reference. Full writeup — `vault/09-Проблемы/Утечка-секретов-context-perplexity.md`.

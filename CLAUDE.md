# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Репозиторий (E:\ProjectMM)

| Папка | Ветка | Стек | Статус |
|-------|-------|------|--------|
| `mobile/` | `mobile-dev3.0` | React Native + Expo (bare), React Navigation, Expo SQLite, SecureStore | 🟢 Продакшн |
| `backend/` | `backend` | Node.js + Express + MySQL (mysql2), JWT, bcrypt, nodemailer | 🟢 Продакшн |
| `web/` | `web-review` | React 18 + Vite + TypeScript, React Router, Axios, date-fns, Lucide | 🟡 Разработка |
| `tg-bot/` | `tg-bot` | Node.js (Telegraf/Node-Telegram-Bot-API) | 🟡 Разработка |
| `habits-app/` | `web-dev` | Старый HTML/CSS/JS — **архив, не трогать** | 🗄️ Архив |
| `docs/` | `docs` | Документация, правила Windsurf, runbooks | 🟢 Актуально |

## Команды запуска

```bash
# Mobile (из E:\ProjectMM\mobile)
npm start          # Expo dev server
npm run android    # Android build/run
npm run ios        # iOS build/run (macOS only)
npm run web        # Expo web

# Backend (из E:\ProjectMM\backend)
npm start          # node server.js (prod)
npm run dev        # nodemon server.js (dev)

# Web (из E:\ProjectMM\web)
npm run dev        # vite --port 3001
npm run build      # vite build
npm run preview    # vite preview

# TG Bot (из E:\ProjectMM\tg-bot)
node index.js
```

## Ключевые факты

- **API Base URL:** `https://mindandmotion.ru/api` (prod), `http://localhost:5000/api` (local backend)
- **Auth:** JWT в `Authorization: Bearer <token>`; web — localStorage (`app-auth-token`), mobile — Expo SecureStore
- **БД:** MySQL на VPS Beget (`/var/www/backend/`), PM2 для процесса
- **Ветки строгие:** web→`web-review`, mobile→`mobile-dev3.0`, backend→`backend`, docs→`docs`
- **PowerShell only** на Windows (нет `&&`, пути в кавычках, диск `E:\`)
- **Документация обязательна:** после задачи — `docs/STATUS.md` + `docs/handoffs/YYYY-MM-DD_описание.md`
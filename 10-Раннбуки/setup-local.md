---
tags: [runbook, setup]
platform: all
verified: false
source: "docs/runbooks/setup-local.md (перенесено и исправлено)"
---

# Первый запуск локально

> Перенесено из архивной ветки `docs/`. Пути и названия веток исправлены на актуальные (проверено `git branch --show-current` в каждом подмодуле на 2026-07-22). Остальное содержимое **не проверялось заново** — считать процедурой-черновиком, не гарантией.

## Предварительные требования

- Node.js 18+
- Git, PowerShell (Windows: без `&&`, пути в кавычках, диск `E:\`)
- Expo CLI: `npm install -g eas-cli`

## 1. Web (React + Vite)

```powershell
Set-Location "E:\ProjectMM\web"
git pull origin web
npm install
npm run dev
# → http://localhost:3001 (порт задан явно в package.json скрипте, а не в vite.config.ts)
```

`.env` в корне `web/`:
```
VITE_API_URL=https://mindandmotion.ru/api
```
Для работы с локальным бэкендом:
```
VITE_API_URL=http://localhost:5000/api
```
⚠️ См. заметку [[backend-arkhitektura|Backend — архитектура]] о несовпадении портов: бэкенд по умолчанию слушает 3000, а прокси/клиенты исторически ждут 5000. Перед использованием — сверить фактический `PORT` в `backend/.env`.

## 2. Backend (Node.js)

```powershell
Set-Location "E:\ProjectMM\backend"
git pull origin backend
npm install
npm run dev
```

`.env` в корне `backend/`:
```
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
PORT=5000
```
⚠️ Реальные значения — только у владельца, никогда не в git и не в чатах (см. [[критическая-находка-секреты]]).

## 3. Mobile (React Native + Expo)

```powershell
Set-Location "E:\ProjectMM\mobile"
git pull origin mobile
npm install
npx expo start
```

## 4. Как проверить, что всё работает

1. Web: `http://localhost:3001` — страница логина.
2. Backend: `http://localhost:5000/api/tasks` — должен вернуть `401` без токена (обратить внимание на фактический порт, см. выше).
3. Прод API: `https://mindandmotion.ru/api/tasks` — тоже `401`.

## Архивная папка (не трогать)

`E:\ProjectMM\habits-app` — старая версия сайта на ванильном HTML/CSS/JS. Не запускать, не изменять, не копировать из неё код.

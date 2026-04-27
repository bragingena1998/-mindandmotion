# Runbook: Первый запуск локально

> Для разработчика или агента, который настраивает проект с нуля.
> Последнее обновление: апрель 2026

---

## Предварительные требования

- Node.js 18+
- Git (PowerShell на Windows)
- Expo CLI: `npm install -g expo-cli eas-cli`

---

## 1. Web (React + Vite)

```powershell
Set-Location "E:\Mobile app = web + web ios\apps\web"
git checkout web-review
git pull origin web-review
npm install
npm run dev
# → http://localhost:3001
```

**Переменные окружения:**
- Создать файл `.env` в корне папки web:
```
VITE_API_URL=https://mindandmotion.ru/api
```
- Для локального бэкенда:
```
VITE_API_URL=http://localhost:5000/api
```

> Vite проксирует `/api` → `http://localhost:5000` если настроен `vite.config.ts`.

---

## 2. Backend (Node.js)

```powershell
Set-Location "E:\Mobile app = web + web ios\backend"
git checkout backend
git pull origin backend
npm install
npm run dev
# → http://localhost:5000/api
```

**Переменные окружения:**
- Создать `.env` в корне папки backend:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=ВАШ_ПАРОЛЬ
DB_NAME=mindandmotion
JWT_SECRET=ВАШ_СЕКРЕТ
PORT=5000
```

> ⚠️ Реальные значения — у владельца, не хранить в git.

---

## 3. Mobile (React Native + Expo)

```powershell
Set-Location "E:\Mobile app = web + web ios\mindandmotion-mobile"
git checkout mobile-dev3.0
git pull origin mobile-dev3.0
npm install
npx expo start
# → Открыть в Expo Go или Android эмуляторе
```

---

## 4. Docs

```powershell
Set-Location "E:\Mobile app = web + web ios\docs"
git checkout docs
git pull origin docs
# Читать Markdown-файлы через любой редактор
```

---

## Как проверить, что всё работает

1. **Web запущен:** `http://localhost:3001` — появляется страница логина
2. **Backend запущен:** `http://localhost:5000/api/tasks` — возвращает `401` (ожидаемо без токена)
3. **API на VPS доступен:** `https://mindandmotion.ru/api/tasks` — возвращает `401`

---

## Архивная папка (не трогать)

`E:\Mobile app = web + web ios\habits-app` — ветка `web-dev`, старая версия сайта.
Не запускать, не изменять, не копировать из неё код.

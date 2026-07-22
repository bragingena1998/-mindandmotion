---
tags: [runbook, deploy, backend]
platform: backend
verified: false
source: "docs/runbooks/deploy-backend.md (перенесено, один эндпоинт исправлен)"
---

# Деплой Backend

> VPS: Beget · Путь: `/var/www/backend/` · PM2-процесс: `mindandmotion-backend`

## Стандартный деплой

```bash
ssh user@mindandmotion.ru
cd /var/www/backend
git pull origin backend
npm install --production   # если менялся package.json
pm2 restart mindandmotion-backend
pm2 status
pm2 logs mindandmotion-backend --lines 20
```

## Healthcheck

```bash
curl https://mindandmotion.ru/api/health

curl https://mindandmotion.ru/api/login \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"wrong"}'
# Ожидаемо: 401 (не 500)
```
⚠️ Исправлено: старая версия раннбука проверяла `/api/auth/login` — такого пути в коде нет. По `backend/server.js` все auth-роуты монтируются как `app.use('/api', authRoutes)`, реальный путь — **`/api/login`**.

## Если что-то пошло не так

```bash
pm2 logs mindandmotion-backend --lines 50
pm2 list
pm2 delete mindandmotion-backend
pm2 start ecosystem.config.js
```
См. также [[rollback|Откат]].

## Миграции БД

```bash
mysql -u root -p mindandmotion
SHOW TABLES;
DESCRIBE tasks;
mysql -u root -p mindandmotion < /var/www/backend/migrations/YYYY-MM-DD_name.sql
```

⚠️ По истории проекта (см. [[История-решений|историю решений]]) миграции БД и деплой считались операциями, требующими подтверждения владельца перед выполнением — сохранить эту практику независимо от того, через какой инструмент сейчас идёт работа (Telegram-бридж описан отдельно в [[telegram-bridge]], но сам принцип "подтверждение перед риском" не привязан к конкретному боту).

⚠️ Не проверено заново на 2026-07-22: актуальный порт backend-процесса, актуальность пути `/var/www/backend/` и точное имя PM2-процесса. См. расхождение портов (3000 vs 5000) в [[backend-arkhitektura|Backend — архитектура]] и в истории решений — на проде минимум один раз именно рассинхрон портов между nginx и PM2 вызывал полный простой API.

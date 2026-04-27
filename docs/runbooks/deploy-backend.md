# Runbook: Deploy Backend

> VPS: Beget | Путь: `/var/www/backend/` | PM2: `mindandmotion-backend`

## Стандартный деплой

```bash
# 1. Подключиться к VPS
ssh user@mindandmotion.ru

# 2. Перейти в папку бэкенда
cd /var/www/backend

# 3. Подтянуть изменения
git pull origin backend

# 4. Установить зависимости (если изменился package.json)
npm install --production

# 5. Перезапустить через PM2
pm2 restart mindandmotion-backend

# 6. Проверить статус
pm2 status
pm2 logs mindandmotion-backend --lines 20
```

## Healthcheck

```bash
curl https://mindandmotion.ru/api/health
# Ожидаемый ответ: { "status": "ok" }

curl https://mindandmotion.ru/api/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"wrong"}'
# Ожидаемый ответ: 401 (не 500)
```

## Если что-то пошло не так

```bash
# Смотреть логи
pm2 logs mindandmotion-backend --lines 50

# Проверить процессы
pm2 list

# Перезапустить принудительно
pm2 delete mindandmotion-backend
pm2 start ecosystem.config.js

# Откатить (смотри rollback.md)
```

## Миграции БД

```bash
# Подключиться к MySQL
mysql -u root -p mindandmotion

# Проверить текущую схему
SHOW TABLES;
DESCRIBE tasks;

# Выполнить миграцию из файла
mysql -u root -p mindandmotion < /var/www/backend/migrations/YYYY-MM-DD_name.sql
```

⚠️ Миграции БД требуют Telegram-апрув перед выполнением.

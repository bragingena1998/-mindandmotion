# Runbook: Деплой Backend на VPS

> Для деплоя Node.js + Express бэкенда на VPS Beget.
> **Деплой выполняет только владелец вручную через SSH.**
> Последнее обновление: апрель 2026

---

## ⚠️ Правила

- Агент **не деплоит автоматически** — только сообщает что нужен деплой
- Перед деплоем — убедиться что `git push origin backend` выполнен
- После деплоя — проверить healthcheck

---

## Шаги деплоя

### 1. Запушить изменения с локала

```powershell
Set-Location "E:\Mobile app = web + web ios\backend"
git add -A
git commit -m "feat/fix: описание изменений"
git push origin backend
```

### 2. Подключиться к VPS по SSH

```bash
ssh USER@mindandmotion.ru
# или по IP: ssh USER@IP_СЕРВЕРА
```

### 3. Обновить код на сервере

```bash
cd /var/www/backend
git pull origin backend
```

### 4. Установить зависимости (если изменился package.json)

```bash
npm install --production
```

### 5. Перезапустить через PM2

```bash
pm2 restart backend
pm2 status
# Убедиться что статус: online
```

### 6. Проверить healthcheck

```bash
curl https://mindandmotion.ru/api/tasks
# Должно вернуть 401 (без токена) — значит сервер работает
```

---

## Если что-то пошло не так — откат

```bash
cd /var/www/backend
git log --oneline -5        # Найти предыдущий рабочий коммит
git checkout <COMMIT_SHA>   # Откатиться
pm2 restart backend
```

---

## Миграция БД

Если в деплое есть изменения схемы БД:
1. Сделать бэкап: `mysqldump -u root -p mindandmotion > backup_$(date +%Y%m%d).sql`
2. Применить миграцию вручную в MySQL
3. Обновить `.agent/wiki/domain.md` с описанием изменений
4. Только после этого деплоить код

---

## Просмотр логов

```bash
pm2 logs backend --lines 50
# или в реальном времени:
pm2 logs backend
```

# Rollback Guide

Инструкция по откату для каждого слоя стека при критических ошибках.

---

## Backend (Node.js / beget.app)

### Быстрый откат через git
```bash
# SSH на сервер
ssh user@твой-сервер

cd ~/backend

# Посмотреть последние коммиты
git log --oneline -10

# Откатить на конкретный коммит
git checkout <COMMIT_SHA>

# Перезапустить
pm2 restart all

# Проверить здоровье
curl http://localhost:3000/api/health
```

### Если нужно вернуть назад (после проверки)
```bash
git checkout backend  # вернуться на актуальную ветку
pm2 restart all
```

### Откат через PM2 (если был graceful deploy)
```bash
pm2 reload all  # zero-downtime reload
# или
pm2 restart all  # hard restart
```

---

## Web / PWA (Nginx на VPS)

### Откат через git
```bash
ssh user@твой-сервер
cd ~/web

git log --oneline -10
git checkout <COMMIT_SHA>

# Пересобрать если нужно
npm run build

# Перезапустить nginx
sudo systemctl reload nginx
```

### Если сборка сломана — откат на предыдущий dist
```bash
# Держи резервную копию dist перед каждым деплоем
cp -r dist dist_backup_$(date +%Y%m%d_%H%M%S)

# Откат:
rm -rf dist && cp -r dist_backup_YYYYMMDD_HHMMSS dist
sudo systemctl reload nginx
```

---

## Mobile (Expo / EAS)

### OTA откат (JS-only изменения)
```bash
# Опубликовать предыдущий стабильный бранч как активный
eas update --branch production --message "rollback: откат на стабильную версию"
```

### Откат нативной сборки
Нативные изменения откатить через OTA нельзя — нужна новая сборка старого кода:
```bash
git checkout <стабильный_тег>
eas build --platform android --profile production
```
После сборки опубликовать в магазин и откатить версию там.

---

## База данных (MySQL)

### Откат миграции
```bash
# Если используешь миграции с нумерацией:
mysql -u user -p dbname < migrations/rollback/XXX_rollback.sql

# Проверить состояние
mysql -u user -p -e "SHOW TABLES;" dbname
```

### Восстановление из бэкапа
```bash
# Создать бэкап перед рискованными операциями (делай всегда!)
mysqldump -u user -p dbname > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить
mysql -u user -p dbname < backup_YYYYMMDD_HHMMSS.sql
```

---

## Чеклист после отката

- [ ] Health endpoint отвечает 200
- [ ] Авторизация работает
- [ ] Основные API эндпоинты отвечают
- [ ] Логи не содержат критических ошибок (`pm2 logs`)
- [ ] Описать причину отката в [handoffs/TEMPLATE.md](../handoffs/TEMPLATE.md)

---
tags: [runbook, rollback]
platform: all
verified: false
source: "docs/runbooks/rollback.md (перенесено как есть)"
---

# Откат (Rollback)

## Backend

```bash
ssh user@mindandmotion.ru
cd /var/www/backend
git log --oneline -10
git checkout <COMMIT_SHA>
pm2 restart all
curl http://localhost:3000/api/health   # ⚠️ сверить фактический порт, см. [[backend-arkhitektura]]
```
Вернуться на актуальную версию:
```bash
git checkout backend
pm2 restart all
```
Zero-downtime вариант: `pm2 reload all` вместо `pm2 restart all`.

## Web

```bash
ssh user@mindandmotion.ru
cd /var/www/web   # либо где реально лежит dist — см. [[deploy-web-vps]]
git log --oneline -10
git checkout <COMMIT_SHA>
npm run build
sudo systemctl reload nginx
```
Если сборка сломана — держать бэкап `dist/` перед каждым деплоем:
```bash
cp -r dist dist_backup_$(date +%Y%m%d_%H%M%S)
rm -rf dist && cp -r dist_backup_YYYYMMDD_HHMMSS dist
sudo systemctl reload nginx
```

## Mobile (Expo/EAS)

OTA-откат (только JS):
```bash
eas update --branch production --message "rollback: откат на стабильную версию"
```
Нативные изменения через OTA не откатить — нужна новая сборка старого кода:
```bash
git checkout <стабильный_тег>
eas build --platform android --profile production
```
После сборки — опубликовать в магазин и откатить версию там же.

## База данных (MySQL)

```bash
# Откат миграции по файлу
mysql -u user -p dbname < migrations/rollback/XXX_rollback.sql

# Восстановление из бэкапа (бэкап делать ДО рискованных операций)
mysqldump -u user -p dbname > backup_$(date +%Y%m%d_%H%M%S).sql
mysql -u user -p dbname < backup_YYYYMMDD_HHMMSS.sql
```

## Чек-лист после отката

- [ ] Health endpoint отвечает 200
- [ ] Авторизация работает
- [ ] Основные API-эндпоинты отвечают
- [ ] Логи не содержат критических ошибок (`pm2 logs`)
- [ ] Причина отката описана заметкой в [[09-Проблемы]]

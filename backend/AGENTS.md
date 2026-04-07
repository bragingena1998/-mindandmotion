# Backend — контекст для AI

> Читать вместе с корневым `AGENTS.md`

## Стек
- Node.js + Express
- MySQL (connection pool через `mysql2`)
- VPS Beget: `root@85.198.96.149`
- Путь: `/var/www/backend/`
- Process manager: PM2
- Ветка: `mobile-dev3.0` (бэкенд живёт там же)

## Структура
```
var/www/backend/
├── server.js           # Точка входа, подключение роутов
├── db.js               # MySQL connection pool
├── routes/
│   ├── auth.js         # Регистрация, логин, forgot-password
│   ├── tasks.js        # CRUD задач, цикличность, фокус-сессии, статистика
│   ├── subtasks.js     # CRUD подзадач
│   ├── subtaskActions.js # Toggle подзадач
│   ├── folders.js      # CRUD папок + reorder
│   ├── habits.js       # CRUD привычек + records + reorder
│   ├── birthdays.js    # CRUD дней рождений/событий
│   ├── users.js        # Профиль пользователя
│   └── secretChat.js   # Личная фича (скрытый чат)
├── middleware/         # Auth middleware (JWT verify)
└── utils/              # Вспомогательные функции
```

## Деплой
```bash
ssh root@85.198.96.149
cd /var/www/backend
git pull origin mobile-dev3.0
pm2 restart server
pm2 logs server --lines 50
```

## Законы
1. Миграции только вручную через phpMyAdmin + запись в ROADMAP
2. Все роуты защищены JWT middleware (кроме /auth/*)
3. MySQL поля snake_case, JS camelCase — маппинг в роутах

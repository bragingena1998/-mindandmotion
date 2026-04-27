# 03 — Backend (Node.js + Express + MySQL)

> Контекст для задач в ветке `backend`.
> Читать вместе с `00-project.md` и `AGENTS.md`.

---

## Стек

- Node.js + Express
- MySQL (connection pool через `mysql2`)
- JWT авторизация (middleware в `/middleware/`)
- VPS Beget: `root@85.198.96.149`
- Путь: `/var/www/backend/`
- Process manager: PM2
- Ветка: `backend`

---

## Структура

```
/var/www/backend/
├── server.js                # Точка входа, подключение роутов
├── db.js                    # MySQL connection pool
├── routes/
│   ├── auth.js              # Регистрация, логин, forgot-password
│   ├── tasks.js             # CRUD задач, цикличность, фокус-сессии, статистика
│   ├── subtasks.js          # CRUD подзадач
│   ├── subtaskActions.js    # Toggle подзадач
│   ├── folders.js           # CRUD папок + reorder
│   ├── habits.js            # CRUD привычек + records + reorder
│   ├── birthdays.js         # CRUD дней рождений/событий
│   ├── users.js             # Профиль пользователя
│   └── secretChat.js        # Личная фича (скрытый чат)
├── middleware/              # Auth middleware (JWT verify)
└── utils/                  # Вспомогательные функции
```

---

## Законы

1. **Миграции только вручную через phpMyAdmin** + обязательная запись что изменено
2. **Все роуты защищены JWT middleware** (кроме `/auth/*`)
3. **MySQL поля snake_case, JS camelCase** — маппинг в роутах
4. **Никогда не хранить секреты в коде** — только в переменных окружения

---

## Деплой

```bash
ssh root@85.198.96.149
cd /var/www/backend
git pull origin backend
pm2 restart server
pm2 logs server --lines 50
```

---

## Схема БД (MySQL)

```sql
users (id, email, password_hash, name, created_at)

tasks (id, user_id, title, date, deadline, time, priority, done, done_date,
       comment, isrecurring, recurrencetype, recurrencevalue, isgenerated,
       templateid, folderid, focussessions, subtasks_count)

subtasks (id, task_id, title, completed, created_at)

folders (id, user_id, name, emoji, order_index, created_at)

habits (id, user_id, name, unit, plan, target_type, start_date, end_date,
        days_of_week JSON, order_index, created_at)

habit_records (id, habit_id, user_id, year, month, day, value FLOAT,
               UNIQUE KEY (habit_id, year, month, day))

birthdays (id, user_id, name, day, month, year, type, notify_before)
```

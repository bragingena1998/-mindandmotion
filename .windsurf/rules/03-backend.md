# 03 — Backend (Node.js + Express + MySQL)

> Контекст для задач в ветке `backend`.
> Читать вместе с `00-project.md` и `AGENTS.md`.
> Последнее обновление: 27.04.2026

---

## Стек

- **Runtime:** Node.js
- **Framework:** Express
- **БД:** MySQL (mysql2)
- **Auth:** JWT (jsonwebtoken)
- **Хостинг:** VPS Beget, `/var/www/backend/`
- **Base URL:** `https://mindandmotion.ru/api`
- **Ветка:** `backend`

---

## Структура

```
/var/www/backend/
├── routes/
│   ├── auth.js
│   ├── tasks.js
│   ├── habits.js
│   ├── folders.js
│   ├── birthdays.js
│   └── profile.js
├── middleware/
│   ├── auth.js      — проверка JWT
│   └── validate.js  — валидация входных данных
├── db/
│   └── index.js     — pool MySQL
└── server.js        — точка входа
```

---

## Правила работы с backend

1. **Не нарушать контракт API** — клиенты (web + mobile) зависят от структуры ответов
2. **Миграции БД** — любое изменение схемы документировать в `.agent/wiki/domain.md`
3. **JWT middleware** — применять на всех защищённых роутах
4. **snake_case** — MySQL отдаёт snake_case, не переименовывать поля без синхронизации с клиентами
5. **Ошибки** — возвращать правильные HTTP-коды (401, 422, 500)
6. **Не деплоить** автоматически — деплой только вручную через SSH владельцем

---

## Добавление нового эндпоинта — чеклист

- [ ] Создать/обновить route в `routes/`
- [ ] Добавить JWT middleware
- [ ] Добавить валидацию входных данных
- [ ] Обновить `AGENTS.md` раздел «Все эндпоинты»
- [ ] Обновить `.agent/wiki/domain.md` если изменилась схема
- [ ] Сообщить владельцу о необходимости деплоя

---

## snake_case ↔ camelCase

MySQL отдаёт snake_case. Клиенты (web + mobile) используют camelCase с защитными цепочками:

```js
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.isrecurring  ?? 0
task.doneDate    ?? task.done_date    ?? null
```

**Не менять имена полей в БД** — это сломает оба клиента.

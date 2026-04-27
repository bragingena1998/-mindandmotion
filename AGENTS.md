# Mind & Motion — Общий контракт для AI-агентов

> **Читай этот файл первым.** Детали — в `.windsurf/rules/` и `.agent/`.
> Последнее обновление: 27.04.2026

---

## Суть проекта

**Mind & Motion** — приложение-органайзер для личной продуктивности.
Функции: задачи с подзадачами, привычки с трекером, календарь, фокус-сессии, дни рождения, профиль.

**Аудитория:** Один владелец-разработчик + AI-агент как co-pilot.

**Платформы:**
- 📱 Android-приложение (React Native + Expo) — **готово, в продакшне**
- 🌐 Веб + PWA (React + Vite) — **в активной разработке, ветка `web-review`**
- 🖥️ Backend (Node.js + Express + MySQL) — **готов, на VPS Beget**

---

## Стек

| Платформа | Технологии | Ветка | Расположение |
|-----------|------------|-------|--------------|
| **Web+PWA** | React 18 + Vite + React Router | `web-review` | `/apps/web/` (уточнить у владельца) |
| **Mobile** | React Native + Expo (bare workflow) | `mobile-dev3.0` | корень репо |
| **Backend** | Node.js + Express + MySQL (mysql2) | `backend` | `/var/www/backend/` на VPS |

---

## API — Base URL и авторизация

```
Base URL: https://mindandmotion.ru/api
Auth:     Bearer <JWT token>

Web:    токен в localStorage ключ 'mm_token'
Mobile: токен в SecureStore через storage.js
```

---

## Все эндпоинты

```
# Авторизация
POST /auth/login               { email, password } → { token, user }
POST /auth/register            { email, password, name } → { token, user }
POST /auth/send-verification-code  { email }
POST /auth/verify-code         { email, code, ... }
POST /auth/forgot-password     { email }
POST /auth/reset-password      { email, code, newPassword }

# Задачи
GET    /api/tasks              ?month=&year= или ?folder_id=
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
PUT    /api/tasks/:id/stop-recurring
POST   /api/tasks/:id/focus
GET    /api/tasks/stats

# Подзадачи
GET    /api/tasks/:id/subtasks
POST   /api/tasks/:id/subtasks
PUT    /api/tasks/:taskId/subtasks/:subtaskId
DELETE /api/tasks/:taskId/subtasks/:subtaskId

# Папки
GET    /api/folders
POST   /api/folders
PUT    /api/folders/:id
DELETE /api/folders/:id
PUT    /api/folders/reorder

# Привычки
GET    /api/habits             ?year=&month=
POST   /api/habits
PUT    /api/habits/:id
DELETE /api/habits/:id
GET    /api/habits/records/:year/:month
POST   /api/habits/records
DELETE /api/habits/records/:habitId/:year/:month/:day
PUT    /api/habits/reorder

# Дни рождения и события
GET    /api/birthdays
POST   /api/birthdays
PUT    /api/birthdays/:id
DELETE /api/birthdays/:id

# Профиль
GET    /api/user/profile
PUT    /api/profile
PUT    /api/profile/password
```

---

## Сущности (типы данных)

```typescript
User:    { id, email, name, created_at }

Task:    { id, user_id, title, date, deadline, time, priority(0-3),
           done, done_date, comment,
           isrecurring, recurrencetype, recurrencevalue, isgenerated, templateid,
           folderid, focussessions, subtasks_count }

Subtask: { id, task_id, title, completed, created_at }

Folder:  { id, user_id, name, emoji, order_index }

Habit:   { id, user_id, name, unit, plan, target_type,
           start_date, end_date, days_of_week(JSON), order_index }

HabitRecord: { id, habit_id, user_id, year, month, day, value(float) }

Birthday: { id, user_id, name, day, month, year, type, notify_before }
```

### snake_case ↔ camelCase маппинг

MySQL отдаёт snake_case, JS использует camelCase. Защитные цепочки обязательны:

```js
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.isrecurring  ?? 0
task.doneDate    ?? task.done_date    ?? null
task.doneDate    ?? task.done_date    ?? null
```

---

## Коды ошибок API

| Код | Значение | Действие |
|-----|----------|----------|
| `401` | Токен истёк / невалиден | Разлогинить, редирект на login |
| `422` | Ошибка валидации | Показать inline-ошибку |
| `500` | Серверная ошибка | Показать toast с сообщением |

---

## Законы (нарушение = поломка проекта)

### Git
1. **Пуш web-изменений только в `web-review`**
2. **Пуш mobile-изменений только в `mobile-dev3.0`**
3. **Пуш backend-изменений только в `backend`**
4. **Читать SHA файла перед обновлением** — иначе конфликт
5. **Не создавать `.save`, `.bak`, `*_copy` и другие мусорные файлы**
6. **Батч-пуш**: не делать несколько коммитов там, где можно один (`push_files`)

### Код (общие для всех платформ)
7. **Не угадывать структуру файла** — всегда читать перед редактированием
8. **Не затирать существующие функции** — только добавлять/изменять нужное
9. **API-запросы** — всегда проверять токен, обрабатывать 401
10. **Оптимистичный UI**: мутировать state сразу, откатывать при ошибке API

### Документация
11. **После завершения задачи** — обновить `feature-parity.md` (статусы ✅/🔄/❌)
12. **Если добавлен новый API-эндпоинт** — обновить `AGENTS.md` и `.agent/wiki/api.md`
13. **Если изменена схема БД** — обновить `domain.md` + записать что добавлено

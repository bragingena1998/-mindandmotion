# Mind&Motion — Общий контракт

> Читай этот файл первым. Детали — в папках mobile/, web/, backend/.

## Стек
- **Mobile:** React Native + Expo (bare workflow), ветка `mobile-dev3.0`
- **Web:** Vanilla HTML/CSS/JS, ветка `web-dev`, папка `E:\Web\habits-app`
- **Backend:** Node.js + Express + MySQL, VPS Beget `root@85.198.96.149`, `/var/www/backend/`
- **Deploy:** PM2 на VPS, git push → post-receive hook

## API
- **Base URL:** `https://mindandmotion.ru/api`
- **Auth:** JWT в заголовке `Authorization: Bearer <token>`
- **Token:** мобилка хранит в SecureStore, веб — в `localStorage` (ключ `mm_token`)

## Авторизация
```
POST /auth/login          { email, password } → { token, user }
POST /auth/register       { email, password, name } → { token, user }
POST /auth/forgot-password { email }
```

## Основные эндпоинты
```
# Задачи
GET    /tasks              ?month=&year=
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id
PUT    /tasks/:id/stop-recurring
POST   /tasks/:id/focus
GET    /tasks/stats

# Подзадачи
GET    /tasks/:id/subtasks
POST   /tasks/:id/subtasks
PUT    /subtasks/:id/toggle
DELETE /subtasks/:id

# Папки
GET    /folders
POST   /folders
PUT    /folders/:id
DELETE /folders/:id
PUT    /folders/reorder

# Привычки
GET    /habits             ?year=&month=
POST   /habits
PUT    /habits/:id
DELETE /habits/:id
GET    /habits/records/:year/:month
POST   /habits/records
DELETE /habits/records/:habitId/:year/:month/:day
PUT    /habits/reorder

# Дни рождения / события
GET    /birthdays
POST   /birthdays
PUT    /birthdays/:id
DELETE /birthdays/:id

# Профиль
GET    /user/profile
PUT    /profile
PUT    /profile/password
```

## Сущности (типы)
```js
User:    { id, email, name, created_at }
Task:    { id, user_id, title, date, deadline, time, priority, done, done_date,
           comment, isrecurring, recurrencetype, recurrencevalue, isgenerated,
           templateid, folderid, focussessions, subtasks_count }
Subtask: { id, task_id, title, completed, created_at }
Folder:  { id, user_id, name, emoji, order_index }
Habit:   { id, user_id, name, unit, plan, target_type, start_date, end_date,
           days_of_week, order_index }
HabitRecord: { id, habit_id, user_id, year, month, day, value }
Birthday: { id, user_id, name, day, month, year, type, notify_before }
```

## Коды ошибок
- `401` → токен истёк, разлогинить
- `422` → ошибка валидации
- `500` → серверная ошибка

## snake_case ↔ camelCase
MySQL отдаёт snake_case, JS использует camelCase. Защитные цепочки:
```js
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.isrecurring  ?? 0
task.doneDate    ?? task.done_date    ?? null
```

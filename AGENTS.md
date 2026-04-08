# Mind&Motion — Общий контракт

> Читай этот файл первым. Детали — в папках mobile/, web/, backend/.

## Стек
- **Mobile:** React Native + Expo (bare workflow), ветка `mobile-dev3.0`
- **Web:** Vanilla HTML/CSS/JS, ветка `web-dev`, папка `E:\Web\habits-app`
- **Backend:** Node.js + Express + MySQL, VPS Beget `root@85.198.96.149`, `/var/www/backend/`
- **Deploy:** PM2 на VPS, git push → post-receive hook

## API
- **Base URL:** `http://85.198.96.149:5000` (прямой IP, не домен)
- **Auth:** JWT в заголовке `Authorization: Bearer <token>`
- **Token:** мобилка хранит в SecureStore, веб — в `localStorage` (ключ `app-auth-token`)

## Авторизация
```
POST /auth/login          { email, password } → { token, user }
POST /auth/register       { email, password, name } → { token, user }
POST /auth/forgot-password { email }
```

## Основные эндпоинты
```
# Задачи
GET    /api/tasks              ?folder_id=
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

# Привычки
GET    /api/habits             ?year=&month=
POST   /api/habits
PUT    /api/habits/:id
DELETE /api/habits/:id
GET    /api/habits/records/:year/:month
POST   /api/habits/records
DELETE /api/habits/records/:habitId/:year/:month/:day
PUT    /api/habits/reorder

# Дни рождения / события
GET    /api/birthdays
POST   /api/birthdays
PUT    /api/birthdays/:id
DELETE /api/birthdays/:id

# Профиль
GET    /api/user/profile
PUT    /api/profile
PUT    /api/profile/password
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

## Мобайл-фиксы (обязательны для всех страниц)
```html
<!-- В <head> каждой HTML-страницы -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
```css
/* common.css — контейнер на мобайле */
@media (max-width: 768px) {
  .app-shell { max-width: 100%; padding: 0; }
  .app-root  { padding: 8px 8px 72px; }
  body, input, button, select, textarea { font-size: 16px; } /* минимум 16px */
}
```

---

# РОАДМАП СИНХРОНИЗАЦИИ САЙТА С ПРИЛОЖЕНИЕМ

## ✅ СДЕЛАНО

### Инфраструктура
- [x] Общий бэкенд (server.js) для мобайла и сайта
- [x] JWT авторизация (логин, регистрация, верификация email, смена пароля)
- [x] Мобайл отправлен на модерацию в РуСтор (ветка mobile-dev3.0)
- [x] Мобильная навигация (bottom bar для телефонов)
- [x] Базовая адаптивность сайта (breakpoints mobile/tablet/desktop)

### tasks-api.js — API слой
- [x] fetchTasks(folderId) — загрузка с фильтром по папке
- [x] createTask / updateTask / deleteTask
- [x] fetchFolders / createFolder / updateFolder / deleteFolder
- [x] fetchSubtasks / createSubtask / toggleSubtask / deleteSubtask
- [x] stopRecurringTask — остановить повторение
- [x] addFocusSession — добавить фокус-сессию через API
- [x] fetchTaskStats — статистика задач
- [x] Адаптеры adaptTaskFromAPI / adaptTaskForAPI с защитными цепочками snake_case

### Задачи (Zadachi.html)
- [x] Таблица задач с приоритетом, датой, дедлайном, комментарием
- [x] Форма добавления задачи
- [x] Поморорро-таймер (фокус-сессии)
- [x] Повторяющиеся задачи (isRecurring, recurrenceType)
- [x] Статистика (сегодня/неделя/месяц/год)
- [x] Удаление с UNDO-тостом (20 сек)

---

## 🔄 В ПРОЦЕССЕ / СЛЕДУЮЩИЙ ЭТАП

### Этап 1 — Задачи: подключить UI к новому API (ТЕКУЩИЙ)
- [ ] Sidebar папок: загрузка из API, добавление, переименование, удаление
- [ ] Фильтрация задач по папке через fetchTasks(folderId)
- [ ] Перенести saveTasks() на updateTask() из tasks-api.js (убрать /api/tasks/sync)
- [ ] Подзадачи в строке задачи: раскрывающийся список, toggle, добавить/удалить
- [ ] Кнопка "Стоп" на повторяющейся задаче → stopRecurringTask(id)
- [ ] Поморорро финиш → addFocusSession(id) вместо прямого fetch

### Этап 2 — Мобайл-фиксы (параллельно)
- [ ] `<meta viewport>` добавить в ВСЕ HTML-страницы (Zadachi, Privychki, Kalendar, etc.)
- [ ] `.app-shell` → `max-width: 100%` на мобайле (убрать 1200px)
- [ ] Минимальный шрифт 16px на мобайле для всех полей ввода (iOS не зумит)
- [ ] Таблица задач → карточки на мобайле (< 768px)

### Этап 3 — Привычки (Privychki.html)
- [ ] Таблица-сетка: матрица дни × привычки (как в мобайле HabitTable)
- [ ] Дни недели / периодичность (days_of_week, target_type)
- [ ] Drag&drop переупорядочивание через PUT /api/habits/reorder
- [ ] Числовой ввод значения (не просто toggle) для привычек с unit/plan

### Этап 4 — Календарь (Kalendar.html)
- [ ] DayPanel — клик по дню → панель с задачами и привычками этого дня
- [ ] Индикаторы на днях (точки если есть задачи/привычки)
- [ ] Дни рождения и личные события: полный CRUD через /api/birthdays
- [ ] Переключение неделя/месяц

### Этап 5 — Dashboard (новая страница)
- [ ] Создать Dashboard.html
- [ ] KPI-карточки: выполненные задачи, streak привычек, фокус-часы
- [ ] График активности по дням (из fetchTaskStats)
- [ ] Виджет ближайших задач и привычек

### Этап 6 — Профиль и настройки
- [ ] Страница профиля: имя, email, смена пароля
- [ ] Переключатель темы (темная/светлая) синхронизирован с mobile ThemeContext
- [ ] Настройки уведомлений (если добавить Push API)

---

## Файловая структура (web-dev)
```
E:\Web\habits-app\
├── index.html          — главная
├── Zadachi.html        — задачи
├── Privychki.html      — привычки
├── Kalendar.html       — календарь
├── tasks-api.js        — API-слой задач (этот файл)
├── common.css          — общие стили + темы
├── tasks.css           — стили страницы задач
├── header.css          — стили шапки
├── header-loader.js    — загрузчик шапки
├── auth.js             — авторизация
└── AGENTS.md           — этот файл
```

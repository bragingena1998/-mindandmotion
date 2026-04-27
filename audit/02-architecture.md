# Архитектурный аудит Mind & Motion

**Дата:** 27 апреля 2026  
**Цель:** Анализ связей между web, mobile и backend; потоки данных; сравнение компонентов; выявление несоответствий

---

## 1. Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              КЛИЕНТЫ                                     │
├──────────────────────────────┬──────────────────────────────────────────┤
│         WEB (React)          │      MOBILE (React Native + Expo)        │
│     E:\apps\web\src          │   E:\mindandmotion-mobile\src           │
├──────────────────────────────┼──────────────────────────────────────────┤
│ • localStorage (токен)       │ • AsyncStorage (токен)                   │
│ • Axios + Interceptors       │ • Axios + Interceptors                   │
│ • Bearer Token             │ • Bearer Token                           │
│ • BASE_URL: env/vite       │ • BASE_URL: hardcoded IP                   │
│ • Port: 3001               │ • Port: 5000 (backend)                     │
└──────────────┬─────────────┴────────────────────┬─────────────────────┘
               │                                    │
               │    HTTP/JSON API (REST)            │
               │    Bearer Authorization            │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js + Express)                      │
│                         E:\backend                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ • JWT Authentication (middleware/auth.js)                               │
│ • MySQL2 Pool (db.js, UTC timezone)                                    │
│ • Routes: auth, tasks, habits, folders, subtasks, etc.                │
│ • CORS: localhost:3001 + mindandmotion.ru                              │
│ • Port: 5000 (production: 85.198.96.149:5000)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Аутентификация: поток данных

### 2.1. Web аутентификация

```
Login.tsx
    │
    ▼
POST /api/login (fetch, NOT axios) ──► backend/routes/auth.js
    │                                      │
    ▼                                      ▼
localStorage.setItem(              jwt.sign({userId}, JWT_SECRET,
  'app-auth-token',               { expiresIn: '30d' })
  data.token)
    │
    ▼
AuthContext.login(token, user)
    │
    ▼
Navigate to /tasks
    │
    ▼
┌─────────────────────────────────────┐
│ api/client.ts                      │
│ axios interceptors.request:        │
│   Authorization: Bearer ${token}    │
└─────────────────────────────────────┘
```

**Ключевые файлы:**
- `apps/web/src/pages/Login.tsx` — форма входа, использует `fetch` (не axios!)
- `apps/web/src/context/AuthContext.tsx` — хранит user + isAuthenticated
- `apps/web/src/api/client.ts` — axios с interceptors для добавления токена

**Хранилище:** `localStorage.getItem('app-auth-token')` или `localStorage.getItem('mm_token')`

**Проблема:** Login.tsx использует `fetch`, а остальное приложение — axios через apiClient. Несоответствие.

### 2.2. Mobile аутентификация

```
LoginScreen.js
    │
    ▼
POST /api/login ──────────────────────► backend
    │
    ▼
storage.saveToken(token, userId)    [AsyncStorage]
    │
    ▼
Navigation to TasksScreen
    │
    ▼
┌─────────────────────────────────────┐
│ services/api.js                      │
│ axios interceptors.request:         │
│   const token = await getToken()    │
│   Authorization: Bearer ${token}   │
└─────────────────────────────────────┘
```

**Ключевые файлы:**
- `mindandmotion-mobile/src/screens/LoginScreen.js`
- `mindandmotion-mobile/src/services/storage.js` — AsyncStorage wrapper
- `mindandmotion-mobile/src/services/api.js` — axios с interceptors

**Хранилище:** `AsyncStorage.setItem('app-auth-token', token)`

### 2.3. Backend JWT Middleware

```javascript
// backend/middleware/auth.js
const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN
jwt.verify(token, JWT_SECRET || 'your-secret-key-12345', (err, user) => {
  req.userId = user.userId;  // Добавляем userId в request
  next();
});
```

**Ответы:**
- 401: `Access token required`
- 403: `Invalid or expired token`

### 2.4. Сравнение хранилищ

| Параметр | Web | Mobile |
|----------|-----|--------|
| **Технология** | localStorage | AsyncStorage |
| **Ключ токена** | `app-auth-token` | `app-auth-token` |
| **Безопасность** | ❌ Уязвим для XSS | ⚠️ Лучше, но не SecureStore |
| **Backup ключ** | `mm_token` | — |
| **Интерсептор** | Синхронный | Асинхронный (`await getToken()`) |

⚠️ **Несоответствие:** Mobile использует AsyncStorage, но в package.json есть `expo-secure-store` — почему не используется SecureStore?

---

## 3. API запросы: Web vs Mobile

### 3.1. Base URL конфигурация

**Web:**
```typescript
// apps/web/src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// .env (development)
VITE_API_URL=https://mindandmotion.ru/api

// vite.config.ts (proxy для dev)
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

**Mobile:**
```javascript
// mindandmotion-mobile/src/services/api.js
const BASE_URL = 'http://85.198.96.149:5000/api';  // ⚠️ Хардкод IP!
```

⚠️ **Критическое несоответствие:**
- Web использует домен `mindandmotion.ru/api`
- Mobile использует IP `85.198.96.149:5000/api`
- Если IP изменится — mobile сломается
- Нет единого источника truth для API URL

### 3.2. Сравнение API клиентов

| Фича | Web (apps/web/src/api/client.ts) | Mobile (services/api.js) |
|------|----------------------------------|--------------------------|
| **Таймаут** | ❌ Не задан | 10000ms |
| **Retry** | ❌ Нет | ❌ Нет |
| **Обработка 401** | Редирект на /login | Редирект на / (только web) |
| **Удаление токена** | Да | Да |
| **Ключи localStorage** | app-auth-token, mm_token | app-auth-token |

### 3.3. Дублирование API-логики

**Web:** 3 отдельных файла с типами и адаптерами:
- `api/client.ts` — базовый axios
- `api/tasks.ts` — Task API + адаптеры + типы
- `api/habits.ts` — Habit API + адаптеры + типы

**Mobile:** Всё в одном файле:
- `services/api.js` — только базовый axios + tasksAPI
- Остальные API вызовы inline в screen-компонентах
- Нет централизованных адаптеров (snake_case ↔ camelCase обрабатывается вручную)

⚠️ **Архитектурный долг:** Mobile нет чёткого разделения API слоя — вызовы разбросаны по screen-компонентам.

---

## 4. Потоки данных: Habits

### 4.1. Загрузка привычек

```
Habits.tsx (page)
    │
    ▼
fetchHabits(year, month) ──────────────► GET /api/habits?year=2026&month=4
    │                                      │
    ▼                                      ▼
backend/routes/habits.js                 Filter: start_year/month, 
    │                                      archived check
    ▼                                      │
MySQL (habits table) ◄─────────────────────┘
    │
    ▼
Response: snake_case fields
    │
    ▼
adaptHabitFromAPI() ─────► camelCase + defensive parsing
    │
    ▼
setHabits(habitsData) ─────► React State
```

### 4.2. Создание записи (ячейка таблицы)

```
HabitTable.tsx (cell click)
    │
    ▼
handleCellChange(habitId, day, value)
    │
    ▼
optimisticUpdateRecords() ──► setRecords() (локально)
    │
    ▼
createHabitRecord(habitId, year, month, day, value)
    │
    ▼
POST /api/habits/records ─────► backend
    │                              │
    ▼                              ▼
INSERT INTO habit_records       MySQL
```

### 4.3. Reorder (drag-and-drop)

```
HabitTable.tsx (drag end)
    │
    ▼
onReorderHabits(orderedIds)
    │
    ▼
reorderHabitsByIds(orderedIds)
    │
    ▼
PUT /api/habits/reorder ──────► backend
    │                              │
    ▼                              ▼
UPDATE habits SET order_index  MySQL (цикл по habits)
```

### 4.4. Архивация

```
Habits.tsx
    │
    ▼
archiveHabit(id, year, month)
    │
    ▼
PUT /api/habits/${id}/archive
    │
    ▼
INSERT INTO habit_monthly_configs
  (habit_id, year, month, is_archived=1)
```

---

## 5. Потоки данных: Tasks

### 5.1. Загрузка задач

```
Tasks.tsx
    │
    ▼
fetchTasks(folderId?, month?) ────► GET /api/tasks
    │                                 │
    ▼                                 ▼
adaptTaskFromAPI()              backend/routes/tasks.js
    │                                 │
    ▼                                 ▼
camelCase fields                MySQL (tasks + subtasks_count)
    │
    ▼
groupTasksByDate() ─────► [overdue, today, tomorrow, future, done]
    │
    ▼
setGroupedTasks() ─────► React State
```

### 5.2. Создание задачи

```
TaskModal.tsx
    │
    ▼
onSubmit(data)
    │
    ▼
adaptTaskForAPI(data) ──► snake_case + UTC time conversion
    │
    ▼
POST /api/tasks ────────► backend
    │                      │
    ▼                      ▼
Response: new task      INSERT INTO tasks
    │
    ▼
loadTasks() ──────────► Перезагрузка списка
```

### 5.3. Подзадачи

```
TaskCard.tsx (expand)
    │
    ▼
fetchSubtasks(taskId) ──► GET /api/tasks/${taskId}/subtasks
    │
    ▼
adaptSubtaskFromAPI() ──► camelCase (done: Boolean(raw.completed))
```

⚠️ **Несоответствие:** Бэкенд использует `completed`, фронтенд `done` — адаптер делает преобразование.

### 5.4. Рекуррентные задачи

```
TaskModal.tsx
    │
    ▼
recurrence !== 'none' ──► adaptTaskForAPI()
    │                         │
    ▼                         ▼
isRecurring=true         backend создаёт
recurrenceType='daily'   следующую задачу
    │                      автоматически
    ▼
POST /api/tasks
```

### 5.5. Фокус-сессии

```
TaskCard.tsx (focus button)
    │
    ▼
BannerContext.showBanner({
  type: 'focus-session',
  taskName,
  plannedMinutes,
  onSave
})
    │
    ▼
GlobalTimerBanner.tsx (отображение)
    │
    ▼
POST /api/tasks/:id/focus ──► focus_sessions++
```

---

## 6. Dashboard / Statistics (данные)

### 6.1. Что реализовано в Web

```typescript
// Tasks.tsx: calculateStats()
{
  today: { completed, total },  // По date для undone, doneDate для done
  week: completedCount,         // Выполненные с начала недели
  month: completedCount,        // Выполненные в текущем месяце
  total: doneCount,             // Всего выполненных из загруженных
  all: totalCount               // Всего задач загруженных
}
```

**Источник:** Локальный расчёт из загруженных задач (без отдельного API).

### 6.2. Что есть в Backend

```javascript
// backend/routes/tasks.js: GET /api/tasks/stats
{
  completed_today,
  total_today_plan,      // Запланировано на сегодня
  completed_week,
  completed_month,
  completed_total
}
```

⚠️ **Несоответствие:** Web не использует `/api/tasks/stats` — делает расчёт локально. Разные формулы могут дать разные результаты.

### 6.3. Что есть в Mobile (DashboardScreen.js)

- Статистика привычек (streak, проценты)
- Статистика задач (completed/pending)
- Прогресс-бары
- Графики активности
- Быстрые действия (добавить задачу/привычку)

⚠️ **Незавершённая миграция:** Dashboard в web — заглушка.

---

## 7. Сравнение: Mobile Screens vs Web Pages

### 7.1. Сопоставление компонентов

| Mobile Screen | Web Page | Статус | Примечание |
|---------------|----------|--------|------------|
| **DashboardScreen.js** | `/` (Dashboard) | ⚠️ Заглушка | Главная с аналитикой — не перенесена |
| **TasksScreen.js** | `/tasks` (Tasks.tsx) | ✅ Реализовано | Полный функционал |
| **HabitsScreen.js** | `/habits` (Habits.tsx) | ✅ Реализовано | Полный функционал |
| **CalendarScreen.js** | `/calendar` | ⚠️ Заглушка | Не перенесена |
| **ProfileScreen.js** | `/profile` | ⚠️ Заглушка | Профиль пользователя — не перенесён |
| **SecretChatScreen.js** | `/secret-chat` | ⚠️ Заглушка | API есть, UI нет |
| **LoginScreen.js** | `/login` (Login.tsx) | ✅ Реализовано | Простая версия |
| **RegisterScreen.js** | `/register` | ⚠️ Заглушка | API есть, UI нет |
| **ForgotPasswordScreen.js** | — | ❌ Нет | Забыли пароль — нет в web |
| **NotificationSettingsScreen.js** | — | ❌ Нет | Настройки уведомлений — нет в web |
| **SettingsScreen.js** | — | ❌ Нет | Общие настройки — нет в web |
| **AppLockScreen.js** | — | ❌ Нет | Блокировка приложения — нет в web |

### 7.2. Детальное сравнение TasksScreen (Mobile) vs Tasks.tsx (Web)

| Фича | Mobile | Web | Примечание |
|------|--------|-----|------------|
| Список задач | ✅ | ✅ | Есть в обоих |
| Группировка по датам | ✅ | ✅ | Есть в обоих |
| Подзадачи | ✅ | ✅ | Есть в обоих |
| Drag-and-drop | ✅ | ⚠️ Частично | Mobile: полный DnD, Web: только привычки |
| Фокус-сессии | ✅ | ✅ | GlobalTimerBanner в web |
| Папки | ✅ | ✅ | FolderChips в web |
| Рекуррентность | ✅ | ✅ | Есть в обоих |
| Фильтрация | ✅ | ✅ | По папкам и месяцам |
| Просроченные | ✅ | ✅ | Подсветка красным |
| Поиск | ✅ | ❌ | В web нет поиска |
| Сортировка | ✅ | ❌ | В web нет сортировки |
| Bulk actions | ✅ | ❌ | Массовые операции в web нет |

### 7.3. Детальное сравнение HabitsScreen (Mobile) vs Habits.tsx (Web)

| Фича | Mobile | Web | Примечание |
|------|--------|-----|------------|
| Таблица привычек | ✅ | ✅ | Есть в обоих |
| Ячейки дней | ✅ | ✅ | Tap для отметки |
| Таймер для часов | ✅ | ✅ | GlobalTimerBanner |
| Reorder (DnD) | ✅ | ✅ | Есть в обоих |
| Архивация | ✅ | ✅ | Есть в обоих |
| График трендов | ❌ | ✅ | Только в web |
| Days of week | ✅ | ✅ | С множественным парсингом |
| Target types | ✅ | ✅ | daily/monthly/period |
| Streak calculation | ✅ | ✅ | Одинаковая логика |
| Progress bars | ✅ | ✅ | Проценты и количество |

---

## 8. Архитектурные несоответствия и дублирование

### 8.1. Критические несоответствия

| № | Проблема | Влияние | Решение |
|---|----------|---------|---------|
| 1 | **Разные Base URL** | Mobile сломается при смене IP | Вынести в env/config |
| 2 | **Login.tsx использует fetch** | Нет interceptors, дублирование логики | Переписать на axios |
| 3 | **Web не использует /api/tasks/stats** | Разная статистика в web vs mobile | Перейти на API endpoint |
| 4 | **Нет tsconfig.json в web** | Неясная TypeScript конфигурация | Добавить tsconfig.json |
| 5 | **Mobile не использует SecureStore** | AsyncStorage менее безопасен | Перейти на SecureStore |

### 8.2. Дублирование логики

| Где | Что дублируется | Степень |
|-----|-----------------|---------|
| **Адаптеры snake_case ↔ camelCase** | Web: api/tasks.ts, api/habits.ts; Mobile: inline в компонентах | Высокая |
| **Валидация дат** | Web: в адаптерах; Mobile: в screen-компонентах | Средняя |
| **Форматирование дат** | Web: date-fns + utils; Mobile: moment-timezone | Средняя |
| **Расчёт статистики** | Web: локально; Backend: /api/tasks/stats; Mobile: локально | Высокая |
| **Сортировка/группировка** | Web и Mobile делают одинаковую логику по-разному | Средняя |

### 8.3. Незавершённые миграции

| Компонент | Приоритет | Сложность | Зависимости |
|-----------|-----------|-----------|-------------|
| Dashboard | Высокий | Средняя | Нужна статистика с backend |
| Calendar | Средний | Высокая | Календарная библиотека, синхронизация |
| Profile | Средний | Низкая | API уже есть (/api/user/profile) |
| Secret Chat | Низкий | Средняя | API есть, нужен UI |
| Register | Высокий | Низкая | API есть, нужна форма |
| Settings | Средний | Средняя | Нужны API endpoints |
| Notifications | Низкий | Высокая | Web Push API, Service Workers |

### 8.4. API Endpoints без UI в Web

| Endpoint | Назначение | Используется в Mobile | Web UI |
|----------|------------|----------------------|--------|
| `POST /api/register` | Регистрация | ✅ | ❌ Заглушка |
| `GET /api/user/profile` | Профиль | ✅ | ❌ Заглушка |
| `PUT /api/user/password` | Смена пароля | ✅ | ❌ Нет |
| `POST /api/tasks/:id/focus` | Фокус-сессии | ✅ | ✅ (GlobalTimerBanner) |
| `PUT /api/tasks/:id/stop-recurring` | Остановка рекуррентности | ✅ | ❌ Нет кнопки |
| `GET /api/tasks/stats` | Статистика | ❌ | ❌ Не используется |
| `GET /api/birthdays` | Дни рождения | ✅ | ❌ Нет страницы |
| `/api/secret-chat/*` | Секретный чат | ✅ | ❌ Заглушка |

---

## 9. Выводы для миграции Mobile → Web

### 9.1. Что уже успешно мигрировано

✅ **Core functionality:**
- Tasks (полный CRUD, подзадачи, папки, приоритеты)
- Habits (таблица, записи, таймеры, reorder, архивация)
- Authentication (login с JWT)
- API layer с адаптерами
- Global timer system (BannerContext + GlobalTimerBanner)

✅ **Архитектурные паттерны:**
- Контексты для глобального состояния (Auth, Banner)
- Адаптеры для конвертации snake_case ↔ camelCase
- Optimistic updates для UX
- Responsive design (mobile-first)

### 9.2. Что нужно доделать (приоритеты)

🔴 **Высокий приоритет:**

1. **Dashboard Screen**
   - Источник: `mindandmotion-mobile/src/screens/DashboardScreen.js` (42KB)
   - Нужно: Графики, статистика, быстрые действия
   - Зависимости: `/api/tasks/stats`, `/api/habits/stats`

2. **Register Screen**
   - Источник: `mindandmotion-mobile/src/screens/RegisterScreen.js` (11KB)
   - Нужно: Форма регистрации
   - API: `POST /api/register` уже работает

3. **Унификация Base URL**
   - Создать `packages/shared/src/config/api.ts` с единым URL
   - Mobile: читать из Expo Constants
   - Web: читать из env

🟡 **Средний приоритет:**

4. **Calendar Screen**
   - Источник: `mindandmotion-mobile/src/screens/CalendarScreen.js` (50KB)
   - Сложность: Высокая (большой файл)
   - Библиотека: Возможно `@fullcalendar/react` или аналог

5. **Profile Screen**
   - Источник: `mindandmotion-mobile/src/screens/ProfileScreen.js` (10KB)
   - API: `/api/user/profile`, `/api/user/password`
   - Сложность: Низкая

6. **Settings Screen**
   - Источник: `mindandmotion-mobile/src/screens/SettingsScreen.js` (12KB)
   - Нужны новые API endpoints для web-настроек

🟢 **Низкий приоритет:**

7. **Secret Chat Screen**
   - API есть, нужен UI
   - Особенность: WebSocket или polling

8. **Notification Settings**
   - Web Push API, Service Workers
   - Не поддерживается iOS Safari

9. **App Lock**
   - Web не поддерживает биометрию нативно
   - Можно сделать через PIN

### 9.3. Архитектурные рекомендации

1. **Shared Package** (из docs/Миграция.md):
   ```
   packages/shared/
   ├── src/
   │   ├── types/           # Общие TypeScript типы
   │   ├── api-client/      # Унифицированный API
   │   ├── business-logic/  # Адаптеры, валидаторы
   │   └── utils/           # Date, pluralize
   ```

2. **Использовать backend /api/tasks/stats** вместо локального расчёта

3. **Добавить tsconfig.json** в apps/web для строгой типизации

4. **SecureStore для mobile** — повысить безопасность

5. **Поиск и сортировка** в Tasks — довести до parity с mobile

### 9.4. Оценка трудозатрат

| Компонент | Оценка времени | Риски |
|-----------|-----------------|-------|
| Dashboard | 2-3 дня | Статистика backend vs local |
| Register | 0.5 дня | Низкие |
| Profile | 1 день | Низкие |
| Calendar | 3-5 дней | Большой объём |
| Settings | 2 дня | Новые API endpoints |
| Secret Chat | 2-3 дня | WebSocket |

**Итого до parity с mobile:** ~10-15 дней работы

---

*Аудит завершён. Никаких изменений в код не внесено.*

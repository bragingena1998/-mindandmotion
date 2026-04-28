# Аудит №3 — Детальный разбор ключевых файлов

**Дата:** 27 апреля 2026  
**Цель:** Полный разбор Dashboard, Login, AuthContext, API client и backend stats endpoint

---

## 1. web/src/pages/Dashboard.tsx ⚠️ файл не существует — inline-заглушка в App.tsx

### Статус файла
❌ **Файл не существует**. Dashboard в web-приложении — это **заглушка** в `App.tsx`.

### Реализация в App.tsx (строка 14)
```typescript
const Dashboard = () => <div className="page-placeholder"><h1>Dashboard (coming soon)</h1></div>
```

### Использование в роутинге
```typescript
<Route path="/" element={<Dashboard />} />
```

### Компоненты, связанные с Dashboard
- **Нет импортов** — полностью inline-заглушка
- **Layout обёртка**: Dashboard рендерится внутри `<Layout />` (с боковой/нижней навигацией)
- **Protected route**: Требует аутентификации

### CSS класс
```css
.page-placeholder {
  /* Стиль заглушки из global.css */
}
```

---

## 2. mobile/src/screens/DashboardScreen.js

### Общая информация
- **Размер:** 1006 строк, ~42KB
- **Тип:** Полноценный экран с комплексной логикой
- **Архитектура:** Local-first с optimistic updates

### Импорты и зависимости

#### React Native Core
```javascript
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Animated, Alert
} from 'react-native';
```

#### Gesture Handling
```javascript
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
```

#### AsyncStorage
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

#### API
```javascript
import api from '../services/api';
```

#### Custom Hooks
```javascript
import { useDataSync } from '../contexts/DataSyncContext';
import { useLocalFirst } from '../hooks/useLocalFirst';
```

#### Utils
```javascript
import {
  isHabitDayActive, getHabitRecordValue, getNextValueAfterTap, isHabitDoneForValue
} from '../utils/habitDay';
import { countTodayPlanTotal, countCompletedToday } from '../utils/taskDayStats';
import { utcTimeToLocal, localTimeToUtc } from '../utils/timezone';
```

#### Components
```javascript
import Background from '../components/Background';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
```

### Все секции Dashboard (в порядке отображения)

#### 1. Header (строки 621-641)
- Приветствие (`getGreeting()` — зависит от времени суток)
- Дата в формате "понедельник, 27 апреля"
- Кнопка сброса кеша (🧹)
- Аватар с инициалами пользователя

#### 2. Focus Session Banner (строки 643-664)
**Условие:** `hasFocusSession() && focusSeconds > 0`
- Отображает активную фокус-сессию
- Таймер обратного отсчёта
- Кнопка "Стоп"
- Цветовая схема: `colors.accent1` (зелёный)

#### 3. Habit Timer Banner (строки 666-735)
**Условие:** `habitTimer && habitTimer.isRunning`
- Таймер для привычек с unit='Часы'
- Чтение из AsyncStorage (`@mm_habit_timer`)
- Две кнопки: "Стоп" и "Сохранить"
- При сохранении: конвертация секунд → часы, POST /habits/records

#### 4. Progress Card (строки 737-745)
- Прогресс задач на сегодня: `doneToday / totalToday`
- Визуальный прогресс-бар
- Процент выполнения дня
- Использует `countTodayPlanTotal()` и `countCompletedToday()`

#### 5. Habits Section (строки 747-786)
- Заголовок "ПРИВЫЧКИ"
- Горизонтальный ScrollView с кругами привычек
- Круги привычек: инициалы, цвет по статусу (done/not done)
- Каждая привычка: кликабельна, вызывает `toggleHabit()`
- Сообщение "🔥 Все активные на сегодня!" при 100% выполнении
- Пустое состояние: "Нет привычек на сегодня"

#### 6. Events & Birthdays Section (строки 788-810)
- Заголовок "СОБЫТИЯ И ДР"
- Дни рождения на ближайшие 7 дней
- Иконки: 🎂 (birthday), 📌 (important), 📅 (default)
- Текст: "сегодня", "завтра", "через N дн"
- Пустое состояние: "Нет событий на 7 дней"

#### 7. Tasks Section (строки 814-875)
- Заголовок "ЗАДАЧИ"
- Подсекции:
  - 🔴 ПРОСРОЧЕННЫЕ (красные)
  - 🟢 СЕГОДНЯ (зелёные)
  - ⚪ ЗАВТРА (серые)
- Карточки задач с swipe- gesture (PanGestureHandler)
- Swipe → toggle выполнения
- Поддержка подзадач (открываются по нажатию)
- Пустое состояние: "Нет задач на сегодня, просроченных и на завтра 🎉"
- Ссылка "Все задачи →" для перехода на TasksScreen

#### 8. Subtasks Modal (строки 885-961)
- Модальное окно с подзадачами
- Toggle подзадач с optimistic update
- Загрузка через `/tasks/${taskId}/subtasks`

### Все API-вызовы DashboardScreen

| Endpoint | Метод | Назначение | Строка |
|----------|-------|------------|--------|
| `/user/profile` | GET | Загрузка профиля | 234 |
| `/tasks` | GET | Все задачи пользователя | 235 |
| `/habits?year=${year}&month=${month}` | GET | Привычки за месяц | 236 |
| `/habits/records/${year}/${month}` | GET | Записи привычек | 237 |
| `/birthdays` | GET | Дни рождения | 238 |
| `/folders` | GET | Папки задач | 239 |
| `/tasks/${taskId}/subtasks` | GET | Подзадачи | 293 |
| `/subtasks/${subtaskId}/toggle` | PUT | Toggle подзадачи | 371 |
| `/tasks/${task.id}` | PUT | Обновление задачи | 429 |
| `/habits/records/${habitId}/${year}/${month}/${day}` | DELETE | Удаление записи | 492 |
| `/habits/records` | POST | Создание/обновление записи | 494 |
| `/habits/records` | GET | Получение записи (в таймере) | 704 |

### Особенности архитектуры

#### Local-First с useLocalFirst Hook
```javascript
const {
  data: dashboardData,
  loading: dashboardLoading,
  error: dashboardError,
  loadData: loadDashboard,
  onRefresh: refreshDashboard,
  optimisticUpdate: optimisticUpdateDashboard,
  rollbackUpdate: rollbackDashboard,
} = useLocalFirst({
  type: 'dashboard',
  fetchFunction: async () => { /* 6 параллельных запросов */ },
  dependencies: [tick],
});
```

#### Optimistic Updates
Все toggle-операции (tasks, habits, subtasks) используют optimistic update:
1. Мгновенное обновление UI
2. API-запрос в фоне
3. Откат при ошибке через `rollbackDashboard()`

#### DataSyncContext
```javascript
const { tick, bumpAll } = useDataSync();
// bumpAll() — инвалидирует кеш и триггерит перезагрузку
```

### Библиотеки для графиков
**В DashboardScreen.js графиков нет** — только прогресс-бар (CSS/RN View).

Однако в других экранах mobile используются:
- **react-native-chart-kit** или аналоги для графиков активности
- В текущем Dashboard — упрощённая визуализация через прогресс-бары

---

## 3. web/src/pages/Login.tsx

### Полный код запроса

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!email.trim() || !password) {
    setError('Пожалуйста, заполните все поля')
    return
  }

  setIsLoading(true)
  setError('')

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (response.ok && data.token) {
      localStorage.setItem('app-auth-token', data.token)
      localStorage.setItem('app-user-email', email)
      login(data.token, data.user)
      navigate('/tasks', { replace: true })
    } else {
      setError(data.message || 'Неверные учетные данные')
    }
  } catch (err) {
    setError('Ошибка сервера')
  } finally {
    setIsLoading(false)
  }
}
```

### Поля формы
| Поле | Тип | Валидация |
|------|-----|-----------|
| email | email | `!email.trim()` — проверка на пустоту |
| password | password | `!password` — проверка на пустоту |

### ⚠️ Архитектурная проблема
Login.tsx использует **`fetch`** вместо **`axios`** (apiClient):
- Нет автоматического добавления Bearer токена (логично, токена ещё нет)
- Нет единообразия с остальным приложением
- Ручная обработка Content-Type

### Что делает после успешного логина

1. **Сохранение токена:**
   ```typescript
   localStorage.setItem('app-auth-token', data.token)
   ```

2. **Сохранение email:**
   ```typescript
   localStorage.setItem('app-user-email', email)
   ```

3. **Обновление AuthContext:**
   ```typescript
   login(data.token, data.user)
   // login из AuthContext устанавливает user и isAuthenticated
   ```

4. **Редирект:**
   ```typescript
   navigate('/tasks', { replace: true })
   ```

### Обработка ошибок
- Пустые поля: "Пожалуйста, заполните все поля"
- Неверные данные: `data.message` или "Неверные учетные данные"
- Сетевая ошибка: "Ошибка сервера"

---

## 4. web/src/context/AuthContext.tsx

### Полная структура

```typescript
// Тип User
interface User {
  id: number
  email: string
  name: string
}

// Тип Context
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (token: string, userData: User) => void
  logout: () => void
}
```

### State
```typescript
const [user, setUser] = useState<User | null>(null)
const [isAuthenticated, setIsAuthenticated] = useState(false)
```

### Методы

#### login(token: string, userData: User)
```typescript
const login = (token: string, userData: User) => {
  localStorage.setItem('app-auth-token', token)
  setUser(userData)
  setIsAuthenticated(true)
}
```
- Сохраняет токен в localStorage
- Устанавливает user в state
- Устанавливает isAuthenticated = true

#### logout()
```typescript
const logout = () => {
  localStorage.removeItem('app-auth-token')
  setUser(null)
  setIsAuthenticated(false)
}
```
- Удаляет токен из localStorage
- Сбрасывает user и isAuthenticated

### Initial Check (useEffect)
```typescript
useEffect(() => {
  const token = localStorage.getItem('app-auth-token')
  if (token) {
    // TODO: Validate token and get user info
    setIsAuthenticated(true)
  }
}, [])
```

⚠️ **TODO не выполнен:** Токен не валидируется, user info не загружается при старте.

### Provider
```typescript
<AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
  {children}
</AuthContext.Provider>
```

### Hook useAuth()
```typescript
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Использование в приложении
```typescript
// main.tsx
<AuthProvider>
  <App />
</AuthProvider>
```

### Ограничения
- ❌ Нет refresh token
- ❌ Нет валидации токена при старте
- ❌ Нет авто-логаута по expiration
- ❌ Токен живёт 30 дней (backend JWT), но фронт не проверяет

---

## 5. web/src/api/client.ts

### Базовый URL
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

**Environment:**
- Production: `https://mindandmotion.ru/api` (из .env)
- Development: `http://localhost:5000/api` (fallback)

### Конфигурация Axios
```typescript
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

⚠️ **Нет настроек:**
- Таймаут не задан (default: infinite)
- Retry logic отсутствует
- Request/response transform не настроены

### Request Interceptor (добавление токена)
```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('app-auth-token') || localStorage.getItem('mm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Особенности:**
- Проверяет **два ключа**: `app-auth-token` и `mm_token` (legacy)
- Добавляет header `Authorization: Bearer ${token}`
- Синхронный (localStorage — синхронный)

### Response Interceptor (обработка 401)
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('app-auth-token');
      localStorage.removeItem('mm_token');
      localStorage.removeItem('app-user-email');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Поведение при 401:**
1. Удаляет все auth-данные из localStorage
2. Хард-редирект на `/login`
3. ⚠️ Нет возможности "поймать" ошибку в компоненте

### Сравнение с Mobile API Client

| Параметр | Web | Mobile |
|----------|-----|--------|
| **Базовый URL** | env var | hardcoded IP |
| **Хранилище** | localStorage | AsyncStorage |
| **Таймаут** | ❌ Нет | 10000ms |
| **Интерсептор** | Синхронный | Асинхронный (await getToken()) |
| **Backup ключ** | mm_token | — |
| **Обработка 401** | Редирект | — |

---

## 6. backend/routes/tasks.js — GET /api/tasks/stats

### Endpoint
```
GET /api/tasks/stats
Authorization: Bearer {token}
```

### Query Parameters
| Параметр | Тип | Описание |
|----------|-----|----------|
| startDate | string (YYYY-MM-DD) | Опционально, для недельной статистики |
| endDate | string (YYYY-MM-DD) | Опционально, для недельной статистики |

### SQL Query (без параметров)
```sql
SELECT
  COUNT(CASE WHEN done = 1 AND DATE(done_date) = CURDATE() THEN 1 END) as completed_today,
  COUNT(CASE WHEN (
    (CURDATE() >= DATE(`date`) AND CURDATE() <= COALESCE(DATE(deadline), DATE(`date`)))
    OR (done = 0 AND COALESCE(DATE(deadline), DATE(`date`)) < CURDATE())
  ) THEN 1 END) as total_today_plan,
  COUNT(CASE WHEN done = 1 AND YEARWEEK(done_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as completed_week,
  COUNT(CASE WHEN done = 1 AND YEAR(done_date) = YEAR(CURDATE()) AND MONTH(done_date) = MONTH(CURDATE()) THEN 1 END) as completed_month,
  COUNT(CASE WHEN done = 1 THEN 1 END) as completed_total
FROM tasks WHERE user_id = ?
```

### SQL Query (с параметрами startDate, endDate)
```sql
SELECT
  COUNT(CASE WHEN done = 1 AND DATE(done_date) BETWEEN ? AND ? THEN 1 END) as completedThisWeek
FROM tasks WHERE user_id = ?
```

### Логика расчёта

#### completed_today
- Задачи выполненные сегодня (`done = 1` AND `done_date = CURDATE()`)

#### total_today_plan
- Задачи где сегодня в диапазоне [date, deadline]
- **ИЛИ** просроченные незавершённые (`done = 0` AND deadline < CURDATE())
- ⚠️ Исключает выполненные просроченные (иначе раздувает счётчик)

#### completed_week
- Задачи выполненные на текущей неделе (ISO календарь, начало с понедельника)
- `YEARWEEK(done_date, 1) = YEARWEEK(CURDATE(), 1)`

#### completed_month
- Задачи выполненные в текущем месяце
- `YEAR(done_date) = YEAR(CURDATE()) AND MONTH(done_date) = MONTH(CURDATE())`

#### completed_total
- Все выполненные задачи пользователя
- `done = 1`

### Response Format
```json
{
  "completed_today": 5,
  "total_today_plan": 8,
  "completed_week": 23,
  "completed_month": 87,
  "completed_total": 342
}
```

### Использование

**В Web:** ❌ НЕ ИСПОЛЬЗУЕТСЯ
- Web делает локальный расчёт в `Tasks.tsx: calculateStats()`
- Получает все задачи и считает на фронтенде

**В Mobile:** ❌ НЕ ИСПОЛЬЗУЕТСЯ
- Mobile тоже делает локальный расчёт через `countTodayPlanTotal()` и `countCompletedToday()`

⚠️ **Несоответствие:** Endpoint существует, но ни один клиент его не использует. Все считают статистику локально, потенциально с разными формулами.

---

## 7. Готовность к Dashboard (выводы для миграции)

### Что нужно из backend

| Компонент | Статус | Endpoint | Примечание |
|-----------|--------|----------|------------|
| Профиль пользователя | ✅ Готов | `GET /user/profile` | Есть в backend/routes/users.js |
| Задачи | ✅ Готов | `GET /tasks` | Используется в web |
| Привычки | ✅ Готов | `GET /habits?year=&month=` | Используется в web |
| Записи привычек | ✅ Готов | `GET /habits/records/:year/:month` | Используется в web |
| Папки | ✅ Готов | `GET /folders` | Используется в web |
| Дни рождения | ✅ Готов | `GET /birthdays` | Есть, но не используется в web |
| Статистика | ✅ Готов | `GET /tasks/stats` | Есть, но не используется |

**Все необходимые API endpoints уже реализованы!**

### Что уже есть на фронте (web)

| Компонент | Статус | Где |
|-----------|--------|-----|
| API клиент | ✅ | `api/client.ts`, `api/tasks.ts`, `api/habits.ts` |
| Auth Context | ✅ | `context/AuthContext.tsx` |
| Banner Context | ✅ | `context/BannerContext.tsx` (для таймеров) |
| Task Card | ✅ | `components/TaskCard.tsx` |
| Habit Table | ✅ | `components/HabitTable.tsx` |
| Habit Modal | ✅ | `components/HabitModal.tsx` |
| Task Modal | ✅ | `components/TaskModal.tsx` |
| Folder Chips | ✅ | `components/FolderChips.tsx` |
| Layout | ✅ | `components/Layout.tsx` |
| Time utils | ✅ | `api/tasks.ts` (UTC/local) |

### Что нужно писать с нуля

| Компонент | Оценка времени | Сложность |
|-----------|----------------|-----------|
| **Dashboard.tsx** | 2-3 дня | Средняя |
| **ProgressBar компонент** | 2-4 часа | Низкая |
| **HabitCircle компонент** | 2-4 часа | Низкая |
| **AnimatedTaskCard** | 1 день | Средняя |
| **useLocalFirst hook** | 1-2 дня | Высокая |
| **DataSyncContext** | 4-8 часов | Средняя |
| **LocalStorage caching layer** | 1 день | Средняя |
| **Subtasks modal** | 4-8 часов | Низкая (адаптировать TaskCard) |

### Архитектурные решения для web

#### 1. Local-First vs Server-First
**Mobile:** `useLocalFirst` hook с кешированием в AsyncStorage  
**Web варианты:**
- **Option A:** Простой fetch-on-mount (как в Tasks.tsx сейчас)
- **Option B:** TanStack Query (React Query) с кешированием
- **Option C:** Собственный useLocalFirst на localStorage

**Рекомендация:** Option B (TanStack Query) — индустриальный стандарт, заменит useLocalFirst.

#### 2. Optimistic Updates
**Mobile:** Ручные optimistic updates с rollback  
**Web:** TanStack Query имеет встроенную поддержку optimistic updates

#### 3. Swipe Gestures
**Mobile:** `react-native-gesture-handler` (PanGestureHandler)  
**Web:**
- `@use-gesture/react` (react-use-gesture)
- Или отказаться от swipe в пользу кнопок (доступность)

#### 4. Timers (Focus + Habit)
**Mobile:** Local state + AsyncStorage для persistence  
**Web:**
- BannerContext уже есть
- Нужно добавить habit timer (сейчас только focus session)
- Persistence: localStorage или sessionStorage

#### 5. Charts/Progress
**Mobile:** Простые View с CSS  
**Web:**
- CSS прогресс-бары (достаточно для MVP)
- Или `recharts` для красивых графиков

### Roadmap создания Dashboard

#### Phase 1: Базовая структура (4-6 часов)
1. Создать `Dashboard.tsx` с загрузкой данных
2. Секции: Header, Progress, Habits, Events, Tasks
3. Без optimistic updates, без swipe

#### Phase 2: Интерактивность (1 день)
1. Toggle задач
2. Toggle привычек
3. Subtasks modal

#### Phase 3: Улучшения (1-2 дня)
1. Optimistic updates
2. Swipe gestures (или кнопки)
3. Timers (habit timer в banner)
4. Кеширование (TanStack Query)

#### Phase 4: Polish (4-8 часов)
1. Анимации
2. Empty states
3. Error handling
4. Responsive для mobile

**Итого: 3-4 дня до production-ready Dashboard**

### Что можно переиспользовать

| Из Mobile | Куда в Web | Как |
|-----------|------------|-----|
| `normalizeTask()` | `api/tasks.ts` | Добавить в адаптер |
| `parseHabitData()` | `api/habits.ts` | Добавить в адаптер |
| `getGreeting()` | `Dashboard.tsx` | Copy-paste utility |
| `formatDateRu()` | `utils/date.ts` | Copy-paste utility |
| `countTodayPlanTotal()` | `utils/taskStats.ts` | Создать файл |
| `isHabitDayActive()` | `utils/habitUtils.ts` | Уже есть, проверить parity |
| Стили цветов | `styles/variables.css` | Адаптировать |

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Разные формулы статистики web/mobile | Высокая | Среднее | Использовать `/api/tasks/stats` |
| Производительность (6 параллельных запросов) | Средняя | Низкое | Promise.all, кеширование |
| Swipe на десктопе не интуитивен | Высокая | Низкое | Добавить кнопки как альтернативу |
| Отсутствие TanStack Query в проекте | 100% | Среднее | Установить или писать свой useLocalFirst |

---

*Аудит завершён. Никаких изменений в код не внесено.*

# 📋 Mind & Motion — Руководство по переносу вкладок на веб

> **Актуально на:** апрель 2026  
> **Ветки:** `web-review` (фронт) · `backend` (бэкенд) · `mobile-dev3.0` (источник)  
> **Репо:** https://github.com/bragingena1998/-mindandmotion

---

## 🗂 Что уже перенесено

| Вкладка | Статус | Ключевые компоненты |
|---------|--------|---------------------|
| **Задачи** | ✅ Готово | `Tasks.tsx`, `TaskCard.tsx`, `TaskModal.tsx`, `TimePicker.tsx` |
| **Привычки** | ✅ Готово | `Habits.tsx`, `HabitTable.tsx`, `HabitModal.tsx`, `src/api/habits.ts` |
| Фокус / Таймер | ✅ (модалка) | `FocusModal.tsx` |
| Папки | ✅ (чипы) | `FolderChips.tsx` |
| Следующая вкладка | 🔄 В очереди | — |

---

## 🏗 Архитектура проекта

```
src/
├── api/
│   ├── client.ts          ← axios instance, BASE_URL, токен авторизации
│   ├── tasks.ts           ← типы Task, Folder, Subtask + все API методы + адаптеры
│   ├── habits.ts          ← типы Habit, HabitRecord + все API методы + адаптеры
│   └── [новая вкладка].ts ← создавать по аналогии с tasks.ts / habits.ts
├── components/
│   ├── TaskCard.tsx
│   ├── TaskModal.tsx
│   ├── TimePicker.tsx
│   ├── FocusModal.tsx
│   ├── FolderChips.tsx
│   ├── HabitTable.tsx     ← таблица привычек (строки = привычки, колонки = дни месяца)
│   └── HabitModal.tsx     ← форма создания/редактирования привычки
├── pages/
│   ├── Tasks.tsx          ← страница задач, оркестрирует всё
│   └── Habits.tsx         ← страница привычек, оркестрирует всё
└── styles/
    ├── tasks.css
    └── habits.css
```

### Локальные пути (для Windsurf)
- Фронт: проект открыт локально, ветка `web-review`
- Бэкенд: работает на `https://mindandmotion.ru/api` (продакшн, **не трогать**)
- Dev сервер фронта: `http://localhost:3001` (Vite)
- Перезапуск фронта: обычный hot-reload Vite, бэкенд перезапускать не нужно

---

## ⚙️ Механизм работы (как устроен перенос)

### Шаг 0 — СНАЧАЛА читай бэкенд (ОБЯЗАТЕЛЬНО)
**Всегда начинай с ветки `backend`, файл `routes/[вкладка].js`.**  
Это экономит часы отладки. Смотри:
- Точные имена полей в SQL запросах
- Как бэкенд принимает данные (тип: строка, массив, число?)
- Как бэкенд отдаёт данные (парсит ли сам JSON поля или отдаёт как есть из MySQL?)

### Шаг 1 — Аудит мобильного приложения
Перед переносом вкладки проводится аудит исходного кода в `mobile-dev3.0`:
- Смотрим все `screens/` и `components/` относящиеся к вкладке
- Выписываем все **API эндпоинты**, которые использует экран
- Выписываем все **типы/интерфейсы** данных
- Фиксируем **бизнес-логику** (фильтрация, группировка, вычисления)

### Шаг 2 — Аудит бэкенда
Смотрим ветку `backend`:
- Все маршруты (`routes/`) для нужной вкладки
- Имена полей в БД (MySQL, snake_case!)
- Что возвращает каждый эндпоинт
- **Как бэкенд валидирует входные данные** (`Array.isArray()`, `typeof`, etc.)
- Особые эндпоинты (статистика, архивы, мета)

### Шаг 3 — Создание API-слоя
Создаём `src/api/[module].ts` по шаблону `tasks.ts` или `habits.ts`:
1. Интерфейсы TypeScript для всех сущностей
2. `adaptFromAPI()` — бэкенд → фронт (snake_case → camelCase)
3. `adaptForAPI()` — фронт → бэкенд (camelCase → snake_case, **в том формате который ждёт бэкенд**)
4. Все CRUD функции

### Шаг 4 — Компоненты и страница
Создаём по аналогии с `Tasks.tsx` + `TaskCard.tsx`.

---

## ⚠️ Критические нюансы — накопленный опыт

### 1. Несоответствие имён полей (ГЛАВНАЯ БОЛЬ)

Бэкенд возвращает **snake_case**, фронт использует **camelCase**.  
Адаптер `adaptFromAPI` должен покрывать **все варианты** написания:

```typescript
// Пример из tasks.ts — бэкенд может вернуть любой из этих вариантов:
isRecurring: !!(dbTask.isrecurring || dbTask.is_recurring || dbTask.isRecurring),
doneDate: dbTask.donedate || dbTask.done_date || dbTask.doneDate || null,
focusSessions: dbTask.focussessions || dbTask.focus_sessions || dbTask.focusSessions || 0,
```

**Правило:** всегда проверяй реальный ответ бэкенда через DevTools → Network перед написанием адаптера.

### 2. Время — UTC на бэкенде, локальное на фронте

Бэкенд хранит время в **UTC**. Фронт показывает **локальное**.  
Есть две функции-конвертера (в `tasks.ts`):

```typescript
localTimeToUTC(timeStr)   // при отправке на бэкенд
extractLocalTime(isoStr)  // при получении с бэкенда
```

**Правило:** при переносе любой вкладки с временны́ми полями — использовать эти же функции или аналогичные.

### 3. Адаптер `adaptForAPI` — шлюз, который нельзя пропускать

Все поля, которые ты передаёшь в `updateTask()` или `createTask()`, проходят через `adaptForAPI`.  
Если поле не упомянуто в адаптере — оно **молча выбрасывается**.

Частые ошибки:
- Поле добавлено в интерфейс `Task`, но забыто в `adaptForAPI`
- Поле передаётся в `updateTask`, но адаптер его переименовывает/затирает
- `isRecurring` перезаписывался с `true` на `false` потому что адаптер вычислял его из `recurrence` поля

### 4. Повторяющиеся задачи — логика на фронте

При отметке задачи выполненной (`done: true`) — **фронт сам вычисляет `nextDate`** и передаёт его бэкенду. Бэкенд создаёт следующую копию задачи.

```typescript
// Из Tasks.tsx — handleToggleTask:
if (done && hasRecurrence && task.date && recurrenceType) {
  // вычисляем nextDate по типу повторения
  await updateTask(id, { ...allTaskFields, nextDate });
}
```

**Правило:** при обновлении задачи передавать **ВСЕ поля**, не только изменённые — иначе бэкенд может затереть данные.

### 5. Фильтрация по месяцу

Бэкенд принимает `?year=2026&month=04` для архивной навигации.  
На фронте есть навигатор месяцев и `currentMonth` state.

### 6. `subtasksCount` — счётчик, не данные

Бэкенд возвращает только **количество** подзадач в поле `subtasksCount`.  
Сами подзадачи загружаются отдельным запросом при раскрытии карточки:
```
GET /tasks/:id/subtasks
```

### 7. Bottom sheet / модалки

На **мобиле** — bottom sheet (снизу, borderRadius 20px 20px 0 0).  
На **десктопе** — центрированная модалка (transform: translate(-50%, -50%)).  
Определяется через `isMobile = window.innerWidth < 768`.

```typescript
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
useEffect(() => {
  const fn = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', fn);
  return () => window.removeEventListener('resize', fn);
}, []);
```

### 8. `loadTasks()` / `loadHabits()` — через `useCallback` + `useEffect`

```typescript
const loadHabits = useCallback(async () => { ... }, [currentYear, currentMonth]);
useEffect(() => { loadHabits(); }, [loadHabits]);
```

После любого изменения (create/update/delete) — вызывать `await loadHabits()` для синхронизации.  
**Не делать** ручной merge state — только перезагрузка с бэкенда.

### 9. Папки (FolderChips)

Папки — общая сущность для всех вкладок.  
`fetchFolders()` уже реализована в `src/api/tasks.ts`.  
При создании новой вкладки — **переиспользовать** тот же API.

---

## 🔥 Разбор реальных багов — Привычки (апрель 2026)

### БАГ: `days_of_week` сохраняется, но после перезагрузки не применяется

**Симптомы:**
- PUT `/api/habits/:id` → 200 OK ✅
- GET `/api/habits?year=&month=` → `days_of_week: []` всегда ❌
- Дни в таблице не блокируются

**Диагностика через логи (что показал console.log):**
```
[updateHabit] PUT payload: { days_of_week: "[1,2,3]" }  ← фронт отправляет строку
[updateHabit] Response: {success: true}                  ← бэкенд говорит ОК
[adaptHabit] rawDays= []                                 ← GET возвращает пустой массив
```

**Корневая причина — бэкенд `routes/habits.js`, PUT handler:**
```js
// БЕЗ ИЗМЕНЕНИЙ В БЭКЕНДЕ — он рабочий, мобильное приложение на нём работает
const daysOfWeekJson = Array.isArray(days_of_week)
  ? JSON.stringify(days_of_week)
  : '[]';  // ← строка "[1,2,3]" — не массив → всегда пишет '[]' в БД
```

Бэкенд ждёт **массив** `[1,2,3]`. Фронт отправлял **строку** `"[1,2,3]"`.  
`Array.isArray("[1,2,3]")` → `false` → в БД всегда записывался `'[]'`.

**Решение — только фронт, файл `src/api/habits.ts`:**
```typescript
// ❌ БЫЛО (отправляли строку):
result.days_of_week = Array.isArray(habit.daysOfWeek)
  ? JSON.stringify(habit.daysOfWeek)
  : '[]';

// ✅ СТАЛО (отправляем массив — бэкенд сам сериализует):
result.days_of_week = Array.isArray(habit.daysOfWeek)
  ? habit.daysOfWeek
  : [];
```

**Урок:** Перед написанием `adaptForAPI` — **смотри бэкенд** (`routes/*.js`) и проверяй как он валидирует поле (`Array.isArray`, `typeof`, `parseInt` и т.д.). Отправляй данные **в том типе, который ждёт бэкенд**, не сериализуй заранее.

---

### Как устроены привычки (для справки при следующих вкладках)

**Эндпоинты бэкенда:**
```
GET    /api/habits?year=2026&month=4        ← список привычек активных в месяце
GET    /api/habits/records/:year/:month     ← записи выполнения за месяц
POST   /api/habits                          ← создать привычку
PUT    /api/habits/:id                      ← обновить привычку
PUT    /api/habits/:id/monthly-config       ← план/архив на конкретный месяц
PUT    /api/habits/:id/archive              ← архивировать в месяце
PUT    /api/habits/reorder                  ← сортировка
POST   /api/habits/records                  ← записать выполнение дня
DELETE /api/habits/records                  ← удалить запись выполнения
DELETE /api/habits/:id                      ← удалить/архивировать привычку
```

**Ключевые поля в БД:**
- `days_of_week` — JSON-строка `"[1,2,3]"` (0=вс, 1=пн, ..., 6=сб), хранится в MySQL как TEXT
- `target_type` — `'monthly'` | `'weekly'` | `'daily'`
- `plan` — целевое значение (число)
- `unit` — единица измерения (строка)
- `start_year`, `start_month` — с какого месяца активна привычка
- `order_index` — для ручной сортировки

**Структура GET /api/habits/records:**
```js
// Бэкенд возвращает:
{ habitid: 68, day: 15, value: 30 }  // ← поле называется habitid, не habit_id!
```

**Компонент HabitTable:**
- Таблица: строки = привычки, колонки = дни месяца (1..31)
- Клик по ячейке → вводит значение выполнения
- `days_of_week` → блокирует дни когда привычка не должна выполняться (серый цвет)
- Long press на название → вибрация + редактирование

---

## 📐 Шаблон для новой вкладки

### Структура файлов
```
src/
├── api/[module].ts        ← типы + адаптеры + API методы
├── pages/[Module].tsx     ← страница (оркестратор)
├── components/
│   ├── [Module]Card.tsx   ← карточка
│   └── [Module]Modal.tsx  ← форма создания/редактирования
└── styles/[module].css    ← стили
```

### Минимальный шаблон `src/api/habits.ts`
```typescript
import { apiClient } from './client';

// === ТИПЫ ===
export interface Habit {
  id: number;
  name: string;
  unit: string;
  plan: number;
  targetType: 'monthly' | 'weekly' | 'daily';
  daysOfWeek?: number[];  // [0-6], undefined = все дни
  startYear: number;
  startMonth: number;
}

export interface HabitRecord {
  habitId: number;
  day: number;
  value: number;
}

// === АДАПТЕРЫ ===
function adaptHabitFromAPI(raw: any): Habit {
  const rawDays = raw.days_of_week ?? raw.daysOfWeek ?? raw.daysofweek;
  let daysOfWeek: number[] | undefined;

  if (rawDays !== null && rawDays !== undefined) {
    let parsed: any = null;
    if (Array.isArray(rawDays)) {
      parsed = rawDays;
    } else if (typeof rawDays === 'string' && rawDays.trim() !== '') {
      try { parsed = JSON.parse(rawDays.trim()); } catch { parsed = []; }
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      daysOfWeek = parsed.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);
    }
  }

  return {
    id: raw.id,
    name: raw.name || '',
    unit: raw.unit || 'раз',
    plan: Number(raw.plan) || 0,
    targetType: raw.target_type || 'monthly',
    daysOfWeek,
    startYear: raw.start_year || new Date().getFullYear(),
    startMonth: raw.start_month || new Date().getMonth() + 1,
  };
}

function adaptHabitForAPI(habit: Partial<Habit>): any {
  const result: any = {};
  if (habit.name !== undefined) result.name = habit.name;
  if (habit.unit !== undefined) result.unit = habit.unit;
  if (habit.plan !== undefined) result.plan = habit.plan;
  if (habit.targetType !== undefined) result.target_type = habit.targetType;
  // ВАЖНО: отправлять МАССИВ, не строку — бэкенд делает Array.isArray()
  if ('daysOfWeek' in habit) {
    result.days_of_week = Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : [];
  }
  return result;
}

// === API МЕТОДЫ ===
export async function fetchHabits(year: number, month: number): Promise<Habit[]> {
  const response = await apiClient.get(`/habits?year=${year}&month=${month}`);
  const data = response.data;
  const list = Array.isArray(data) ? data : (data.habits || []);
  return list.map(adaptHabitFromAPI);
}

export async function fetchHabitRecords(year: number, month: number): Promise<HabitRecord[]> {
  const response = await apiClient.get(`/habits/records/${year}/${month}`);
  return (response.data || []).map((r: any) => ({
    habitId: r.habitid ?? r.habit_id,  // ← бэкенд возвращает habitid (без подчёркивания)
    day: r.day,
    value: r.value,
  }));
}

export async function updateHabit(id: number, data: Partial<Habit>): Promise<void> {
  await apiClient.put(`/habits/${id}`, adaptHabitForAPI(data));
}
```

---

## 🔍 Чек-лист перед написанием кода

### Аудит бэкенда (ветка `backend`) — ПЕРВЫЙ ШАГ
- [ ] Найти `routes/[module].js`
- [ ] Записать точные имена полей в SQL запросах
- [ ] **Проверить тип данных который ждёт бэкенд** (`Array.isArray`? `typeof === 'string'`?)
- [ ] Проверить что возвращает GET (структура ответа, имена полей)
- [ ] Есть ли специальные эндпоинты (статистика, периоды, логи выполнения)
- [ ] Как хранится прогресс/история (отдельная таблица?)

### Аудит мобильного приложения (ветка `mobile-dev3.0`)
- [ ] Найти экран (`screens/[Module]*` или аналог)
- [ ] Выписать все `fetch`/`axios` вызовы
- [ ] Понять бизнес-логику
- [ ] Посмотреть компоненты карточек

### Разработка
- [ ] Создать `src/api/[module].ts` с адаптерами
- [ ] Проверить адаптеры через DevTools перед написанием UI
- [ ] Реализовать страницу с `load*` через `useCallback`
- [ ] Mobile/Desktop адаптивность для всех модалок
- [ ] Состояния: loading, error, empty state
- [ ] Подтверждение при удалении

---

## 🐛 Типичные ошибки и их решения

| Ошибка | Причина | Решение |
|--------|---------|---------| 
| Поле приходит как `undefined` | Разные имена в адаптере | Добавить все варианты: `raw.field \|\| raw.field_name \|\| raw.fieldName` |
| Время сдвигается на ±N часов | Не конвертируется UTC↔Local | Использовать `localTimeToUTC` / `extractLocalTime` |
| При обновлении поле сбрасывается | Поле не передаётся в адаптер | Добавить поле в `adaptForAPI` |
| Повторение сбрасывается при редактировании | `recurrence` вычисляется из неправильного поля | Приоритет: `isRecurring` > `recurrenceType` > `recurrence` |
| 404 на эндпоинте | Неверный URL или метод | Сверить с `routes/` в ветке `backend` |
| Данные не обновляются после изменения | Ручной merge вместо `loadTasks()` | Всегда делать `await load*()` после мутации |
| `isRecurring` приходит как `0` вместо `false` | MySQL возвращает TINYINT | Оборачивать в `!!()`: `!!(raw.isrecurring)` |
| **`days_of_week` всегда `[]` после сохранения** | **Фронт отправлял строку, бэкенд ждёт массив** | **`adaptForAPI`: отправлять массив, не `JSON.stringify`** |
| Поле `habitid` не парсится | Бэкенд `records` возвращает `habitid` без `_` | Использовать `r.habitid ?? r.habit_id` |

---

## 💬 Промт для нового чата — старт следующей вкладки

```
Ты помогаешь переносить вкладки с мобильного React Native приложения 
на веб-версию Mind & Motion.

Репозиторий: https://github.com/bragingena1998/-mindandmotion
- Ветка web-review  — веб-фронт (React + TypeScript + Vite), localhost:3001
- Ветка backend     — Node.js/Express бэкенд, продакшн на mindandmotion.ru/api (не трогать)
- Ветка mobile-dev3.0 — React Native источник для переноса

ГЛАВНОЕ ПРАВИЛО РАБОТЫ:
1. Ты — мозг: читаешь GitHub через коннектор, даёшь промты для Windsurf
2. Windsurf — руки: выполняет код локально
3. Я — связь между вами + тестировщик
4. Запрещено управлять браузером, только чтение файлов напрямую в GitHub

ПОРЯДОК АУДИТА (строго соблюдать):
1. СНАЧАЛА читай бэкенд: routes/[module].js в ветке backend
   — смотри как бэкенд валидирует входные данные (Array.isArray? typeof?)
   — это предотвращает баги типа "сохраняется но не применяется"
2. ПОТОМ читай мобильный код в ветке mobile-dev3.0
3. Составляй план — НЕ пиши код сразу

Прочитай docs/WEB_TRANSFER_GUIDE.md в ветке web-review — 
там весь накопленный опыт, реальные баги и их решения (включая days_of_week).

После прочтения подтверди что понял архитектуру и назови следующую вкладку для переноса.
```

---

## 📌 Полезные ссылки

- [web-review ветка](https://github.com/bragingena1998/-mindandmotion/tree/web-review)
- [backend ветка](https://github.com/bragingena1998/-mindandmotion/tree/backend)  
- [mobile-dev3.0 ветка](https://github.com/bragingena1998/-mindandmotion/tree/mobile-dev3.0)
- Актуальный шаблон API задач: `src/api/tasks.ts` в `web-review`
- Актуальный шаблон API привычек: `src/api/habits.ts` в `web-review`
- Актуальный шаблон страницы: `src/pages/Tasks.tsx` в `web-review`
- Актуальный шаблон карточки: `src/components/TaskCard.tsx` в `web-review`

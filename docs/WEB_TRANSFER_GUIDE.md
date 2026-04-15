# 📋 Mind & Motion — Руководство по переносу вкладок на веб

> **Актуально на:** апрель 2026  
> **Ветки:** `web-review` (фронт) · `backend` (бэкенд) · `mobile-dev3.0` (источник)  
> **Репо:** https://github.com/bragingena1998/-mindandmotion

---

## 🗂 Что уже перенесено

| Вкладка | Статус | Ключевые компоненты |
|---------|--------|---------------------|
| **Задачи** | ✅ Готово | `Tasks.tsx`, `TaskCard.tsx`, `TaskModal.tsx`, `TimePicker.tsx` |
| **Привычки** | 🔄 Следующая | — |
| Фокус / Таймер | ✅ (модалка) | `FocusModal.tsx` |
| Папки | ✅ (чипы) | `FolderChips.tsx` |

---

## 🏗 Архитектура проекта

```
src/
├── api/
│   ├── client.ts          ← axios instance, BASE_URL, токен авторизации
│   ├── tasks.ts           ← типы Task, Folder, Subtask + все API методы + адаптеры
│   └── [новая вкладка].ts ← создавать по аналогии с tasks.ts
├── components/
│   ├── TaskCard.tsx
│   ├── TaskModal.tsx
│   ├── TimePicker.tsx
│   ├── FocusModal.tsx
│   └── FolderChips.tsx
├── pages/
│   └── Tasks.tsx          ← страница, оркестрирует всё
└── styles/
    └── tasks.css          ← стили для задач
```

---

## ⚙️ Механизм работы (как устроен перенос)

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
- Особые эндпоинты (статистика, архивы, мета)

### Шаг 3 — Создание API-слоя
Создаём `src/api/[module].ts` по шаблону `tasks.ts`:
1. Интерфейсы TypeScript для всех сущностей
2. `adaptFromAPI()` — бэкенд → фронт (snake_case → camelCase)
3. `adaptForAPI()` — фронт → бэкенд (camelCase → snake_case)
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

### 8. `loadTasks()` — через `useCallback` + `useEffect`

```typescript
const loadTasks = useCallback(async () => { ... }, [selectedFolder, currentMonth]);
useEffect(() => { loadTasks(); }, [loadTasks]);
```

После любого изменения (create/update/delete) — вызывать `await loadTasks()` для синхронизации.  
**Не делать** ручной merge state — только перезагрузка с бэкенда.

### 9. Папки (FolderChips)

Папки — общая сущность для всех вкладок.  
`fetchFolders()` уже реализована в `src/api/tasks.ts`.  
При создании новой вкладки — **переиспользовать** тот же API.

---

## 📐 Шаблон для новой вкладки

### Структура файлов
```
src/
├── api/habits.ts          ← типы + адаптеры + API методы
├── pages/Habits.tsx       ← страница (оркестратор)
├── components/
│   ├── HabitCard.tsx      ← карточка привычки
│   └── HabitModal.tsx     ← форма создания/редактирования
└── styles/habits.css      ← стили
```

### Минимальный шаблон `src/api/habits.ts`
```typescript
import { apiClient } from './client';

// === ТИПЫ ===
export interface Habit {
  id: number;
  title: string;
  // ... все поля из мобильного приложения
}

// === АДАПТЕРЫ ===
function adaptHabitFromAPI(raw: any): Habit {
  return {
    id: raw.id,
    title: raw.title || '',
    // snake_case → camelCase, все варианты написания
  };
}

function adaptHabitForAPI(habit: Partial<Habit>): any {
  return {
    title: habit.title,
    // camelCase → snake_case для бэкенда
  };
}

// === API МЕТОДЫ ===
export async function fetchHabits(): Promise<Habit[]> {
  const response = await apiClient.get('/habits');
  return (response.data.habits || response.data).map(adaptHabitFromAPI);
}

export async function createHabit(data: Partial<Habit>): Promise<Habit> {
  const response = await apiClient.post('/habits', adaptHabitForAPI(data));
  return adaptHabitFromAPI(response.data.habit || response.data);
}

export async function updateHabit(id: number, data: Partial<Habit>): Promise<Habit> {
  const response = await apiClient.put(`/habits/${id}`, adaptHabitForAPI(data));
  return adaptHabitFromAPI(response.data.habit || response.data);
}

export async function deleteHabit(id: number): Promise<void> {
  await apiClient.delete(`/habits/${id}`);
}
```

---

## 🔍 Чек-лист перед написанием кода

### Аудит бэкенда (ветка `backend`)
- [ ] Найти все маршруты для вкладки (`routes/habits.js` или аналог)
- [ ] Записать точные имена полей в БД
- [ ] Проверить что возвращает GET /habits (структура ответа)
- [ ] Есть ли специальные эндпоинты (статистика, периоды, логи выполнения)
- [ ] Как хранится прогресс/история (отдельная таблица?)

### Аудит мобильного приложения (ветка `mobile-dev3.0`)
- [ ] Найти экран привычек (`screens/Habits*` или аналог)
- [ ] Выписать все `fetch`/`axios` вызовы
- [ ] Понять бизнес-логику (как отмечается выполнение, как считается streak)
- [ ] Посмотреть компонент карточки привычки

### Разработка
- [ ] Создать `src/api/habits.ts` с адаптерами
- [ ] Проверить адаптеры через DevTools перед написанием UI
- [ ] Реализовать страницу с `loadHabits` через `useCallback`
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
| Данные не обновляются после изменения | Ручной merge вместо `loadTasks()` | Всегда делать `await loadTasks()` после мутации |
| `isRecurring` приходит как `0` вместо `false` | MySQL возвращает TINYINT | Оборачивать в `!!()`: `!!(raw.isrecurring)` |

---

## 💬 Промты для нового чата

### Промт 1 — Загрузка контекста проекта
```
Ты помогаешь мне переносить вкладки с мобильного React Native приложения 
на веб-версию Mind & Motion.

Репозиторий: https://github.com/bragingena1998/-mindandmotion
- Ветка web-review — веб-фронт (React + TypeScript + Vite)
- Ветка backend — Node.js/Express бэкенд
- Ветка mobile-dev3.0 — React Native источник для переноса

Прочитай документ docs/WEB_TRANSFER_GUIDE.md в ветке web-review — 
там весь накопленный опыт, нюансы адаптеров, типичные ошибки и шаблоны.

После прочтения подтверди что понял архитектуру и готов начать аудит следующей вкладки.
```

### Промт 2 — Аудит привычек
```
Начинаем перенос вкладки "Привычки".

Шаг 1: Прочитай мобильный код:
- src/screens/ или app/ в ветке mobile-dev3.0 — найди экран привычек
- Выпиши все API вызовы, типы данных, бизнес-логику

Шаг 2: Прочитай бэкенд:
- ветка backend — найди routes/habits* 
- Выпиши все эндпоинты, имена полей в БД, структуру ответов

Шаг 3: Составь план:
- Типы TypeScript для Habit
- Список всех эндпоинтов
- Особая логика (streak, периоды, логи)
- Что нужно реализовать в первую очередь

НЕ пиши код на этом шаге — только аудит и план.
```

### Промт 3 — Создание API слоя
```
На основе аудита создай src/api/habits.ts по шаблону из WEB_TRANSFER_GUIDE.md.

Требования:
1. Все поля из интерфейса Habit с правильными TypeScript типами
2. adaptHabitFromAPI — покрывает все варианты имён полей (snake_case, camelCase, lowercase)
3. adaptHabitForAPI — все поля которые ожидает бэкенд
4. Конвертация времени если есть временны́е поля
5. Все CRUD методы + специфические для привычек (отметить выполнение, получить историю)

После создания файла — дай промт для проверки адаптера через DevTools.
```

---

## 📌 Полезные ссылки

- [web-review ветка](https://github.com/bragingena1998/-mindandmotion/tree/web-review)
- [backend ветка](https://github.com/bragingena1998/-mindandmotion/tree/backend)  
- [mobile-dev3.0 ветка](https://github.com/bragingena1998/-mindandmotion/tree/mobile-dev3.0)
- Актуальный шаблон API: `src/api/tasks.ts` в `web-review`
- Актуальный шаблон страницы: `src/pages/Tasks.tsx` в `web-review`
- Актуальный шаблон карточки: `src/components/TaskCard.tsx` в `web-review`

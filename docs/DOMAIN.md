# Mind & Motion — Доменная модель

*Актуально на: апрель 2026*  
*Файл создан на основе: AGENTS.md, api/*.ts, pages/*.tsx, components/*.tsx, docs/Аудит привычек.md, docs/Миграция.md*

---

## Привычки (Habits)

### Сущность Habit

| Поле | Тип | Описание | Источник |
|------|-----|----------|----------|
| `id` | `number` | ID привычки | БД |
| `name` | `string` | Название привычки | Пользователь |
| `unit` | `string` | Единица измерения: 'Дни' \| 'Часы' \| 'Кол-во' \| custom | Пользователь |
| `plan` | `number` | Целевое количество | Пользователь |
| `targetType` | `'daily' \| 'monthly' \| 'period'` | Тип цели | Пользователь |
| `startDate` | `string \| null` | Дата начала 'YYYY-MM-DD' | Пользователь |
| `endDate` | `string \| null` | Дата окончания 'YYYY-MM-DD' | Пользователь |
| `daysOfWeek` | `number[] \| undefined` | Дни недели [0-6], 0=Вс. `undefined` = все дни активны | Пользователь |
| `startYear` | `number?` | Год начала (для бэкенда) | Код |
| `startMonth` | `number?` | Месяц начала (для бэкенда) | Код |
| `orderIndex` | `number` | Порядок сортировки | Система |
| `userId` | `number?` | ID пользователя | БД |
| `createdAt` | `string?` | Дата создания | БД |

### Сущность HabitRecord

| Поле | Тип | Описание |
|------|-----|----------|
| `habitId` | `number` | ID привычки |
| `year` | `number` | Год записи |
| `month` | `number` | Месяц записи (1-12) |
| `day` | `number` | День записи (1-31) |
| `value` | `number` | Значение выполнения |

### Бизнес-правила

#### 1. Типы привычек (unit)

| Unit | Поведение ячейки | Логика тапа | Логика long-press |
|------|------------------|-------------|-------------------|
| 'Дни' | Toggle ✓ / пусто | value = 0 → 1, value > 0 → 0 | Таймер или input (❓ не реализовано в web) |
| 'Часы' | Число часов | Инкремент +1 час | Открывает `HoursEditModal` или таймер |
| 'Кол-во' / custom | Число | `targetType='daily'`: toggle 0/plan; `targetType='period'`: инкремент +1 | Input модалка |

#### 2. Типы целей (targetType)

| targetType | Смысл плана | Формула прогресса |
|------------|-------------|-------------------|
| 'daily' | "в день" | `total / (plan × activeDays)` |
| 'monthly' | "за месяц" | `total / plan` |
| 'period' | "за период" | `total / plan` |

#### 3. Active Day (isHabitDayActive)

День считается **активным** (по нему идёт статистика и его можно отметить) если:

1. Дата в диапазоне `[startDate, endDate]` (если заданы)
2. День недели входит в `daysOfWeek` (если задано)
3. День не из будущего (❓ защита от записи в будущее — неочевидна)

Пустой `daysOfWeek` (`[]` или `undefined`) = все дни активны.

#### 4. Расчёт прогресса

```typescript
// Из habitUtils.ts
daily:    percent = total / (plan * activeDays)
period:   percent = total / plan
monthly:  percent = total / plan
```

`activeDays` — количество дней месяца когда привычка активна (с учётом startDate, endDate, daysOfWeek).

#### 5. Streak

Streak считается в `Habits.tsx:84-93` — идём от сегодня назад, пока находим записи с `value > 0` на активных днях.

#### 6. Формат days_of_week

📄 Бэкенд хранит как JSON-строку `"[1,2,4]"` в поле `TEXT`.  
Web отправляет массив `[1,2,4]` → бэкенд делает `JSON.stringify` → сохраняет.  
При GET бэкенд возвращает строку → web парсит через `JSON.parse` или поддерживает PostgreSQL array literal `"{1,2,4}"`.

### Что реализовано в web

✅ Создание/редактирование привычки (HabitModal)  
✅ Таблица привычек с ячейками дней (HabitTable)  
✅ Запись значений в ячейки (оптимистичное обновление)  
✅ Архивация привычек  
✅ Реордеринг (перетаскивание)  
✅ Дни недели (daysOfWeek) с парсингом разных форматов  
✅ График трендов (HabitTrendChart)  
✅ Таймер для привычек с unit='Часы'  

### Что ещё нет в web (❓)

❓ Drag-and-drop reorder на мобиле (в мобильном есть ReorderHabitsModal)  
❓ Проверка shouldShow флага (из mobile)  
❓ Подробная статистика по месяцам (📄)

---

## Задачи (Tasks)

### Сущность Task

| Поле | Тип | Описание | Источник |
|------|-----|----------|----------|
| `id` | `number` | ID задачи | БД |
| `title` | `string` | Название | Пользователь |
| `comment` | `string` | Описание/комментарий | Пользователь |
| `date` | `string` | Дата задачи 'YYYY-MM-DD' | Пользователь |
| `time` | `string?` | Время 'HH:MM' (UTC на бэкенде → локальное на фронте) | Пользователь |
| `deadline` | `string \| null` | Дедлайн 'YYYY-MM-DD' | Пользователь |
| `priority` | `1 \| 2 \| 3` | Приоритет: 1=low, 2=medium, 3=high | Пользователь |
| `done` | `boolean` | Выполнена? | Пользователь |
| `doneDate` | `string \| null` | Когда выполнена 'YYYY-MM-DD' | Система |
| `focusSessions` | `number` | Количество фокус-сессий | Система |
| `isRecurring` | `boolean` | Повторяющаяся? | Пользователь |
| `recurrenceType` | `string` | Тип повторения: 'daily' \| 'weekly' \| 'monthly' | Пользователь |
| `recurrenceValue` | `string` | Доп. параметры повторения | Пользователь |
| `folderId` | `number \| null` | ID папки | Пользователь |
| `subtasksCount` | `number` | Количество подзадач | Система |

### Сущность Folder

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `number` | ID папки |
| `name` | `string` | Название |
| `icon` | `string?` | Emoji иконка (авто-подбор по названию) |

### Сущность Subtask

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `number` | ID подзадачи |
| `taskId` | `number` | ID родительской задачи |
| `title` | `string` | Название |
| `done` | `boolean` | Выполнена? |

### Бизнес-правила

#### 1. Приоритеты

| Значение | Метка | Цвет |
|----------|-------|------|
| 1 | НИЗКИЙ | серый |
| 2 | СРЕДНИЙ | жёлтый |
| 3 | ВЫСОКИЙ | красный |

#### 2. Статусы задач (по дате)

```typescript
// Из TaskCard.tsx:82-92
if (taskDate < todayStr)  → '🔥 ПРОСРОЧЕНО'
if (taskDate === todayStr) → '⚡ СЕГОДНЯ'
```

#### 3. Группировка задач (Tasks.tsx)

1. 🔥 ПРОСРОЧЕННЫЕ (date < today)
2. ⚡ СЕГОДНЯ (date === today)
3. 📅 ЗАВТРА (date === tomorrow)
4. 📆 БУДУЩИЕ (date > tomorrow)
5. ✅ ВЫПОЛНЕННЫЕ (done = true)

#### 4. Рекуррентные задачи

📄 При создании задачи с recurrence ≠ 'none' бэкенд генерирует следующую задачу автоматически.  
📄 Поле `isGenerated` помечает сгенерированные задачи.  
📄 `PUT /tasks/:id/stop-recurring` — остановить генерацию.

#### 5. Фокус-сессии

`POST /tasks/:id/focus` — запускает таймер фокус-сессии.  
`focusSessions` инкрементируется при завершении.

#### 6. Время и таймзоны

⚠️ Сложность: бэкенд хранит время в UTC, web работает с локальным.

```typescript
// Отправка: локальное → UTC
localTimeToUTC('14:30') → '11:30' (если UTC+3)

// Получение: UTC → локальное
extractLocalTime('11:30') → '14:30'
```

### Что реализовано в web

✅ Полный CRUD задач  
✅ Подзадачи (создание, редактирование, удаление, toggle)  
✅ Папки (FolderChips) с emoji-иконками  
✅ Приоритеты и рекуррентность  
✅ Группировка по датам с подсветкой просроченных  
✅ Фокус-сессии с таймером  
✅ Статистика (сегодня/неделя/месяц/всего)

### Что ещё нет в web (❓)

❓ Остановка рекуррентности (`PUT /tasks/:id/stop-recurring` — API есть, UI нет)  
❓ Drag-and-drop задач (📄 в mobile есть)  
❓ Фильтрация по папкам в URL (сейчас только в UI)

---

## Таймеры

### Архитектура

```
┌─────────────────────┐
│   BannerContext     │  ← Глобальное состояние баннера
│   (React Context)   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌──────────┐  ┌──────────┐
│ Layout   │  │ HabitTable│
│(рендерит)│  │(запускает)│
│  Banner  │  │           │
└────┬─────┘  └─────┬─────┘
     │              │
     └──────┬───────┘
            ▼
    ┌───────────────┐
    │GlobalTimerBanner│  ← UI таймера, не размонтируется
    │   (sticky)      │
    └───────────────┘
```

### Типы баннеров

| Тип | Данные | Источник | Сохранение |
|-----|--------|----------|------------|
| `'habit-timer'` | `habit`, `day`, `existingMinutes` | HabitTable (long-press на ячейку часов) | POST /habits/records |
| `'focus-session'` | `task`, `plannedMinutes` | TaskCard (кнопка фокуса) | POST /tasks/:id/focus |

### Поведение

- Таймер живёт в `Layout.tsx` — не пропадает при смене страниц
- Можно свернуть/развернуть
- При завершении: `banner.onSave()` → `closeBanner()`
- Для фокус-сессии: обратный отсчёт, при достижении 0 — автосохранение

### Что реализовано в web

✅ GlobalTimerBanner с двумя режимами  
✅ Запуск из HabitTable (привычки)  
✅ Запуск из TaskCard (фокус-сессии)  
✅ Свернуть/развернуть  
✅ Сохранение по завершении  

---

## snake_case ↔ camelCase маппинг

### Tasks

| camelCase (Frontend) | snake_case (Backend) | Примечание |
|----------------------|----------------------|------------|
| `doneDate` | `done_date` | Дата выполнения |
| `focusSessions` | `focus_sessions` | Количество сессий |
| `isRecurring` | `is_recurring` | Повторяющаяся? |
| `recurrenceType` | `recurrence_type` | Тип повторения |
| `recurrenceValue` | `recurrence_value` | Параметры |
| `isGenerated` | `is_generated` | Сгенерирована? |
| `templateId` | `template_id` | ID шаблона |
| `folderId` | `folder_id` | ID папки |
| `subtasksCount` | `subtasks_count` | Количество подзадач |

### Habits

| camelCase (Frontend) | snake_case (Backend) | Примечание |
|----------------------|----------------------|------------|
| `targetType` | `target_type` | Тип цели |
| `startDate` | `start_date` | Дата начала |
| `endDate` | `end_date` | Дата конца |
| `daysOfWeek` | `days_of_week` | JSON-массив |
| `orderIndex` | `order_index` | Порядок сортировки |
| `startYear` | `start_year` | Год начала |
| `startMonth` | `start_month` | Месяц начала |
| `userId` | `user_id` | ID пользователя |
| `createdAt` | `created_at` | Дата создания |

### Subtasks

| camelCase (Frontend) | snake_case (Backend) | Примечание |
|----------------------|----------------------|------------|
| `taskId` | `task_id` | ID родителя |
| `done` | `completed` | ⚠️ Разные имена! |

### HabitRecord

| camelCase (Frontend) | snake_case (Backend) | Примечание |
|----------------------|----------------------|------------|
| `habitId` | `habitid` / `habit_id` | ⚠️ Два варианта! |

---

## Граничные кейсы и сложности ⚠️

### 1. Разные имена полей в разных местах ⚠️

**Subtask.done vs completed**
- Frontend использует `done: boolean`
- Бэкенд использует `completed: boolean`
- Адаптер: `done: Boolean(raw.completed ?? raw.done)`

**HabitRecord.habitId**
- Бэкенд может вернуть `habitid` (snake_case) или `habit_id`
- Адаптер: `Number(raw.habitid ?? raw.habit_id ?? raw.habitId ?? 0)`

### 2. Формат days_of_week ⚠️

📄 Бэкенд хранит как JSON-строку `"[1,2,4]"`.  
📄 Но может вернуть PostgreSQL array `"{1,2,4}"`.  
📄 Или массив `[1,2,4]` (если ORM парсит).  

Web поддерживает все форматы:
- `JSON.parse()` для `"[1,2,4]"`
- Split по `,` для `"{1,2,4}"`
- Использует как есть для `[1,2,4]`

### 3. Время и таймзоны ⚠️

Бэкенд хранит `time` как строку 'HH:MM' в UTC.  
Web конвертирует при отправке/получении.

```typescript
// ФИКСЫ в tasks.ts
[4] extractLocalTime() — UTC → local
[5] localTimeToUTC() — local → UTC
[B] extractLocalTime() — ISO datetime → local
```

### 4. Даты и UTC-1 day баг ⚠️

```typescript
// [5] ФИКС в TaskModal.tsx
function normalizeDate(raw: string): string {
  if (!raw) return '';
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  return datePart.substring(0, 10); // БЕЗ new Date()!
}
```

Использование `new Date('2026-04-27')` в часовом поясе UTC+3 даст `2026-04-26 21:00:00` → отображение "26 апреля" вместо "27".

### 5. Оптимистичные обновления ⚠️

Все изменения в UI происходят мгновенно, API вызов — асинхронно.  
При ошибке API — откат через `loadData()` или ручное обновление.

**Habits:** `optimisticUpdateRecords()` в `habitUtils.ts` — обновляет стейт до API ответа.

**Tasks:** `onToggle()` в `TaskCard.tsx` — локальный стейт меняется, потом `updateTask()`.

### 6. Различия mobile vs web ⚠️

| Фича | Mobile | Web |
|------|--------|-----|
| Storage | SecureStore | localStorage |
| BASE_URL | IP:5000 (192.168.1.35) | mindandmotion.ru/api |
| Drag-and-drop | Есть | Есть только для привычек |
| PWA | Нет | Частично |
| Таймеры | Local | Global (BannerContext) |

### 7. Поля с приоритетом fallback ⚠️

```typescript
// Из tasks.ts:148-155
const recurrenceType = task.recurrenceType
  || (task.recurrence && task.recurrence !== 'none' ? task.recurrence : null)
  || null;
```

Приоритет: `recurrenceType` > `recurrence` > `null`.

### 8. Неочевидные значения по умолчанию ⚠️

| Поле | Default | Где задано |
|------|---------|------------|
| `targetType` | `'monthly'` | `adaptHabitFromAPI` |
| `priority` | `2` (средний) | `adaptTaskForAPI` |
| `unit` | `'раз'` | `adaptHabitFromAPI` |
| `recurrence` | `'none'` | `adaptTaskFromAPI` |

### 9. Пустые массивы vs undefined ⚠️

```typescript
// habits.ts:76-80
if (Array.isArray(parsed) && parsed.length > 0) {
  daysOfWeek = parsed.map(Number).filter(...);
}
// Пустой массив [] → daysOfWeek остаётся undefined (все дни активны)
```

`daysOfWeek = []` (пустой массив) интерпретируется как `undefined` — все дни активны.  
Чтобы сделать привычку неактивной — нужно `daysOfWeek = undefined` или вообще не отправлять поле.

---

*Последнее обновление: апрель 2026*

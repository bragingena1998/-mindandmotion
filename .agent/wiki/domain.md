# Домен Mind & Motion — Типы и сущности

> Единственный источник правды для всех платформ.
> При изменении API или схемы БД — обновлять этот файл.

---

## Сущности

### Task (Задача)

```typescript
interface Task {
  id: number;
  user_id: number;
  title: string;           // до 500 символов
  date: string | null;     // ISO: 'YYYY-MM-DD' — дата выполнения
  deadline: string | null; // ISO: 'YYYY-MM-DD' — срок
  time: string | null;     // 'HH:MM'
  priority: 0 | 1 | 2 | 3; // 0=нет, 1=высокий, 2=средний, 3=низкий
  done: 0 | 1;
  done_date: string | null;
  comment: string | null;
  isrecurring: 0 | 1;
  recurrencetype: 'day' | 'week' | 'month' | null;
  recurrencevalue: string | null;
  isgenerated: 0 | 1;      // сгенерирована из шаблона
  templateid: number | null;
  folderid: number | null;
  focussessions: number;   // количество завершённых фокус-сессий
  subtasks_count: number;  // денормализованный счётчик
}
```

**Статусы задачи (вычисляемые):**
- `overdue` — дата < сегодня и done=0
- `today` — дата = сегодня и done=0
- `future` — дата > сегодня и done=0
- `completed` — done=1
- `no_date` — date = null и done=0

**Приоритеты:**
| Значение | Лейбл | Цвет |
|----------|-------|------|
| 1 | ВЫСОКИЙ | danger (красный) |
| 2 | СРЕДНИЙ | accent (золотой) |
| 3 | НИЗКИЙ | ok (зелёный) |

---

### Habit (Привычка)

```typescript
interface Habit {
  id: number;
  user_id: number;
  name: string;
  unit: string | null;     // единица измерения: 'мин', 'км', 'раз'
  plan: number;            // цель (количество)
  target_type: 'daily' | 'weekly' | 'monthly';
  start_date: string | null; // 'YYYY-MM-DD'
  end_date: string | null;
  days_of_week: number[] | null; // [0,1,2,3,4,5,6] — 0=пн...6=вс
  order_index: number;
}
```

**HabitRecord (запись выполнения):**
```typescript
interface HabitRecord {
  id: number;
  habit_id: number;
  user_id: number;
  year: number;
  month: number;  // 1-12
  day: number;    // 1-31
  value: number;  // float — сколько выполнено (для числовых привычек)
}
```

**Отображение ячейки в таблице:**
- Если `unit` есть → показывать числовое значение (`value / plan`)
- Если `unit` нет → показывать ✓ / пусто
- `value >= plan` → считается выполненной

---

### Folder (Папка задач)

```typescript
interface Folder {
  id: number;
  user_id: number;
  name: string;      // до 100 символов
  emoji: string | null; // один эмодзи
  order_index: number;
}
```

---

### Birthday / Event (День рождения / Личное событие)

```typescript
interface Birthday {
  id: number;
  user_id: number;
  name: string;
  day: number;    // 1-31
  month: number;  // 1-12
  year: number | null; // год рождения (для расчёта возраста)
  type: 'birthday' | 'event';
  notify_before: number; // дней заранее уведомить
}
```

---

## snake_case ↔ camelCase — защитные цепочки

```js
// Обязательно использовать при работе с данными из API
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.isrecurring  ?? 0
task.doneDate    ?? task.done_date    ?? null
task.subtasksCount ?? task.subtasks_count ?? 0
habit.targetType ?? habit.target_type ?? 'daily'
habit.startDate  ?? habit.start_date  ?? null
habit.daysOfWeek ?? habit.days_of_week ?? null
```

---

## Вычисляемые поля (не хранятся в БД)

```js
// Статус задачи
function getTaskStatus(task) {
  if (task.done) return 'completed';
  if (!task.date) return 'no_date';
  const today = new Date().toISOString().split('T')[0];
  if (task.date < today) return 'overdue';
  if (task.date === today) return 'today';
  return 'future';
}

// Приветствие по времени суток
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 17) return 'Добрый день';
  if (h >= 17 && h < 22) return 'Добрый вечер';
  return 'Доброй ночи';
}
```

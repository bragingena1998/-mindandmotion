# Dashboard — Web Implementation

> Статус: ✅ Реализовано в ветке web-review

---

## Описание фичи

Главный дашборд приложения Mind & Motion. Отображает сводку активности пользователя: задачи на сегодня, привычки, статистика.

---

## Файлы

### Созданы:
- `web/src/pages/Dashboard.tsx` — основной компонент страницы
- `web/src/styles/dashboard.css` — стили с адаптивной сеткой

### Изменены:
- `web/src/App.tsx` — подключение Dashboard в роутер
- `web/src/main.tsx` — импорт стилей dashboard.css

---

## Архитектура

### Компоненты виджетов:
1. **Welcome Header** — приветствие и текущая дата
2. **Today's Tasks** — список задач на сегодня с чекбоксами
3. **Today's Habits** — привычки с прогресс-барами
4. **Statistics** — 4 метрики в сетке 2x2

### API интеграция:
```typescript
// Импорты
import type { Task } from '../api/tasks';
import type { Habit, HabitRecord } from '../api/habits';
import { fetchTasks, updateTask, fetchTotalCompletedCount } from '../api/tasks';
import { fetchHabits, fetchHabitRecords } from '../api/habits';
```

### State management:
- `tasks` — массив задач
- `habits` — массив привычек
- `habitRecords` — записи выполнения привычек
- `totalCompleted` — общее количество выполненных задач
- `isLoading` — состояние загрузки
- `userName` — имя пользователя из localStorage

---

## Адаптивность

```css
/* Desktop: 3 колонки */
.dashboard-grid {
  grid-template-columns: repeat(3, 1fr);
}

/* Tablet: 2 колонки */
@media (max-width: 1024px) {
  grid-template-columns: repeat(2, 1fr);
}

/* Mobile: 1 колонка */
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

---

## Функции

### getGreeting()
Возвращает приветствие в зависимости от времени суток:
- < 12:00 — "Good morning"
- < 18:00 — "Good afternoon"
- ≥ 18:00 — "Good evening"

### handleTaskToggle(taskId, done)
Оптимистичное обновление задачи:
1. Обновляет локальный state
2. Вызывает API `updateTask`
3. При ошибке — откатывает изменения

### calculateStreak()
Рассчитывает процент выполнения привычек за текущий день.

---

## Структура проекта

```
web/src/
├── pages/
│   ├── Dashboard.tsx      ✅ [NEW]
│   ├── Tasks.tsx
│   ├── Habits.tsx
│   └── Login.tsx
├── api/
│   ├── types.ts           ✅ [NEW] — реэкспорт типов
│   ├── tasks.ts
│   └── habits.ts
├── components/
│   └── (нет dashboard-специфичных)
└── styles/
    ├── dashboard.css      ✅ [NEW]
    ├── variables.css
    ├── global.css
    ├── habits.css
    └── tasks.css
```

---

## Технический долг / TODO

- [ ] Добавить виджет календаря (CalendarScreen → web)
- [ ] Добавить виджет профиля (ProfileScreen → web)
- [ ] Реализовать real-time обновления через WebSocket
- [ ] Добавить графики трендов (recharts)

---

## История изменений

| Дата | Изменение | Автор |
|------|-----------|-------|
| 2026-04-30 | Создан Dashboard.tsx и dashboard.css | Cascade |
| 2026-04-30 | Подключение в App.tsx | Cascade |
| 2026-05-01 | Фикс импортов (types.ts → direct imports) | Cascade |

---

## Связанные документы

- `docs/AGENTS.md` — API endpoints
- `docs/.windsurf/rules/01-web.md` — web-специфика
- `mobile/src/screens/DashboardScreen.js` — мобильная реализация (source of truth)

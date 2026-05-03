# Dashboard — Web Implementation

> Статус: ✅ Полностью реализован и локализован
> Язык: Русский

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
1. **Welcome Header** — приветствие и текущая дата (русский язык)
2. **Today's Tasks** — список задач с секциями (просроченные, сегодня, завтра)
3. **Today's Habits** — привычки с цветными кругами и названиями
4. **Statistics** — 4 метрики в сетке 2x2
5. **Week Grid** — мини-график выполнения задач за 7 дней
6. **Upcoming Event** — ближайшая задача с таймером

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
- < 12:00 — "Доброе утро"
- < 18:00 — "Добрый день"
- ≥ 18:00 — "Добрый вечер"

### handleTaskToggle(taskId, done)
Оптимистичное обновление задачи с анимацией:
1. Устанавливает `completingId` для анимации
2. Вызывает API `updateTask`
3. Обновляет локальный state
4. Сбрасывает `completingId` через 600ms

### calculateStreak()
Рассчитывает процент выполнения привычек за текущий день.

### buildWeekGrid()
Строит график выполнения задач за 7 дней (пн-вс).

### getTimeUntil(date, time)
Возвращает оставшееся время до события в формате "через X ч. Y мин."

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

## Фичи (2026-05-02)

### UI/UX Улучшения
- [x] **Локализация** — все тексты переведены на русский
- [x] **Цветные приоритеты** — полоски priority-1/2/3 (зелёный/оранжевый/красный)
- [x] **Секции задач** — 🔴 ПРОСРОЧЕННЫЕ → СЕГОДНЯ → ЗАВТРА
- [x] **Кнопка "Показать ещё"** — разворачивание списка задач
- [x] **Анимация выполнения** — check + line-through при отметке
- [x] **Пустой стейт** — 🎉 конфетти и поздравление

### Виджеты
- [x] **Week Grid** — 7 столбиков с прогрессом выполнения
- [x] **Upcoming Event** — карточка с таймером до ближайшей задачи
- [x] **Habit Circles** — цветные круги с аббревиатурой + название

### Mobile
- [x] **Адаптивный скролл** — max-height: 60vh на мобильных
- [x] **Раскрытый список** — на мобильных показываются все задачи

---

## История изменений

| Дата | Изменение | Автор |
|------|-----------|-------|
| 2026-04-30 | Создан Dashboard.tsx и dashboard.css | Cascade |
| 2026-04-30 | Подключение в App.tsx | Cascade |
| 2026-05-01 | Фикс импортов (types.ts → direct imports) | Cascade |
| 2026-05-02 | Локализация на русский язык | Cascade |
| 2026-05-02 | Исправление API (fetchTotalCompletedCount, date filter) | Cascade |
| 2026-05-02 | Добавление просроченных и завтрашних задач | Cascade |
| 2026-05-02 | Цветные приоритеты для задач | Cascade |
| 2026-05-02 | Week Grid виджет | Cascade |
| 2026-05-02 | Upcoming Event виджет | Cascade |
| 2026-05-02 | Анимация выполнения задачи | Cascade |
| 2026-05-02 | Кнопка "Показать ещё" | Cascade |
| 2026-05-02 | Новый empty state с конфетти | Cascade |
| 2026-05-02 | Habit circles с названиями | Cascade |

---

## Связанные документы

- `docs/AGENTS.md` — API endpoints
- `docs/.windsurf/rules/01-web.md` — web-специфика
- `mobile/src/screens/DashboardScreen.js` — мобильная реализация (source of truth)

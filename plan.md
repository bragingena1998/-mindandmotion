# План разработки Mind & Motion

> Обновлено: 2026-05-02
> Ветка: web-review

---

## ✅ Завершено

### Dashboard (завершён 2026-05-02)
- [x] Создан `web/src/pages/Dashboard.tsx`
- [x] Создан `web/src/styles/dashboard.css`
- [x] Подключен в `App.tsx`
- [x] Исправлены импорты типов (прямые импорты из api/tasks и api/habits)
- [x] **Локализация** — все тексты переведены на русский
- [x] **Week Grid** — виджет статистики за 7 дней
- [x] **Upcoming Event** — карточка ближайшей задачи с таймером
- [x] **Цветные приоритеты** — полоски для задач (1/2/3)
- [x] **Секции задач** — просроченные / сегодня / завтра
- [x] **Кнопка "Показать ещё"** — разворачивание списка
- [x] **Анимация выполнения** — check + line-through
- [x] **Пустой стейт** — конфетти + поздравление
- [x] **Habit Circles** — привычки с цветными кругами
- [x] Документация: `docs/features/dashboard.md`

### Infrastructure
- [x] Создан `web/src/api/types.ts` — централизованный реэкспорт типов
- [x] Исправлены все импорты в Dashboard.tsx

---

## 🚧 В процессе

### 🔄 В работе (май 2026)
- [x] **handleHabitToggle** — реализована отметка привычки с Dashboard ✅
- [x] **Фикс высоты виджетов** — добавлен `align-self: start` для week-widget и upcoming-widget ✅
- [x] **Фикс счётчика выполненных задач** — `fetchTotalCompletedCount` работает корректно ✅
- [ ] **Calendar страница** — следующий приоритет после Dashboard
- [ ] **Profile страница** — настройки пользователя

### Calendar (следующий приоритет)
- [ ] Изучить `mobile/src/screens/CalendarScreen.js`
- [ ] Создать `web/src/pages/Calendar.tsx`
- [ ] Создать `web/src/styles/calendar.css`
- [ ] Подключить в `App.tsx`

### Profile
- [ ] Изучить `mobile/src/screens/ProfileScreen.js`
- [ ] Создать `web/src/pages/Profile.tsx`
- [ ] Интеграция с API пользователя

---

## 📋 Бэклог (будущие задачи)

### Web
- [ ] CalendarScreen → web
- [ ] ProfileScreen → web
- [ ] SettingsScreen → web
- [ ] Offline mode (Service Worker)
- [ ] Push notifications
- [ ] Графики аналитики (recharts)

### API
- [ ] Swagger/OpenAPI документация
- [ ] Rate limiting
- [ ] Refresh tokens

### Mobile
- [ ] Релиз 3.0
- [ ] Bug fixes

### Общее
- [ ] E2E тесты (Playwright)
- [ ] Unit тесты (Jest)
- [ ] CI/CD pipeline

---

## 🏗️ Архитектура Web

```
web/src/
├── api/                    # API клиенты
│   ├── client.ts
│   ├── tasks.ts
│   ├── habits.ts
│   ├── folders.ts
│   └── types.ts           ✅ [NEW] реэкспорт типов
├── pages/                  # Страницы приложения
│   ├── Dashboard.tsx      ✅ [NEW]
│   ├── Tasks.tsx
│   ├── Habits.tsx
│   ├── Login.tsx
│   └── Calendar.tsx       🚧 [TODO]
├── components/             # Переиспользуемые компоненты
│   ├── TaskCard.tsx
│   ├── HabitTable.tsx
│   ├── HabitModal.tsx
│   ├── TaskModal.tsx
│   ├── DeleteModal.tsx
│   └── ...
├── styles/                 # CSS модули
│   ├── variables.css
│   ├── global.css
│   ├── dashboard.css      ✅ [NEW]
│   ├── habits.css
│   └── tasks.css
└── utils/                  # Утилиты
    ├── dateUtils.ts
    └── habitUtils.ts
```

---

## 🔧 Conventions

### Импорты типов
```typescript
// ✅ Правильно — прямые импорты
import type { Task } from '../api/tasks';
import type { Habit, HabitRecord } from '../api/habits';

// ❌ Неправильно — через types.ts (устаревший подход)
import type { Task, Habit } from '../api/types';
```

### Структура страницы
```typescript
// 1. Импорты React/библиотек
import { useState, useEffect } from 'react';

// 2. Импорты типов
import type { Task } from '../api/tasks';

// 3. Импорты API
import { fetchTasks } from '../api/tasks';

// 4. Импорты компонентов
import TaskCard from '../components/TaskCard';

// 5. Импорты стилей (в main.tsx)
```

### Naming
- Страницы: `PascalCase.tsx` (Dashboard.tsx, Tasks.tsx)
- Компоненты: `PascalCase.tsx` (TaskCard.tsx, HabitTable.tsx)
- Стили: `kebab-case.css` (dashboard.css, habits.css)
- API: `camelCase.ts` (tasks.ts, habits.ts)

---

## 📊 Метрики

| Метрика | Значение |
|---------|----------|
| Страниц реализовано | 3/5 (Dashboard, Tasks, Habits) |
| Компонентов | 12+ |
| Строк кода (web) | ~3000 |
| Покрытие типами | 85% |

---

## 📝 История

| Дата | Событие |
|------|---------|
| 2026-04-30 | Начало миграции Dashboard |
| 2026-05-01 | Dashboard завершен, исправлены импорты |
| 2026-05-01 | Обновлена документация |
| 2026-05-02 | **Dashboard: полная локализация на русский**
| 2026-05-02 | Добавлены просроченные и завтрашние задачи
| 2026-05-02 | Добавлены цветные приоритеты (зелёный/оранжевый/красный)
| 2026-05-02 | Добавлен Week Grid виджет
| 2026-05-02 | Добавлен Upcoming Event виджет с таймером
| 2026-05-02 | Добавлена анимация выполнения задачи
| 2026-05-02 | Добавлена кнопка "Показать ещё"
| 2026-05-02 | Новый empty state с конфетти
| 2026-05-02 | Habit circles — цветные круги с названиями привычек
| 2026-05-02 | Актуализирована документация |

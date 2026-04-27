# Mind & Motion — Архитектура веб-клиента

*Версия: апрель 2026*  
*Расположение: `apps/web/`, ветка `web-review`*

---

## Общая схема

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Browser   │────▶│   React + Vite App    │────▶│   Axios Client  │────▶│  mindandmotion.ru   │
│             │     │   (localhost:3001)    │     │   (apiClient)   │     │  /api (VPS Beget)   │
└─────────────┘     └─────────────────────┘     └─────────────────┘     └─────────────────────┘
                           │                            │
                           ▼                            ▼
                    ┌─────────────┐              ┌──────────────┐
                    │ localStorage│              │ Bearer Token │
                    │  mm_token   │              │   (JWT)      │
                    └─────────────┘              └──────────────┘
```

**Dev-режим:** Vite proxy `/api` → `http://localhost:5000` (если запущен локальный бэкенд).

**Продакшн:** фронт на `localhost:3001` обращается к `https://mindandmotion.ru/api`.

---

## Структура src/

```
src/
├── api/              ← HTTP-клиент и API-модули по доменам
├── components/       ← React-компоненты (карточки, модалки, таймеры)
├── context/          ← Глобальные контексты (Auth, Banner)
├── pages/            ← Страницы приложения (Tasks, Habits, Login)
├── styles/           ← CSS-файлы по доменам (tasks.css, habits.css)
├── App.tsx           ← Корневой компонент с роутингом
├── index.css         ← Глобальные стили
└── main.tsx          ← Точка входа
```

---

## Auth-флоу

**Где хранится токен:** `localStorage`, ключи `app-auth-token` или `mm_token`.

**Как передаётся:** Axios request interceptor добавляет `Authorization: Bearer <token>` ко всем запросам (`src/api/client.ts:17`).

**Проверка при старте:** `App.tsx:27` читает токен и устанавливает `isAuthenticated`. Если токена нет — редирект на `/login`.

**Что происходит при 401:**
1. Response interceptor (`client.ts:30`) ловит 401
2. Удаляет все токены из localStorage
3. `window.location.href = '/login'` — полная перезагрузка страницы

**AuthContext:** создаёт контекст для хранения user-объекта, но на практике не используется — вся логика в `App.tsx` и `localStorage`.

---

## Роутинг

| Маршрут | Компонент | Доступ | Комментарий |
|---------|-----------|--------|-------------|
| `/login` | `Login` | Публичный | Редирект на `/tasks` если авторизован |
| `/register` | `Register` (заглушка) | Публичный | Заглушка — Register (coming soon) |
| `/` | `Dashboard` (заглушка) | Защищённый | Заглушка — Dashboard (coming soon) |
| `/tasks` | `Tasks` | Защищённый | Полный CRUD задач |
| `/habits` | `Habits` | Защищённый | Полный CRUD привычек |
| `/calendar` | `Calendar` (заглушка) | Защищённый | Заглушка — Calendar (coming soon) |
| `/profile` | `Profile` (заглушка) | Защищённый | Заглушка — Profile (coming soon) |
| `/secret-chat` | `SecretChat` (заглушка) | Защищённый | Заглушка — Secret Chat (coming soon) |

**Защита:** `<Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>` — все дочерние роуты требуют авторизации.

---

## API-слой

### client.ts

- **BASE_URL:** `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`
- **Перехватчики:**
  - Request: добавляет `Authorization: Bearer <token>`
  - Response: при 401 — разлогин и редирект

### Как добавить новый API-модуль

1. Создать `src/api/[module].ts` по шаблону `tasks.ts` или `habits.ts`
2. Определить TypeScript интерфейсы для сущностей
3. Написать `adaptFromAPI()` — snake_case → camelCase
4. Написать `adaptForAPI()` — camelCase → snake_case (⚠️ в том формате который ждёт бэкенд!)
5. Экспортировать CRUD-функции

**Паттерн адаптеров:**
```typescript
// Бэкенд может вернуть любой вариант:
field: raw.field ?? raw.field_name ?? raw.fieldName ?? default
```

**Важно:** перед написанием адаптера — смотреть `backend/routes/[module].js` чтобы понять как бэкенд валидирует поля.

---

## Глобальные контексты

| Контекст | Файл | Назначение |
|----------|------|------------|
| `AuthContext` | `context/AuthContext.tsx` | Хранит `user` и `isAuthenticated`, методы `login/logout`. На практике логика в `App.tsx`. |
| `BannerContext` | `context/BannerContext.tsx` | Глобальные баннеры-таймеры: `habit-timer` и `focus-session`. Позволяет таймеру выживать при смене вкладок. |

**BannerContext используется в:**
- `Layout.tsx:21` — получает `banner` для рендера `GlobalTimerBanner`
- `HabitTable.tsx` — вызывает `showBanner()` для запуска таймера привычки
- `TaskCard.tsx` — вызывает `showBanner()` для фокус-сессии

---

## Зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `react` | ^18.3.1 | Фреймворк |
| `react-dom` | ^18.3.1 | Рендеринг |
| `react-router-dom` | ^6.22.0 | Роутинг |
| `axios` | ^1.6.8 | HTTP-клиент |
| `date-fns` | ^3.3.0 | Работа с датами |
| `lucide-react` | ^0.300.0 | Иконки |
| `vite` | ^5.0.8 | Сборка |
| `@vitejs/plugin-react` | ^4.2.1 | Vite плагин для React |
| `typescript` | ^5.3.3 | Типизация |

---

## Что планируется добавить

| Фича | Статус | Приоритет | Комментарий |
|------|--------|-----------|-------------|
| **Dashboard** | ❌ Не начато | 🔴 Высокий | Главная страница после входа — заглушка |
| **Calendar** | ❌ Не начато | 🔴 Высокий | Навигация в меню ведёт на заглушку |
| **Profile** | ❌ Не начато | 🟡 Средний | Настройки пользователя |
| **Register** | ❌ Не начато | 🟡 Средний | Регистрация — заглушка с редиректом |
| **Secret Chat** | ❌ Не начато | 🟢 Низкий | Фича из мобильной версии |
| **Birthdays** | ❌ Не начато | 🟡 Средний | API есть, но страницы нет (`/api/birthdays`) |
| **PWA** | ❌ Не начато | 🟢 Низкий | Service Worker, offline support |
| **Tests** | ❌ Не начато | 🟢 Низкий | Ни unit, ни e2e тестов |

---

## Технические детали

### Лейаут

**Desktop:** Sidebar слева (`Layout.tsx:91`), фиксированная ширина.

**Mobile:** Top header + bottom nav (`Layout.tsx:55-143`), гамбургер-меню для дополнительных пунктов.

### Модалки

**Desktop:** Центрированное окно, `transform: translate(-50%, -50%)`.

**Mobile:** Bottom sheet, `position: fixed; bottom: 0; border-radius: 20px 20px 0 0`.

Определение через `const isMobile = window.innerWidth < 768`.

### Стилизация

- Без CSS-препроцессоров — чистый CSS
- CSS-переменные для цветовой схемы
- Адаптивность через медиа-запросы `@media (max-width: 768px)`

### Загрузка данных

Паттерн в `Tasks.tsx` и `Habits.tsx`:
```typescript
const loadData = useCallback(async () => { ... }, [year, month]);
useEffect(() => { loadData(); }, [loadData]);
```

После любой мутации — `await loadData()` для синхронизации с бэкендом.

---

*Файл создан на основе: App.tsx, api/*.ts, components/Layout.tsx, context/*.tsx, vite.config.ts, WEB_TRANSFER_GUIDE.md, AGENTS.md*

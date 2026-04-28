# Технический аудит репозитория Mind & Motion

**Дата аудита:** 27 апреля 2026  
**Цель:** Полный обзор структуры репозитория без изменения кода

---

## 1. Общая структура репозитория

```
E:\ProjectMM\
├── .gitignore                 # Корневой gitignore
├── package-lock.json          # Корневой lock-файл (пустой, 105 bytes)
├── web/                       # Основной веб-клиент (Vite + React)
├── mobile/                    # React Native мобильное приложение (Expo)
├── backend/                   # Node.js/Express API сервер
├── docs/                      # Документация проекта (GitBook/сайт)
├── habits-app/                # Легаси веб-приложение (HTML/CSS/JS)
└── tg-bot/                    # Telegram-бот (уведомления)
```

---

## 2. Анализ web/ (Веб-клиент)

### 2.1. Стек и зависимости

**Технологический стек:**
- **Фреймворк:** React 18.3.1 + TypeScript 5.3.3
- **Сборщик:** Vite 5.0.8
- **Роутинг:** React Router DOM 6.22.0
- **HTTP-клиент:** Axios 1.6.8
- **Даты:** date-fns 3.3.0
- **Иконки:** lucide-react 0.300.0

**package.json scripts:**
```bash
npm run dev      # vite --port 3001 (development)
npm run build    # tsc && vite build (production build)
npm run preview  # vite preview (preview build)
```

### 2.2. Конфигурационные файлы

| Файл | Назначение |
|------|------------|
| `package.json` | Зависимости и скрипты |
| `vite.config.ts` | Конфиг Vite: порт 3001, proxy /api → localhost:5000, alias `@/` |
| `index.html` | Точка входа HTML, подключает `/src/main.tsx` |
| `.env` | `VITE_API_URL=https://mindandmotion.ru/api` |
| `.env.production` | `VITE_API_URL=https://mindandmotion.ru/api` |
| `.windsurfrules` | Правила для AI-ассистента Windsurf |

### 2.3. Структура src/

```
src/
├── main.tsx              # Точка входа React
├── App.tsx               # Корневой компонент с роутами
├── api/                  # API слой
│   ├── client.ts         # Настроенный axios instance
│   ├── habits.ts         # API привычек + адаптеры
│   └── tasks.ts          # API задач + подзадач + папок + адаптеры
├── components/           # React компоненты (15 шт)
│   ├── ConfirmModal.tsx
│   ├── DatePicker.tsx
│   ├── DeleteModal.tsx
│   ├── FocusModal.tsx
│   ├── FolderChips.tsx
│   ├── GlobalTimerBanner.tsx   # Глобальный таймер-баннер
│   ├── HabitModal.tsx          # Модалка создания/редактирования привычки
│   ├── HabitTable.tsx          # Таблица привычек (основной UI)
│   ├── HabitTimerBanner.tsx    # Баннер таймера для привычек (6KB, полнофункциональный)
│   ├── HabitTrendChart.tsx     # График трендов привычек
│   ├── HoursEditModal.tsx
│   ├── Layout.tsx              # Основной лейаут с навигацией
│   ├── TaskCard.tsx              # Карточка задачи с подзадачами
│   ├── TaskModal.tsx             # Модалка создания/редактирования задачи
│   └── TimePicker.tsx
├── context/              # React Context
│   ├── AuthContext.tsx   # Аутентификация (localStorage token)
│   └── BannerContext.tsx # Глобальные таймеры-баннеры
├── pages/                # Страницы приложения
│   ├── Habits.tsx        # Страница привычек
│   ├── Login.tsx         # Страница входа
│   └── Tasks.tsx         # Страница задач
├── styles/               # CSS стили
│   ├── global.css        # Глобальные стили
│   ├── habits.css        # Стили привычек (34KB)
│   ├── tasks.css         # Стили задач (46KB)
│   └── variables.css     # CSS переменные тем
└── utils/                # Утилиты
    └── habitUtils.ts     # Вспомогательные функции для привычек
```

### 2.4. Точка входа и запуск

**Точка входа:** `src/main.tsx`
```typescript
- React 18 createRoot
- BrowserRouter с флагами v7_startTransition, v7_relativeSplatPath
- AuthProvider (обёртка контекста аутентификации)
- Подключение variables.css и global.css
```

**Запуск development:**
```bash
cd E:\ProjectMM\web
npm install
npm run dev  # http://localhost:3001
```

**Продакшен сборка:**
```bash
npm run build  # Выход: dist/ с sourcemap
```

### 2.5. Маршруты (роуты)

**Определены в:** `src/App.tsx`

| Маршрут | Компонент | Требует авторизации | Статус |
|---------|-----------|---------------------|--------|
| `/login` | `Login` | Нет | ✅ Реализован |
| `/register` | `Register` (заглушка) | Нет | ⚠️ Заглушка |
| `/` | `Dashboard` (заглушка) | Да | ⚠️ Заглушка |
| `/tasks` | `Tasks` | Да | ✅ Реализован |
| `/habits` | `Habits` | Да | ✅ Реализован |
| `/calendar` | `Calendar` (заглушка) | Да | ⚠️ Заглушка |
| `/profile` | `Profile` (заглушка) | Да | ⚠️ Заглушка |
| `/secret-chat` | `SecretChat` (заглушка) | Да | ⚠️ Заглушка |
| `*` | Редирект на `/` или `/login` | - | ✅ |

**Примечание:** Защищённые роуты обёрнуты в `<Layout />` с боковой/нижней навигацией.

### 2.6. Аутентификация

- **Хранилище:** localStorage (`app-auth-token`)
- **Проверка:** При монтировании App.tsx читается токен
- **Редиректы:** Неавторизованных на `/login`, авторизованных с `/login` на `/tasks`
- **API:** Bearer токен в axios interceptors

### 2.7. Архитектура таймеров

```
BannerContext (глобальный стейт)
    ↓
Layout.tsx (рендерит GlobalTimerBanner)
    ↓
GlobalTimerBanner.tsx (UI + логика таймера)
    ↓
Триггеры: HabitTable (long-press), TaskCard (focus button)
```

**Типы баннеров:**
- `habit-timer` — таймер для привычек с unit='Часы'
- `focus-session` — обратный отсчёт для задач

---

## 3. Анализ backend/

### 3.1. Стек и зависимости

**Технологический стек:**
- **Фреймворк:** Express 4.18.2
- **База данных:** MySQL2 (mysql2/promise)
- **Аутентификация:** JWT (jsonwebtoken), bcryptjs
- **Email:** Nodemailer
- **CORS:** Разрешены localhost:3001 и mindandmotion.ru

**package.json scripts:**
```bash
npm start    # node server.js (production)
npm run dev  # nodemon server.js (development)
```

### 3.2. Структура

```
backend/
├── server.js              # Точка входа, Express app
├── db.js                  # MySQL2 pool с timezone '+00:00' (UTC)
├── initDB.js              # Инициализация таблиц
├── emailService.js        # Сервис отправки email
├── middleware/
│   └── auth.js            # JWT middleware
├── routes/                # API эндпоинты
│   ├── auth.js            # /api/login, /api/register, /api/verify-code
│   ├── birthdays.js       # /api/birthdays
│   ├── folders.js         # /api/folders
│   ├── habits.js          # /api/habits
│   ├── policies.js        # /api/policies
│   ├── secretChat.js      # /api/secret-chat
│   ├── subtaskActions.js  # /api/subtasks/:id/toggle, delete
│   ├── subtasks.js        # /api/tasks/:taskId/subtasks
│   ├── tasks.js           # /api/tasks
│   └── users.js           # /api/user/*
└── utils/
    └── (1 файл)
```

### 3.3. API маршруты

| Маршрут | Файл | Эндпоинты |
|---------|------|-----------|
| `/api` | auth.js | POST /login, /register, /verify-code, /resend-code, /logout, /forgot-password, /reset-password |
| `/api/user` | users.js | GET /profile, PUT /profile, PUT /password |
| `/api/tasks` | tasks.js | CRUD задач, POST /:id/focus, PUT /:id/stop-recurring |
| `/api/tasks/:taskId/subtasks` | subtasks.js | GET, POST подзадач |
| `/api/subtasks` | subtaskActions.js | PUT /:id/toggle, DELETE /:id |
| `/api/habits` | habits.js | GET, POST, PUT, DELETE, PUT /reorder, PUT /:id/archive |
| `/api/folders` | folders.js | GET, POST, PUT, DELETE |
| `/api/birthdays` | birthdays.js | GET, POST, PUT, DELETE |
| `/api` | secretChat.js | /secret-chat/* |
| `/api` | policies.js | /policies/accept, /announcements |

**CORS:** Разрешены origin `http://localhost:3001` и `https://mindandmotion.ru`

**Порт:** `process.env.PORT || 3000` (по умолчанию 3000)

---

## 4. Анализ mobile/

### 4.1. Стек и зависимости

**Технологический стек:**
- **Фреймворк:** React Native 0.76.9 + Expo SDK 52
- **Навигация:** React Navigation 7 (bottom-tabs, native-stack)
- **Хранилище:** Expo SecureStore (зашифрованное)
- **HTTP:** Axios 1.6.8
- **Даты:** moment-timezone
- **UI:** react-native-draggable-flatlist, react-native-gesture-handler, react-native-reanimated
- **Локальная БД:** expo-sqlite
- **Нотификации:** expo-notifications
- **Биометрия:** expo-local-authentication

**package.json scripts:**
```bash
npm start      # expo start
npm run android  # expo run:android
npm run ios    # expo run:ios
npm run web    # expo start --web
```

### 4.2. Структура src/

```
mobile/src/
├── components/        # React Native компоненты (26 шт)
├── contexts/          # Context (2 шт)
│   ├── AuthContext.js
│   └── TimerContext.js
├── hooks/             # Кастомные хуки (2 шт)
├── navigation/        # Настройка навигации
├── screens/           # Экраны приложения (13 шт)
│   ├── AppLockScreen.js
│   ├── CalendarScreen.js
│   ├── DashboardScreen.js
│   ├── ForgotPasswordScreen.js
│   ├── HabitsScreen.js
│   ├── LoginScreen.js
│   ├── NotificationSettingsScreen.js
│   ├── ProfileScreen.js
│   ├── RegisterScreen.js
│   ├── SecretChatScreen.js
│   ├── SettingsScreen.js
│   ├── TasksScreen.js
│   └── TasksScreen.js.save
├── services/          # API сервисы (5 шт)
├── styles/            # Стили (0 файлов — inline?)
├── theme/             # Темы (5 шт)
└── utils/             # Утилиты (8 шт)
```

### 4.3. Особенности mobile vs web

| Параметр | Mobile | Web |
|----------|--------|-----|
| **Хранилище токена** | SecureStore (шифрованное) | localStorage |
| **Base URL** | IP адрес (192.168.1.35:5000) | mindandmotion.ru/api |
| **Drag-and-drop** | react-native-draggable-flatlist | HTML5 DnD (ограниченно) |
| **Нотификации** | expo-notifications | ❌ Нет |
| **Биометрия** | expo-local-authentication | ❌ Нет |
| **Offline** | expo-sqlite (кеширование) | ❌ Нет |
| **Экраны** | 13 полных экранов | 3 реализовано, 6 заглушек |

---

## 5. Анализ habits-app/ (Легаси)

**Тип:** Статический веб-сайт (HTML/CSS/JS без фреймворка)

**Структура:**
```
habits-app/
├── index.html           # Основной файл (93KB) — монолитный
├── Zadachi.html         # Страница задач (82KB)
├── auth.js              # Авторизация (27KB)
├── tasks-api.js         # API клиент (12KB)
├── common.css           # Общие стили (27KB)
├── habits.css           # Стили привычек (24KB)
├── tasks.css            # Стили задач (27KB)
├── header.html/css/js   # Компонент шапки
├── privacy.html         # Политика
├── terms.html           # Условия
├── AGENTS.md            # Документация
└── web/                 # (2 элемента)
```

**Статус:** Легаси, не используется в production (заменён на web/).

⚠️ **Примечание по файлам habits-app/:**
- `tasks.css` — фактический размер: 46KB (не 27KB)
- `index.html` — фактический размер: ~91KB (93542 байт)
- Папка `web/` внутри `habits-app/` — возможно удалена

---

## 6. Анализ docs/ (Документация)

**Структура:**
```
docs/ (ветка: docs, локально: E:\ProjectMM\docs)
├── AGENTS.md            # Общая документация проекта
├── REPO_MAP.md          # Карта репозитория
├── README.md            # Описание структуры docs/
├── STATUS.md            # Статус проекта
├── ARCHITECTURE.md      # Архитектура web
├── DOMAIN.md            # Доменная модель
├── HABITS_AUDIT.md      # ← (файл называется так, не "Аудит привычек.md")
├── ANALYSIS.md
├── MIGRATION.md
├── MIGRATION_PRIORITIES.md
├── WEB_TRANSFER_GUIDE.md
├── .windsurf/           # ← внутри docs/, не в корне репозитория
│   ├── rules/
│   │   ├── 00-project.md
│   │   ├── 01-web.md
│   │   ├── 02-mobile.md
│   │   └── 03-backend.md
│   └── workflows/       # ← Windsurf automation workflows
├── .agent/              # ← внутри docs/, не в корне репозитория
│   ├── wiki/
│   │   ├── domain.md
│   │   ⚠️ mobile-screens.md ← НЕ СУЩЕСТВУЕТ (запланирован)
│   │   ⚠️ api.md ← НЕ СУЩЕСТВУЕТ (запланирован)
│   └── spec/
│       ├── feature-parity.md
│       └── tasks.md
├── prompts/             # AI промпты
├── runbooks/            # Инструкции по деплою
├── audit/               # Технические аудиты
├── handoffs/            # Шаблоны отчётов
└── workflow/            # Workflow документация
```

---

## 7. Сводка по реализованным фичам

### 7.1. Web (web/) — Готово ✅

- [x] Авторизация (login, logout, localStorage)
- [x] Задачи: CRUD, приоритеты, дедлайны, папки
- [x] Подзадачи: создание, toggle, удаление
- [x] Привычки: таблица, записи, дни недели
- [x] Таймеры: глобальный баннер для часов и фокус-сессий
- [x] Drag-and-drop для привычек (reordering)
- [x] Адаптеры snake_case ↔ camelCase
- [x] Адаптивный UI (mobile + desktop)

### 7.2. Web — Заглушки ⚠️

- [ ] Dashboard (главная страница)
- [ ] Calendar (календарь)
- [ ] Profile (профиль пользователя)
- [ ] Secret Chat (секретный чат)
- [ ] Register (регистрация)

### 7.3. Backend — Полный API ✅

Все основные эндпоинты реализованы:
- Авторизация (JWT, верификация email, сброс пароля)
- Задачи (CRUD, рекуррентность, фокус-сессии)
- Привычки (CRUD, записи, архивация, reorder)
- Папки, подзадачи, дни рождения, секретный чат

### 7.4. Mobile — Полное приложение ✅

Все 13 экранов реализованы включая:
- Dashboard
- Calendar
- Profile
- Secret Chat
- Notification Settings
- Settings

---

## 8. Вопросы и неясности ❓

### 8.1. Конфигурация TypeScript

- ❓ В apps/web нет файла `tsconfig.json` — TypeScript компилируется через `tsc && vite build`, но где настройки?
- ❓ Возможно, tsconfig.json в `.gitignore` или используется дефолт Vite?

### 8.2. Расхождения API

- ❓ Web использует `/api` с proxy на localhost:5000 (dev) и mindandmotion.ru (prod)
- ❓ Mobile использует IP 192.168.1.35:5000 — это жёстко закодировано?
- ❓ Как происходит синхронизация URL между mobile и web?

### 8.3. Хранилище токена

- ❓ Web: localStorage (`app-auth-token`) — простой, но уязвим для XSS
- ❓ Mobile: SecureStore — безопасно
- ❓ Нет механизма refresh token — токен живёт вечно?

### 8.4. Заглушки в web

- ❓ Dashboard, Calendar, Profile, Secret Chat — планируется ли импорт из mobile?
- ❓ Register — API есть, UI заглушка — почему не реализовано?

### 8.5. Дублирование кода

- ❓ `habits-app/` — легаси, но содержит tasks-api.js — нужно ли оно?
- ❓ Есть ли план удаления habits-app/ после полного перехода на apps/web?

### 8.6. База данных

- ❓ Backend использует MySQL с timezone '+00:00' (UTC)
- ❓ Web конвертирует время локально — есть ли гарантия корректности?
- ❓ В `db.js` нет обработки reconnect при обрыве соединения

### 8.7. Секретный чат

- ❓ В web заглушка, в mobile полная реализация
- ❓ API routes/secretChat.js есть — почему не используется в web?

### 8.8. Версионирование API

- ❓ Нет версий в URL (/api/v1/...)
- ❓ Как обеспечивается совместимость mobile и web с backend?

### 8.9. Тестирование

- ❓ Нет тестов ни в одном проекте (нет jest, vitest, cypress)
- ❓ Как происходит QA?

### 8.10. Деплой

- ❓ Production URL: https://mindandmotion.ru/api
- ❓ Как деплоится backend? (Docker? PM2?)
- ❓ Есть ли CI/CD pipeline?

---

## 9. Рекомендации

1. **Удалить habits-app/** — полностью заменён web/
2. **Добавить tsconfig.json** в web/ для явной конфигурации TypeScript
3. **Унифицировать базовый URL** — вынести в переменные окружения для mobile
4. **Реализовать refresh tokens** — повысить безопасность
5. **Добавить тесты** — минимум unit-тесты для адаптеров (snake_case ↔ camelCase)
6. **Документировать API** — Swagger/OpenAPI для backend
7. **Импортировать экраны** из mobile в web/ для Dashboard, Calendar, Profile

---

*Аудит завершён. Никаких изменений в код не внесено.*

# Mind & Motion — Общий контракт для AI-агентов

> **Читай этот файл первым.** Детали — в `.windsurf/rules/` и `.agent/`.\
> Последнее обновление: 27.04.2026

---

## Суть проекта

**Mind & Motion** — приложение-органайзер для личной продуктивности.
Функции: задачи с подзадачами, привычки с трекером, календарь, фокус-сессии, дни рождения, профиль.

**Аудитория:** Один владелец-разработчик + AI-агент как co-pilot.

**Платформы:**
- 📱 Android-приложение (React Native + Expo) — **готово, в продакшне**
- 🌐 Веб + PWA (React + Vite) — **в активной разработке, ветка `web-review`**
- 🖥️ Backend (Node.js + Express + MySQL) — **готов, на VPS Beget**

---

## ⚠️ СТРУКТУРА ПРОЕКТА — ЕДИНСТВЕННАЯ ИСТИНА

> Эта таблица — абсолютный источник правды о структуре. Не угадывать, не предполагать.

| Локальная папка | GitHub ветка | Назначение |
|---|---|---|
| `E:\Mobile app = web + web ios\apps\web` | `web-review` | Рабочий React/Vite web + PWA |
| `E:\Mobile app = web + web ios\backend` | `backend` | Node.js backend |
| `E:\Mobile app = web + web ios\mindandmotion-mobile` | `mobile-dev3.0` | React Native Android |
| `E:\Mobile app = web + web ios\habits-app` | `web-dev` | Старая версия (архив, не трогать) |
| `E:\Mobile app = web + web ios\docs` | `docs` | Агентная документация, правила Windsurf |

### Критические правила по путям

1. **Диск E: — ЗАГЛАВНАЯ буква.** Всегда `E:\`, никогда `e:\`
2. **Пробелы в пути** — путь `E:\Mobile app = web + web ios` содержит пробелы и `=`. Всегда оборачивать в двойные кавычки
3. **Никогда не угадывать путь** — использовать только пути из этой таблицы
4. **git-операции** — выполнять из корня нужной папки (не из подпапки)

---

## ⚠️ ПРАВИЛА ТЕРМИНАЛА (PowerShell на Windows)

> Windsurf работает в PowerShell. Bash-синтаксис здесь не работает.

### Запрещено (сломает выполнение)
```powershell
# ❌ НЕ использовать && (это bash, не PowerShell)
cd "E:\путь" && git status

# ❌ НЕ использовать e:\ (маленькая буква диска)
cd "e:\Mobile app = web + web ios"
```

### Правильный синтаксис
```powershell
# ✅ Каждую команду — отдельной строкой
Set-Location "E:\Mobile app = web + web ios\apps\web"
git status

# ✅ Или через точку с запятой (;) — не &&
Set-Location "E:\Mobile app = web + web ios\docs"; git status

# ✅ cd тоже работает, но Set-Location надёжнее с пробелами в пути
Set-Location -LiteralPath "E:\Mobile app = web + web ios\apps\web"
```

### Переходы по папкам проекта
```powershell
# Web (ветка web-review)
Set-Location "E:\Mobile app = web + web ios\apps\web"

# Docs (ветка docs)
Set-Location "E:\Mobile app = web + web ios\docs"

# Backend (ветка backend)
Set-Location "E:\Mobile app = web + web ios\backend"

# Mobile (ветка mobile-dev3.0)
Set-Location "E:\Mobile app = web + web ios\mindandmotion-mobile"
```

---

## Стек

| Платформа | Технологии | Ветка | Локальный путь |
|-----------|------------|-------|----------------|
| **Web+PWA** | React 18 + Vite + React Router + TypeScript | `web-review` | `E:\Mobile app = web + web ios\apps\web` |
| **Mobile** | React Native + Expo (bare workflow) | `mobile-dev3.0` | `E:\Mobile app = web + web ios\mindandmotion-mobile` |
| **Backend** | Node.js + Express + MySQL (mysql2) | `backend` | `E:\Mobile app = web + web ios\backend` (локально) / `/var/www/backend/` на VPS |
| **Docs** | Markdown | `docs` | `E:\Mobile app = web + web ios\docs` |

---

## API — Base URL и авторизация

```
Base URL: https://mindandmotion.ru/api
Auth:     Bearer <JWT token>

Web:    токен в localStorage ключ 'mm_token'
Mobile: токен в SecureStore через storage.js
```

---

## Все эндпоинты

```
# Авторизация
POST /auth/login               { email, password } → { token, user }
POST /auth/register            { email, password, name } → { token, user }
POST /auth/send-verification-code  { email }
POST /auth/verify-code         { email, code, ... }
POST /auth/forgot-password     { email }
POST /auth/reset-password      { email, code, newPassword }

# Задачи
GET    /api/tasks              ?month=&year= или ?folder_id=
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
PUT    /api/tasks/:id/stop-recurring
POST   /api/tasks/:id/focus
GET    /api/tasks/stats

# Подзадачи
GET    /api/tasks/:id/subtasks
POST   /api/tasks/:id/subtasks
PUT    /api/tasks/:taskId/subtasks/:subtaskId
DELETE /api/tasks/:taskId/subtasks/:subtaskId

# Папки
GET    /api/folders
POST   /api/folders
PUT    /api/folders/:id
DELETE /api/folders/:id
PUT    /api/folders/reorder

# Привычки
GET    /api/habits             ?year=&month=
POST   /api/habits
PUT    /api/habits/:id
DELETE /api/habits/:id
GET    /api/habits/records/:year/:month
POST   /api/habits/records
DELETE /api/habits/records/:habitId/:year/:month/:day
PUT    /api/habits/reorder

# Дни рождения и события
GET    /api/birthdays
POST   /api/birthdays
PUT    /api/birthdays/:id
DELETE /api/birthdays/:id

# Профиль
GET    /api/user/profile
PUT    /api/profile
PUT    /api/profile/password
```

---

## Сущности (типы данных)

```typescript
User:    { id, email, name, created_at }

Task:    { id, user_id, title, date, deadline, time, priority(0-3),
           done, done_date, comment,
           isrecurring, recurrencetype, recurrencevalue, isgenerated, templateid,
           folderid, focussessions, subtasks_count }

Subtask: { id, task_id, title, completed, created_at }

Folder:  { id, user_id, name, emoji, order_index }

Habit:   { id, user_id, name, unit, plan, target_type,
           start_date, end_date, days_of_week(JSON), order_index }

HabitRecord: { id, habit_id, user_id, year, month, day, value(float) }

Birthday: { id, user_id, name, day, month, year, type, notify_before }
```

### snake_case ↔ camelCase маппинг

MySQL отдаёт snake_case, JS использует camelCase. Защитные цепочки обязательны:

```js
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.isrecurring  ?? 0
task.doneDate    ?? task.done_date    ?? null
```

---

## Коды ошибок API

| Код | Значение | Действие |
|-----|----------|----------|
| `401` | Токен истёк / невалиден | Разлогинить, редирект на login |
| `422` | Ошибка валидации | Показать inline-ошибку |
| `500` | Серверная ошибка | Показать toast с сообщением |

---

## 🔒 ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ ДОКУМЕНТАЦИИ

> **Это не рекомендации — это закон.** Каждая завершённая сессия обязана обновить документацию.
> Агент НЕ считается выполнившим задачу, пока документация не актуализирована.

### Триггеры → Файлы (что обновлять и когда)

| Что изменилось | Обязательно обновить | Формат |
|---|---|---|
| Любая завершённая задача | `docs/STATUS.md` | строка в таблице: ✅/🔄/❌ + дата |
| Завершённая рабочая сессия | `docs/handoffs/YYYY-MM-DD_описание.md` | копия `docs/handoffs/TEMPLATE.md` |
| Новый API-эндпоинт | `AGENTS.md` → раздел "Все эндпоинты" | строка в блоке кода |
| Изменена схема БД (новая таблица/поле) | `docs/DOMAIN.md` | таблица сущностей |
| Новый runbook / паттерн | `docs/REPO_MAP.md` | строка в разделе навигации |
| Добавлена новая env-переменная | `.env.example` | строка с комментарием |
| Изменён деплой / инфра | `docs/runbooks/deploy-backend.md` или `deploy-web-vps.md` | соответствующий раздел |
| Изменена структура папок | `AGENTS.md` → таблица структуры | строка в таблице |
| Баг + фикс найден | `docs/STATUS.md` | строка + ссылка на коммит |

### Формат записи в STATUS.md

```markdown
| YYYY-MM-DD | ✅ Название задачи | Ветка | Краткое описание что сделано |
```

Статусы: `✅` — готово, `🔄` — в процессе, `❌` — отменено, `⚠️` — заблокировано

### Формат handoff-файла

Имя файла: `docs/handoffs/YYYY-MM-DD_краткое-описание.md`
Шаблон: `docs/handoffs/TEMPLATE.md` — **обязательно использовать структуру из него**.

### Правило атомарности

Один коммит документации = одна завершённая задача.
НЕ накапливать несколько задач в один doc-коммит без явной причины.

### Правило "docs first" при новой фиче

Перед реализацией новой фичи:
1. Создать `docs/specs/FEATURE_NAME.md` с описанием цели, acceptance criteria, edge cases
2. Получить подтверждение владельца
3. Только после этого приступать к коду

Шаблон spec-файла:
```markdown
# Spec: [Название фичи]
## Цель
## Acceptance criteria
- [ ] критерий 1
- [ ] критерий 2
## Edge cases
## Затрагиваемые файлы
## Риски
```

---

## Законы (нарушение = поломка проекта)

### Git
1. **Пуш web-изменений только в `web-review`**
2. **Пуш mobile-изменений только в `mobile-dev3.0`**
3. **Пуш backend-изменений только в `backend`**
4. **Пуш документации только в `docs`**
5. **Читать SHA файла перед обновлением** — иначе конфликт
6. **Не создавать `.save`, `.bak`, `*_copy` и другие мусорные файлы**
7. **Батч-пуш**: не делать несколько коммитов там, где можно один

### Код (общие для всех платформ)
8. **Не угадывать структуру файла** — всегда читать перед редактированием
9. **Не затирать существующие функции** — только добавлять/изменять нужное
10. **API-запросы** — всегда проверять токен, обрабатывать 401
11. **Оптимистичный UI**: мутировать state сразу, откатывать при ошибке API

### Документация
12. **После завершения задачи** — обновить `docs/STATUS.md`
13. **Если добавлен новый API-эндпоинт** — обновить `AGENTS.md`
14. **Если изменена схема БД** — обновить `docs/DOMAIN.md`
15. **Каждая сессия** — создать handoff-файл в `docs/handoffs/`
16. **Новая фича** — начинать с `docs/specs/FEATURE_NAME.md`
17. **Новая env-переменная** — добавить в `.env.example` с комментарием

---

## Паттерн выполнения задач (Windsurf / Cascade)

Для каждого запроса:
1. Перечитать релевантные docs и текущий код.
2. Предложить пошаговый план (какие файлы трогаем).
3. Ждать подтверждения владельца.
4. Выполнять по шагам — каждый шаг с кратким описанием.
5. **В конце: обязательно обновить документацию согласно протоколу выше.**

---

## Шаблоны промптов

### Новая фича
> Цель: [что нужно]\
> Домен: [habits / tasks / timers / auth]\
> Файлы: [src/pages/X, src/api/Y]\
> Ограничения: не менять [Z], сохранить поведение [N]
>
> Задача: создать spec → план → подтверждение → реализация по шагам → обновить docs

### Багфикс
> Ожидаемое поведение: [...]\
> Текущее поведение: [...]\
> Где проявляется: [страница/компонент]
>
> Задача: найти причину → предложить варианты → фикс после выбора → обновить STATUS.md

### Рефакторинг
> Цель: упростить [область], не меняя бизнес-поведение\
> Задача: оценить проблемы → план → реализация по шагам → handoff

---

## Terminal safety (Windsurf)

Разрешено без подтверждения:
- ls, dir, pwd, cat, echo
- npm run dev / build / preview
- git status, git log, git diff

Требует подтверждения:
- npm install / uninstall
- git add / commit / push
- Удаление файлов (rm, Remove-Item)
- Массовые mv/rename операции

Запрещено:
- Менять .env без явной инструкции
- Добавлять новые env-переменные молча
- Переключать ветки без явной команды владельца

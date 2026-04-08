# Web — контекст для AI

> Читать вместе с корневым `AGENTS.md` (там полный роадмап и все эндпоинты)

## Стек
- Vanilla HTML + CSS + JS (без фреймворков)
- Локально: `E:\Web\habits-app`, на VPS: `/var/www/habits-app`
- Ветка: `web-dev`
- API Base URL: `https://mindandmotion.ru/api`

## Структура файлов
```
habits-app/
├── index.html          # Привычки (Privychki)
├── Zadachi.html        # Задачи
├── Privychki.html      # Привычки (алиас или отдельная)
├── Kalendar.html       # Календарь
├── auth.js             # Авторизация (login/register/logout/token)
├── tasks-api.js        # API-обёртки для задач, папок, подзадач
├── common.css          # Общие стили, переменные, темизация
├── tasks.css           # Стили страницы задач
├── habits.css          # Стили страницы привычек
├── header.html         # Шапка (подгружается динамически)
├── header.css          # Стили шапки
├── header-loader.js    # Загрузчик шапки
├── privacy.html        # Политика конфиденциальности
└── terms.html          # Пользовательское соглашение
```

## Авторизация
- Токен: `localStorage.getItem('mm_token')`
- После логина: сохранить токен, редирект на `index.html`
- Проверка токена: в начале каждой страницы через `auth.js`
- `401` от API → `auth.logout()` → редирект на login

## Паттерн API-запроса
```js
async function apiRequest(method, url, body = null) {
  const token = localStorage.getItem('mm_token');
  const res = await fetch(`https://mindandmotion.ru/api${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 401) { auth.logout(); return; }
  return res.json();
}
```

## tasks-api.js — что уже реализовано
```js
// Задачи
fetchTasks(folderId?)   // GET /api/tasks?folder_id=
createTask(data)        // POST /api/tasks
updateTask(id, data)    // PUT /api/tasks/:id
deleteTask(id)          // DELETE /api/tasks/:id
stopRecurringTask(id)   // PUT /api/tasks/:id/stop-recurring
addFocusSession(id)     // POST /api/tasks/:id/focus
fetchTaskStats()        // GET /api/tasks/stats

// Папки
fetchFolders()          // GET /api/folders
createFolder(name)      // POST /api/folders
updateFolder(id, name)  // PUT /api/folders/:id
deleteFolder(id)        // DELETE /api/folders/:id

// Подзадачи
fetchSubtasks(taskId)                       // GET /api/tasks/:id/subtasks
createSubtask(taskId, title)                // POST /api/tasks/:id/subtasks
toggleSubtask(taskId, subtaskId, completed) // PUT /api/tasks/:taskId/subtasks/:subtaskId
deleteSubtask(taskId, subtaskId)            // DELETE /api/tasks/:taskId/subtasks/:subtaskId

// Адаптеры snake_case ↔ camelCase
adaptTaskFromAPI(task)  // API → JS (snake → camel, с защитными цепочками)
adaptTaskForAPI(task)   // JS → API (camel → snake)
```

## Дизайн-система
- Тёмная тема основная (как в мобилке)
- CSS-переменные в `common.css`
- Акцент: золотистый/янтарный (`--color-accent`)
- Шрифт: системный sans-serif
- `border-radius`: 10–16px на карточках

## Законы (нельзя нарушать)
1. Все цвета только через CSS-переменные из `common.css`
2. API-запросы только через `tasks-api.js` или паттерн выше (с проверкой токена)
3. Пуш только в ветку `web-dev`
4. Читать SHA файла перед обновлением через `get_file_contents`
5. Не создавать `.save` и другие мусорные файлы
6. Не затирать существующие функции — только добавлять/изменять нужное
7. Мобайл: `font-size` минимум 16px, контейнер `width: 100%` на `< 768px`

## ✅ Что сделано (web-dev)
- [x] `tasks-api.js` — полный API-слой (задачи, папки, подзадачи, фокус, статистика)
- [x] `Zadachi.html` — viewport meta, подключён `tasks-api.js`
- [x] `AGENTS.md` корневой — полный роадмап всего проекта
- [x] `web/AGENTS.md` — актуализирован

## 🔄 Текущий этап — Этап 1 (Задачи: подключить UI к API)
- [ ] Sidebar папок: загрузка `fetchFolders()`, добавить/переименовать/удалить
- [ ] Фильтрация задач по папке: `fetchTasks(folderId)`
- [ ] Убрать `saveTasks()` / `/api/tasks/sync` → заменить на `updateTask()` из `tasks-api.js`
- [ ] Подзадачи в строке задачи: раскрывающийся список, toggle, добавить/удалить
- [ ] Кнопка «Стоп» на повторяющейся задаче → `stopRecurringTask(id)`
- [ ] Помодорро финиш → `addFocusSession(id)` вместо прямого fetch

## 📱 Этап 2 — Мобайл-фиксы
- [ ] `<meta viewport>` добавить во ВСЕ HTML-страницы
- [ ] `.app-shell` → убрать `max-width: 1200px` на мобайле, `width: 100%`
- [ ] Минимальный шрифт 16px для всех `input`, `button`, `select`, `textarea` (iOS не зумит)
- [ ] Таблица задач → карточки на мобайле (`< 768px`)

## Следующие этапы — см. корневой AGENTS.md
- Этап 3: Привычки (Privychki.html)
- Этап 4: Календарь (Kalendar.html)
- Этап 5: Dashboard
- Этап 6: Профиль и настройки

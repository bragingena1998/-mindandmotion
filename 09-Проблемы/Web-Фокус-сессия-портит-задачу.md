---
tags: [problem, web, data-integrity]
platform: web
status: resolved
severity: critical
discovered: 2026-07-23
discovered-by: "аудит паритета mobile vs web (агент, Tasks)"
resolved-date: 2026-07-23
---

# Сохранение фокус-сессии на web может стереть остальные поля задачи

`web/src/components/TaskCard.tsx:153-163` (`handleFocusSave`) при завершении фокус-таймера вызывает общий `updateTask(task.id, { focusSessions: task.focusSessions + 1 })` — **не** выделенный `POST /tasks/:id/focus`, который использует mobile (`mobile/src/screens/TasksScreen.js:1302-1307`, атомарный инкремент на бэкенде: `backend/routes/tasks.js:411-425`).

Проблема: `adaptTaskForAPI` (`web/src/api/tasks.ts:145-181`) строит **полный** payload из того, что ему передали. Раз передано только `focusSessions`, остальные поля уходят как `undefined`/дефолты (`title: undefined`, `date: null`, `done: false`, `priority: 2`, `folderId: null`, `isRecurring: false` и т.д.). Бэкенд же (`backend/routes/tasks.js:356-367`) делает **полный UPDATE всех колонок**, не частичный patch.

Результат клика "Сохранить" после фокус-сессии на вебе:
- либо запрос падает (`title=undefined` как bind-параметр MySQL), тихо проглатывается пустым `catch {}`,
- либо реально проходит и **стирает** `done`, `priority`, `folderId`, `isRecurring` задачи до дефолтных значений — включая случайную разотметку выполненной задачи и отвязку от папки/рекуррентности.

## Что сделано

Добавлена `addFocusSession(taskId)` в `web/src/api/tasks.ts`, вызывающая напрямую `POST /tasks/:id/focus`. `TaskCard.tsx:handleFocusSave` переведён на неё вместо общего `updateTask` — коммит `250bc4db` в `web`. Билд проверен (`npm run build` проходит).

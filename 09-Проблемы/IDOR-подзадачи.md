---
tags: [problem, security, backend]
platform: backend
status: open
severity: high
discovered: 2026-07-22
discovered-by: "аудит кода при переносе документации в vault"
---

# IDOR: подзадачи не проверяют владение задачей

`routes/subtasks.js` и `routes/subtaskActions.js` проверяют только валидный JWT (любого пользователя) через `authenticateToken`, но **нигде не проверяют**, что `task_id`/`subtask.id` принадлежит `req.userId`.

**Сценарий эксплуатации:** зная `id` чужой подзадачи (последовательные автоинкрементные id — легко перебрать), авторизованный пользователь A может читать/переключать/удалять подзадачи пользователя B через `GET /api/tasks/:taskId/subtasks`, `PUT /api/subtasks/:id/toggle`, `DELETE /api/subtasks/:id`.

**Затронутые роуты:**
- `GET /api/tasks/:taskId/subtasks`
- `POST /api/tasks/:taskId/subtasks`
- `PUT /api/tasks/:taskId/subtasks/:subtaskId`
- `DELETE /api/tasks/:taskId/subtasks/:subtaskId`
- `PUT /api/subtasks/:id/toggle`
- `DELETE /api/subtasks/:id`

**Фикс:** в каждом роуте добавить проверку `JOIN tasks ON subtasks.task_id = tasks.id WHERE tasks.user_id = req.userId` (или отдельный подзапрос) перед выполнением операции — по аналогии с тем, как это уже сделано в `routes/tasks.js` (DELETE `/:id` проверяет `user_id`).

См. общую архитектуру — [[01-Backend/Текущее-состояние]].

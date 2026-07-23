---
tags: [problem, web]
platform: web
status: open
severity: medium
discovered: 2026-07-23
discovered-by: "аудит паритета mobile vs web (агент, Dashboard)"
---

# Web/Dashboard: "Запланировано" считается не так, как на mobile

Не баг видимости (см. [[Web-Dashboard-молчит-при-ошибке-API]]), а неверная логика подсчёта даже когда всё загрузилось успешно.

- **Mobile** (`taskDayStats.js:34-57`, `countTodayPlanTotal`): считает задачи, выполненные сегодня (по `doneDate`) ИЛИ открытые задачи, чей диапазон дат включает сегодня, ИЛИ просроченные.
- **Web** (`Dashboard.tsx:356`, `todayTasks.length + completedToday`): `todayTasks` (`Dashboard.tsx:68-72`) фильтрует строго `task.date === today && !task.done` — точное совпадение одного дня, без учёта `deadline`/диапазона, без просроченных.

Итог: любая многодневная задача (`date` ≠ `deadline`) или просроченная задача **никогда не попадает** в статистику "запланировано" на web, хотя на mobile попадает. Цифры "% дня выполнено" на двух платформах не сопоставимы для одних и тех же данных.

Та же проблема с точным совпадением дня — в недельном мини-графике (`buildWeekGrid`, `Dashboard.tsx:166-181`, `t.date?.slice(0,10) === dateStr`).

## Что нужно

Переписать подсчёт на диапазонную логику (`date` → `deadline`), как в `getTaskStatus`/`dateInRange` на mobile, вместо точного сравнения одной даты — для стата "Запланировано" и для недельного графика.

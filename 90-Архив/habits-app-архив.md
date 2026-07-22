---
tags: [archive, habits-app]
status: frozen
verified-date: 2026-07-22
---

# habits-app — архивная веб-версия

Статичный HTML/CSS/JS без сборки/фреймворка: `index.html` (~93.5 КБ), `Zadachi.html` (~82.5 КБ), `terms.html`, `privacy.html`, `header.html`, `tasks.css`, `common.css`, `habits.css`, `header.css`, `auth.js`, `tasks-api.js`, `header-loader.js`, `FEATURES.md`.

Git-ветка — `web-dev`, remotes `origin` и `beget` (старый хостинг).

**Подтверждено на 2026-07-22: не используется в текущем деплое.** Единственный след — комментарии-атрибуции в `web/src/styles/*.css` ("Global styles from habits-app/common.css" и т.п.) — новый `web/` унаследовал стили по содержанию (переписаны заново под React/Vite), но не подключает и не деплоит файлы `habits-app` напрямую. Не трогать, не запускать, не копировать код без явной причины.

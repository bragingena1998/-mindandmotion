# 01 — Web + PWA

> Контекст для задач в ветке `web-review`.
> Читать вместе с `00-project.md` и `AGENTS.md`.

---

## Стек

- **Framework:** React 18 + Vite
- **Роутинг:** React Router v6
- **Стили:** CSS-модули или Tailwind (уточнить у владельца)
- **API:** fetch с базовым URL `https://mindandmotion.ru/api`
- **Auth:** JWT в `localStorage` ключ `mm_token`
- **Ветка:** `web-review`

> ⚠️ Перед первой задачей — прочитай корневую структуру ветки `web-review` через `get_file_contents`.

---

## Авторизация — паттерн

```js
// Получить токен
const token = localStorage.getItem('mm_token');

// API-запрос
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
  if (res.status === 401) {
    localStorage.removeItem('mm_token');
    window.location.href = '/login';
    return;
  }
  return res.json();
}
```

---

## Оптимистичный UI (обязателен для toggle/update)

```js
// 1. Сохранить старое состояние
const prev = [...tasks];
// 2. Обновить UI сразу
setTasks(tasks.map(t => t.id === id ? {...t, done: 1} : t));
// 3. Запрос к API
try {
  await apiRequest('PUT', `/api/tasks/${id}`, { done: 1 });
} catch {
  // 4. Откат при ошибке
  setTasks(prev);
  showToast('❌ Ошибка. Изменения отменены.');
}
```

---

## PWA — требования

- `manifest.json` с именем, иконками, `display: standalone`
- `theme_color` = `#020617` (тёмная тема)
- Service Worker с кешированием shell (Workbox или ручной)
- Offline-страница для отсутствия сети
- iOS: `<meta name="apple-mobile-web-app-capable" content="yes">`
- iOS: `<link rel="apple-touch-icon" ...>`
- Safe area для iPhone: `env(safe-area-inset-*)` в CSS

---

## Адаптивность (обязательно)

```css
/* Минимум на каждой странице */
@media (max-width: 768px) {
  /* Нет горизонтального скролла */
  body { overflow-x: hidden; }
  /* Минимальный шрифт — iOS не зумит на input */
  input, button, select, textarea { font-size: 16px; }
  /* Safe area для iPhone */
  .app-container {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
```

**Breakpoints:**
- Mobile: `< 768px` → карточки в колонку, bottom nav
- Tablet: `768px – 1024px` → 2 колонки
- Desktop: `> 1024px` → sidebar + основной контент

---

## CSS-переменные (дизайн-система)

```css
:root {
  --color-bg:       #020617;   /* фон страницы */
  --color-surface:  #0f172a;   /* фон карточек */
  --color-accent:   #f59e0b;   /* золотой акцент */
  --color-accent-text: #020617; /* текст на акценте */
  --color-text:     #e2e8f0;   /* основной текст */
  --color-text-muted: #94a3b8; /* второстепенный */
  --color-border:   rgba(148,163,184,0.15); /* граница */
  --color-danger:   #ef4444;   /* удаление, ошибки */
  --color-success:  #22c55e;   /* выполнено, ок */
  --radius-card:    12px;
  --radius-btn:     8px;
}
```

> Никогда не хардкодить цвета напрямую — только через переменные.

---

## Компоненты — что уже есть (уточнить у владельца)

> ⚠️ Прочитай структуру `apps/web/src/components/` перед созданием нового компонента.
> Возможно, нужный компонент уже существует.

---

## Законы (web-специфичные)

1. **`<meta name="viewport">`** — обязателен на каждой HTML-странице
2. **Минимальный font-size 16px** на мобайле для всех полей ввода
3. **Токен только в `localStorage`** ключ `mm_token` (не sessionStorage, не cookie)
4. **Пуш только в `web-review`** — не в `web-dev`, не в `main`
5. **Responsive** — всё должно работать на iPhone SE (375px)

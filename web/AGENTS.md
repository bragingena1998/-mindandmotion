# Web — контекст для AI

> Читать вместе с корневым `AGENTS.md`

## Стек
- Vanilla HTML + CSS + JS (без фреймворков)
- Файлы: `E:\Web\habits-app` (локально), `/var/www/habits-app` (VPS)
- Ветка: `web-dev`

## Структура файлов
```
habits-app/
├── index.html          # Привычки (главная страница)
├── Zadachi.html        # Задачи
├── auth.js             # Авторизация (login/register/logout/token)
├── tasks-api.js        # API-обёртки для задач
├── common.css          # Общие стили, переменные, темизация
├── tasks.css           # Стили страницы задач
├── habits.css          # Стили страницы привычек
├── header.html         # Шапка (подгружается динамически)
├── header.css          # Стили шапки
├── header-loader.js    # Загрузчик шапки
├── privacy.html        # Политика конфиденциальности
└── terms.html          # Пользовательское соглашение
```

## Авторизация на вебе
- Токен: `localStorage.getItem('mm_token')`
- После логина: сохранить токен, редирект на `index.html`
- Проверка токена: в начале каждой страницы через `auth.js`
- 401 от API → `auth.logout()` → редирект на login

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

## Дизайн-система
- Тёмная тема основная (как в мобилке)
- CSS-переменные в `common.css` (аналог `colors.*` из ThemeContext)
- Акцент: золотистый/янтарный (`--color-accent`)
- Шрифт: системный sans-serif
- border-radius: 10-16px на карточках

## Законы (нельзя нарушать)
1. Все цвета только через CSS-переменные из `common.css`
2. API-запросы только через обёртку с проверкой токена
3. Пуш только в ветку `web-dev`
4. Читать SHA файла перед обновлением
5. Мусорные файлы (`.save`) не создавать и удалять

## Приоритеты разработки
1. Мобильная адаптация (iPhone Safari, safe-area, touch UX)
2. Подзадачи + папки для задач
3. Цикличные задачи
4. Календарь с DayPanel
5. PWA (manifest + service worker)

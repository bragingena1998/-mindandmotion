---
tags: [problem, tech-debt, mobile]
platform: mobile
status: open
discovered: 2026-07-22
discovered-by: "аудит кода при переносе документации в vault"
---

# Технический долг — Mobile

## Мёртвый код от миграции MMKV → SQLite
`utils/tasksCache.js` импортирует `react-native-mmkv`, которого нет ни в `package.json`, ни в `node_modules` — упадёт при использовании. Файл нигде не импортируется, но лежит в репозитории. Удалить.

## Мёртвый навигатор
`navigation/AppNavigator.js` не используется (реальная навигация — инлайн в `App.js`), содержит устаревшую структуру табов (Tasks/Habits/Profile, без Dashboard). Удалить или явно пометить как черновик.

## Баг: `secureGet` не экспортирован
`AppLockScreen.js` импортирует `secureGet` из `services/appLock.js`, но там функция объявлена без `export`. Импорт даёт `undefined`, вызов падает и проглатывается пустым `catch{}` — длина PIN всегда дефолтная (4), не подстраивается под реально настроенную. Добавить `export` к функции.

## Мусорный файл в git
`screens/TasksScreen.js.save` — закоммиченный бэкап (396 строк) с моковыми данными. Удалить из репозитория.

## Неподключённый черновик
`src/examples/TasksScreenExample.js` — черновик рефакторинга `TasksScreen` под `useLocalFirstTasks`, нигде не импортируется. Либо доделать и внедрить, либо удалить.

## `BASE_URL` — несохранённое изменение
`services/api.js`: на диске `https://mindandmotion.ru/api`, но в git всё ещё закоммичен `http://85.198.96.149:5000/api` (`git status` показывал `M src/services/api.js` на момент аудита). Нужно решить, какое значение верное, и закоммитить.

## Отладочные логи в syncQueue
`utils/syncQueue.js`: `console.trace()` в `enqueue()` и обильный `console.log` в `flush()` — похоже на незавершённую отладку синхронизации, не убранную из продакшн-кода.

## Путаница в названии `DataSyncContext`
Название предполагает полноценный менеджер синхронизации, но по факту это просто счётчик ререндера (`tick`/`bumpAll()`). Реальная офлайн-синхронизация — в `syncQueue.js`/`useLocalFirst.js`. При следующей ревизии стоит переименовать контекст (например, в `RefreshBumpContext`) во избежание путаницы.

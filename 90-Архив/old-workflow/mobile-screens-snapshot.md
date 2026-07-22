---
tags: [archive, snapshot, mobile-screens]
status: stale
---

# Снимок: экраны mobile → перенос на web (из `docs/.agent/wiki/mobile-screens.md`)

> Снимок без даты (контекст указывает на апрель 2026). Список реальных экранов мобильного приложения на тот момент и статус их переноса на web. Актуальность экранов и статуса переноса — см. свежий аудит [[02-Mobile/Текущее-состояние]] и [[03-Web/Текущее-состояние]].

| Экран (mobile/src/screens/) | Статус в web на момент записи |
|---|---|
| DashboardScreen.js | ⚠️ Заглушка (устарело — Dashboard на web сейчас реализован) |
| TasksScreen.js | ✅ Реализован |
| HabitsScreen.js | ✅ Реализован |
| CalendarScreen.js | ⚠️ Заглушка |
| ProfileScreen.js | ⚠️ Заглушка |
| LoginScreen.js | ✅ Реализован |
| RegisterScreen.js | ⚠️ Заглушка (API есть) |
| SettingsScreen.js | ⚠️ Заглушка |
| SecretChatScreen.js | ⚠️ Заглушка |
| NotificationSettingsScreen.js | ⚠️ Заглушка |
| AppLockScreen.js | ⚠️ Заглушка |
| ForgotPasswordScreen.js | ⚠️ Заглушка |

Заявленный на тот момент приоритет переноса: Dashboard → Register → Profile → Calendar.

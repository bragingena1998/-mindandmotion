# Mobile Screens — Референс для переноса на Web

> Описание всех экранов React Native приложения.
> Используется как референс при реализации аналогичных экранов в web/.

## Список экранов (mobile/src/screens/)

| Экран | Файл | Статус в Web |
|-------|------|--------------|
| Dashboard | DashboardScreen.js | ⚠️ Заглушка |
| Tasks | TasksScreen.js | ✅ Реализован |
| Habits | HabitsScreen.js | ✅ Реализован |
| Calendar | CalendarScreen.js | ⚠️ Заглушка |
| Profile | ProfileScreen.js | ⚠️ Заглушка |
| Login | LoginScreen.js | ✅ Реализован |
| Register | RegisterScreen.js | ⚠️ Заглушка (API есть) |
| Settings | SettingsScreen.js | ⚠️ Заглушка |
| Secret Chat | SecretChatScreen.js | ⚠️ Заглушка |
| Notifications | NotificationSettingsScreen.js | ⚠️ Заглушка |
| App Lock | AppLockScreen.js | ⚠️ Заглушка |
| Forgot Password | ForgotPasswordScreen.js | ⚠️ Заглушка |

## Приоритет переноса

1. Dashboard — главная страница после логина
2. Register — форма регистрации (API уже есть)
3. Profile — редактирование профиля
4. Calendar — таблица с датами привычек/задач

> Детальные описания фич — в .agent/spec/feature-parity.md

# Mobile — контекст для AI

> Читать вместе с корневым `AGENTS.md`
> Полный контекст мобилки: `AI_CONTEXT.md` в корне этой ветки

## Стек
- React Native + Expo SDK (Bare Workflow)
- Ветка: `mobile-dev3.0`
- Тестирование: Expo Dev Client на Android
- Сборка: EAS Build (preview APK)
- Опубликовано: RuStore (на модерации)

## Структура
```
src/
├── screens/      # Экраны: TasksScreen, HabitsScreen, CalendarScreen,
│             # DashboardScreen, ProfileScreen, SettingsScreen,
│             # LoginScreen, RegisterScreen, NotificationSettingsScreen
├── components/   # Button, Input, Modal, Card, AlertModal,
│             # TimePicker, DatePicker, HabitTable, TabBar
├── contexts/     # ThemeContext (colors.*)
├── services/     # api.js (axios + JWT), storage.js (SecureStore)
└── theme/        # Цветовые темы
```

## Ключевые паттерны
- Токен: SecureStore (не AsyncStorage)
- Цвета: `const { colors } = useTheme()` — никогда хардкод
- Оптимистичный UI: обновить state → API → rollback при ошибке
- Списки: FlatList + getItemLayout (не ScrollView)
- Уведомления: только в собранном APK

## Текущий статус
- ✅ Этапы 1-4 завершены (задачи, папки, привычки, календарь)
- ✅ Опубликовано в RuStore (на модерации)
- Техдолг: удалить `TasksScreen.js.save`, добавить `danger2` в темы

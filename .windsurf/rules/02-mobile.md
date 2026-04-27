# 02 — Mobile (React Native + Expo)

> Контекст для задач в ветке `mobile-dev3.0`.
> Читать вместе с `00-project.md` и `AGENTS.md`.
> Последнее обновление: 27.04.2026

---

## Стек

- **Framework:** React Native + Expo (bare workflow)
- **Навигация:** React Navigation
- **Хранилище:** Expo SecureStore через `src/services/storage.js`
- **API:** fetch через `src/services/api.js`
- **Темизация:** ThemeContext → `src/contexts/ThemeContext.js`
- **Ветка:** `mobile-dev3.0`
- **Статус:** в продакшне на Android

---

## Структура src/

```
src/
├── screens/             — экраны приложения
│   ├── HabitsScreen.js  — привычки (источник правды для web)
│   ├── TasksScreen.js   — задачи (источник правды для web)
│   ├── CalendarScreen.js
│   ├── ProfileScreen.js
│   └── LoginScreen.js
├── components/          — переиспользуемые компоненты
│   ├── HabitTable.js    — таблица-сетка привычек
│   ├── TaskCard.js      — карточка задачи
│   └── ...
├── services/
│   ├── api.js           — все API-запросы
│   └── storage.js       — SecureStore обёртка
├── contexts/
│   └── ThemeContext.js  — тёмная/светлая тема
└── theme/               — палитры цветов
```

---

## Авторизация — паттерн

```js
// storage.js
import * as SecureStore from 'expo-secure-store';
export const getToken = () => SecureStore.getItemAsync('mm_token');
export const setToken = (t) => SecureStore.setItemAsync('mm_token', t);
export const removeToken = () => SecureStore.deleteItemAsync('mm_token');

// api.js — использование
const token = await getToken();
const res = await fetch(`https://mindandmotion.ru/api${url}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Темизация

```js
// Использование темы в компоненте
const { colors } = useTheme();

// Ключевые цвета из theme/
colors.background    // фон
colors.surface       // карточки
colors.accent1       // золотой акцент (#f59e0b)
colors.text          // основной текст
colors.textSecondary // второстепенный
colors.danger        // удаление
```

---

## Правила работы с mobile

1. **Не ломать продакшн** — mobile в продакшне на Android, любое изменение должно быть безопасным
2. **Expo managed → bare**: не добавлять нативные модули без необходимости
3. **SecureStore** для токена — не AsyncStorage
4. **Стили** — StyleSheet.create(), не инлайн-объекты
5. **Тема** — только через useTheme(), не хардкодить цвета
6. **Навигация** — не нарушать стек навигатора

---

## Mobile как источник правды для Web

Эта ветка — **референс для переноса фич на web**.

Перед реализацией фичи на web:
1. Найди соответствующий экран в `src/screens/`
2. Найди компоненты в `src/components/`
3. Прочитай логику API-вызовов в `src/services/api.js`
4. Перенеси логику, адаптируй UI под web (RN-стили → CSS, TouchableOpacity → button/div)

**Маппинг экранов mobile → страниц web:**

| Mobile Screen | Web Page | Статус |
|--------------|----------|--------|
| HabitsScreen.js | pages/Habits.tsx | 🔄 частично |
| TasksScreen.js | pages/Tasks.tsx | 🔄 частично |
| CalendarScreen.js | pages/Calendar.tsx | ❌ не создана |
| ProfileScreen.js | pages/Profile.tsx | ❌ не создана |
| LoginScreen.js | pages/Login.tsx | ✅ готово |

# 02 — Mobile (React Native + Expo)

> Контекст для задач в ветке `mobile-dev3.0`.
> Читать вместе с `00-project.md` и `AGENTS.md`.

---

## Стек

- React Native + Expo SDK (bare workflow)
- Навигация: React Navigation (AuthStack / AppStack)
- Хранение токена: `SecureStore` через `src/services/storage.js`
- API: axios-инстанс в `src/services/api.js` (baseURL → Beget VPS)
- Темы: `ThemeContext` в `src/contexts/ThemeContext.js`
- Ветка: `mobile-dev3.0`

---

## Законы (нельзя нарушать)

1. **НЕЛЬЗЯ хардкодить цвета** — только `colors.X` из `useTheme()`
   - Исключение: `'#FFFFFF'` и `'#020617'` на акцентных/danger градиентах
2. **НЕЛЬЗЯ `ScrollView` для больших списков** — только `FlatList` с `getItemLayout`
3. **НЕЛЬЗЯ оборачивать модалки в `TouchableOpacity`** — только `Pressable`
4. **НЕЛЬЗЯ `initialScrollIndex` без `getItemLayout`** — зависание
5. **НЕЛЬЗЯ мутировать state напрямую** — только `setState(prev => ...)`
6. **НЕЛЬЗЯ API-запрос без оптимистичного обновления** (кроме создания)
7. **НЕЛЬЗЯ `Alert.alert` для инфо** — только `showToast()`. Alert только для деструктивных подтверждений
8. **НЕЛЬЗЯ нативный RN `Modal`** — только кастомный `Modal.js`
9. **НЕЛЬЗЯ забывать `useNativeDriver: true`** в анимациях без layout-изменений
10. **НЕЛЬЗЯ общий `Animated.Value` в state** для hover-списков — отдельный компонент
11. **НЕЛЬЗЯ `overflow: hidden` на контейнере модалки** — только на scroll-wrapper внутри

---

## Компоненты `src/components/`

| Компонент | Назначение |
|-----------|------------|
| `Background.js` | Обёртка-фон для всех экранов (обязательна) |
| `Button.js` | Пропы: `variant` (primary/secondary/outline/danger), `noBorder`, `loading` |
| `Input.js` | Проп `containerStyle` для переопределения внешнего контейнера |
| `Modal.js` | Кастомный. Pressable-backdrop, ScrollView внутри. Без `overflow:hidden` на контейнере |
| `AlertModal.js` | Подтверждение (да/нет) — для всех деструктивных действий |
| `HabitTable.js` | Таблица-сетка привычек. Пропы: `onHabitDelete`, `onHabitEdit` |
| `FocusSessionModal.js` | Таймер концентрации. Экспортирует `hasFocusSession`, `getFocusSession` |
| `TimePicker.js` | Барабан HH:MM. FlatList + getItemLayout |
| `TabBar.js` | Кастомный bottom tab bar |

---

## Дизайн-система

```js
// Получение цветов (обязательный паттерн)
const { colors } = useTheme();

// Основные переменные
colors.background      // фон экрана
colors.surface         // фон карточек/модалок
colors.accent1         // основной акцент (золотистый)
colors.accentText      // текст на акцентном фоне
colors.textMain        // основной текст
colors.textMuted       // второстепенный текст
colors.borderSubtle    // тонкая граница
colors.danger1         // красный
colors.ok1             // зелёный
```

**Темы:** default / storm / ice / blood / toxic / glitch

---

## Паттерн: оптимистичный UI

```js
const oldTasks = [...tasks];
setTasks(prev => prev.map(t => t.id === id ? {...t, done: 1} : t));
try {
  await tasksAPI.updateTask(id, { done: 1 });
} catch {
  setTasks(oldTasks);
  showToast('❌ Ошибка. Изменения отменены.');
}
```

---

## Деплой (Android)

```bash
# Тест на девайсе
npx expo start --dev-client

# Сборка APK (preview)
eas build --profile preview --platform android
```

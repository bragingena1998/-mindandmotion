# 🤖 AI_CONTEXT — Контекст проекта Mind&Motion для новых чатов

> **Читай этот файл первым делом.** Здесь вся информация для немедленной продуктивной работы.
> Последнее обновление: 15.03.2026

---

## 🧠 Суть проекта

**Mind&Motion** — мобильное приложение-органайзер (React Native + Expo) для личной продуктивности. Включает: задачи с подзадачами, привычки, календарь, концентрат-сессии (таймер фокуса), дни рождения, профиль. Бэкенд на Node.js + MySQL.

**Аудитория:** Один разработчик (владелец репо `bragingena1998`) + AI-ассистент в роли co-pilot разработчика.

---

## 🏗️ Архитектура

### Инфраструктура
- **Мобилка:** React Native + Expo SDK (Bare Workflow)
- **Бэкенд:** Node.js + Express, хостинг **Beget** (`var/www/backend/`)
- **БД:** MySQL на Beget, phpMyAdmin для ручных миграций
- **Тестирование:** Expo Dev Client на Android-устройстве
- **Уведомления:** Expo Notifications — работают ТОЛЬКО в собранном APK (не в Dev Client)
- **Live Activity:** только APK
- **Брандч разработки:** `mobile-dev3.0`

### Структура репозитория
```
/
├── App.js                    # Корень приложения, навигация AuthStack/AppStack
├── index.js                  # Точка входа Expo
├── app.json                  # Конфиг Expo (bundle ID, версия и т.д.)
├── eas.json                  # EAS Build конфиг (development / preview / production)
├── package.json
├── assets/                   # Иконки, splash, логотип
├── var/www/backend/          # Бэкенд (server.js и вся логика API)
├── src/
│   ├── components/           # Переиспользуемые компоненты
│   ├── contexts/             # React Contexts (ThemeContext и т.д.)
│   ├── navigation/           # Навигаторы (если вынесены)
│   ├── screens/              # Экраны приложения
│   ├── services/             # api.js, storage.js
│   └── theme/                # Цветовые темы
├── ROADMAP_v3.md             # Дорожная карта v3.0 (11 этапов)
├── DEVLOG_v3.md              # Журнал разработки v3.0
├── QA_v3.md                  # QA чеклист и баг-трекинг v3.0
└── AI_CONTEXT.md             # Этот файл
```

### src/components/
| Файл | Назначение |
|------|------------|
| `Background.js` | Обёртка-фон для всех экранов (градиент/цвет по теме) |
| `Button.js` | Основная кнопка (акцентный цвет из темы) |
| `Input.js` | Текстовое поле (стилизованное) |
| `Modal.js` | Модальное окно (скролл-шит снизу, Pressable-backdrop) |
| `Card.js` | Карточка |
| `AlertModal.js` | Модалка подтверждения (да/нет) |
| `DatePicker.js` | Нативный DatePicker через `react-native-modal-datetime-picker` |
| `DatePickerModal.js` | Старая версия (не используется активно) |
| `TimePicker.js` | Барабан HH:MM. FlatList + getItemLayout + disableIntervalMomentum |
| `FocusSessionModal.js` | Модалка концентрат-сессии: выбор времени → таймер. Экспортирует `hasFocusSession`, `getFocusSession` |
| `HabitTable.js` | Таблица-сетка привычек (дни × привычки) |
| `MonthPickerModal.js` | Пикер месяца/года |
| `ReorderHabitsModal.js` | Drag-переупорядочивание привычек |
| `TabBar.js` / `SimpleTabBar.js` | Кастомный таббар |

### src/screens/
| Файл | Назначение |
|------|------------|
| `LoginScreen.js` | Вход |
| `RegisterScreen.js` | Регистрация |
| `ForgotPasswordScreen.js` | Восстановление пароля |
| `TasksScreen.js` | **Главный экран задач** (самый большой ~1700 строк). Содержит: список задач, папки, drag&drop, подзадачи, фокус-сессии |
| `HabitsScreen.js` | Экран привычек (таблица + создание/редактирование) |
| `CalendarScreen.js` | Календарь (месячная сетка + события) |
| `ProfileScreen.js` | Профиль: имя, пароль, тема, уведомления, статистика |
| `SecretChatScreen.js` | Скрытый чат (личная фича) |

### src/services/
- `api.js` — axios-инстанс с baseURL на Beget, автоподстановка JWT-токена
- `storage.js` — обёртки над `SecureStore` (getToken, setToken, removeToken)

### src/contexts/
- `ThemeContext.js` — тёмная/светлая тема, объект `colors` с именованными переменными

---

## 🎨 Дизайн-система

### Темизация
Все цвета — через `const { colors } = useTheme()`. **Никогда не хардкодить цвета напрямую.**

Основные переменные:
```js
colors.background      // фон экрана
colors.surface         // фон карточек/модалок
colors.accent1         // основной акцент (золотистый)
colors.accentText      // текст на акцентном фоне
colors.accentBorder    // граница акцентная
colors.textMain        // основной текст
colors.textMuted       // второстепенный текст
colors.borderSubtle    // тонкая граница
colors.danger1         // красный (ошибки, удаление, просрочено)
colors.ok1             // зелёный (выполнено, сегодня)
```

### Стиль UI
- **Тёмная тема** основная. Светлая поддерживается.
- Скруглённые карточки (borderRadius 10-16)
- Акцентный цвет: золотистый/янтарный
- Текст в UPPERCASE для заголовков и лейблов
- Toast-уведомления (не Alert) для большинства действий
- Модалки через кастомный `Modal.js` (не нативный RN Modal)
- Фон: `Background.js` (обязательная обёртка каждого экрана)

---

## 🗄️ База данных (MySQL)

### Основные таблицы
```sql
users          (id, email, password_hash, name, ...)
tasks          (id, user_id, title, date, deadline, time, priority, done, done_date,
                comment, isrecurring, recurrencetype, recurrencevalue,
                isgenerated, templateid, folderid, focussessions, subtasks_count)
subtasks       (id, task_id, title, completed)
folders        (id, user_id, name, emoji, order_index, created_at)
habits         (id, user_id, name, ...)
habit_logs     (id, habit_id, date, completed)
birthdays      (id, user_id, name, day, month, year, type, notify_before)
```

### Именование полей
В MySQL поля в **snake_case** (`folder_id`, `is_recurring`). В JS-коде — **camelCase** (`folderId`, `isRecurring`). При маппинге использовать `??` цепочки:
```js
task.folderId ?? task.folder_id ?? null
task.isRecurring ?? task.is_recurring ?? task.isrecurring ?? 0
```

---

## 🔌 API (Backend)

Бэкенд: `var/www/backend/server.js`

### Основные роуты
```
POST   /auth/login
POST   /auth/register

GET    /tasks              ?month=&year= (пусто = текущий месяц)
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id
PUT    /tasks/:id/stop-recurring
POST   /tasks/:id/focus
GET    /tasks/stats        → {completed_today, total_today_plan, completed_week, ...}

GET    /tasks/:id/subtasks
POST   /tasks/:id/subtasks
PUT    /subtasks/:id/toggle
DELETE /subtasks/:id

GET    /folders
POST   /folders
PUT    /folders/:id
DELETE /folders/:id
PUT    /folders/reorder    body: {folders: [{id, order_index}]}

GET    /habits
... (аналогично)
```

---

## 🔧 Ключевые паттерны кода

### Оптимистичный UI
Всегда сначала обновляем state локально, потом делаем API-запрос. При ошибке — откатываем:
```js
setTasks(prev => prev.map(t => t.id === id ? {...t, folderId: newId} : t));
try { await tasksAPI.updateTask(id, payload); }
catch { setTasks(prev => prev.map(t => t.id === id ? {...t, folderId: oldId} : t)); }
```

### Gesture Handler (Drag & Drop)
Правило порядка: **PanGestureHandler снаружи, LongPressGestureHandler внутри.**
`simultaneousHandlers` связывают оба. Pan всегда enabled, dragTaskRef.current определяет активен ли drag:
```js
<PanGestureHandler ref={panRef} simultaneousHandlers={longPressRef} ...>
  <LongPressGestureHandler ref={longPressRef} simultaneousHandlers={panRef} minDurationMs={400} ...>
```

### Координаты через measure
`onLayout` даёт размеры относительно родителя. Для абсолютных координат нужен `ref.measure()`.
При асинхронных measure — использовать `setTimeout(..., 50)` чтобы layout точно завершился.

### Анимации
- Простые: `Animated.timing` / `Animated.spring`
- Hover-пульс: `Animated.loop` + отдельный компонент с собственным `Animated.Value` (не state!)
- `useNativeDriver: true` везде где нет layout-изменений

### Toast вместо Alert
Для не-деструктивных действий:
```js
showToast('✅ Задача выполнена!');
```
`Alert.alert` — только для деструктивных подтверждений (удаление) и критических ошибок.

### Модалки и скролл
Обёртка модалки — `Pressable` (не `TouchableOpacity`/`TouchableWithoutFeedback`), иначе перехватывает gesture-события у вложенных ScrollView/FlatList.

---

## 📋 Текущий статус (15.03.2026)

### Завершённые этапы
- ✅ **Этап 1** — Архитектура задач (TimePicker, DatePicker, цикличность, подзадачи, фокус-сессия, свайпы)
- ✅ **Этап 2** — Папки (CRUD, drag&drop, фильтрация, анимация)

### Следующий шаг
- **Этап 3** — Привычки: починить удаление, упростить форму, логика дат

### Техдолг
- TimePicker: шероховатости при быстром броске (не критично)
- `src/screens/TasksScreen.js.save` — мусорный файл, можно удалить

---

## 🤝 Правила работы с AI

### Стиль взаимодействия
- Общение **на русском** (кроме кода и технических терминов)
- AI действует как **co-pilot**: анализирует, предлагает, реализует
- Перед реализацией — кратко описать план (1-3 пункта), не перечислять очевидное
- Не переспрашивать по мелочам — если задача понятна, сразу делать
- Коммиты делать сразу в ветку `mobile-dev3.0` через GitHub MCP

### Работа с кодом
- Перед пушем больших файлов — сначала прочитать SHA текущего файла
- Всегда читать существующий файл перед редактированием (не угадывать структуру)
- Изменения в `TasksScreen.js` = пуш через `create_or_update_file` (файл большой, ~1700 строк)
- Когда несколько файлов — использовать `push_files` для одного коммита
- Не писать лишних комментариев в коде

### Документация
- После завершения этапа → обновить `DEVLOG_v3.md`, `ROADMAP_v3.md`, `QA_v3.md`
- После сессии → обновить `AI_CONTEXT.md` (этот файл)
- Формат записи в DEVLOG — строго по шаблону в конце файла

### Приоритеты
1. Не сломать то что работает
2. Оптимистичный UI везде где возможно
3. Производительность (FlatList > ScrollView для длинных списков)
4. Простой пользовательский опыт (меньше экранов/модалок, больше жестов)

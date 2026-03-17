# 🤖 AI_CONTEXT — Контекст проекта Mind&Motion для новых чатов

> **Читай этот файл первым делом.** Здесь вся информация для немедленной продуктивной работы.
> Последнее обновление: 17.03.2026

---

## 🧠 Суть проекта

**Mind&Motion** — мобильное приложение-органайзер (React Native + Expo) для личной продуктивности. Включает: задачи с подзадачами, привычки, календарь, концентрат-сессии (таймер фокуса), дни рождения, профиль. Бэкенд на Node.js + MySQL.

**Аудитория:** Один разработчик (владелец репо `bragingena1998`) + AI-ассистент в роли co-pilot разработчика.

---

## 🚫 ЗАКОНЫ — КАТЕГОРИЧЕСКИ НЕЛЬЗЯ

> Это не рекомендации. Это жёсткие правила. Нарушение = поломка проекта.

### Код
1. **НЕЛЬЗЯ хардкодить цвета** (`'#fff'`, `'black'` и т.д.). Только `colors.X` из `useTheme()`. Исключение: `'#FFFFFF'` и `'#020617'` для текста поверх акцентных/danger градиентов — допустимо.
2. **НЕЛЬЗЯ использовать `ScrollView` для списков** с динамическим или большим количеством элементов. Только `FlatList` с `getItemLayout`.
3. **НЕЛЬЗЯ оборачивать модалки в `TouchableOpacity` или `TouchableWithoutFeedback`** — перехватывают жесты у вложенных скроллов. Только `Pressable`.
4. **НЕЛЬЗЯ делать `initialScrollIndex` у FlatList** без `getItemLayout` — вызывает зависание.
5. **НЕЛЬЗЯ мутировать state напрямую** (`tasks.push(...)`, `task.done = true`). Только через `setState(prev => ...)`.
6. **НЕЛЬЗЯ делать API-запрос без оптимистичного обновления UI** (кроме создания новых сущностей).
7. **НЕЛЬЗЯ использовать `Alert.alert`** для информационных уведомлений. Только `showToast()`. `Alert` — только для деструктивных подтверждений.
8. **НЕЛЬЗЯ использовать нативный RN `Modal`** напрямую. Только кастомный `Modal.js`.
9. **НЕЛЬЗЯ забывать `useNativeDriver: true`** в анимациях где нет layout-изменений.
10. **НЕЛЬЗЯ использовать общий `Animated.Value` в state** для hover-анимаций на списках — только отдельный компонент со своим `Animated.Value`.

### Git и деплой
11. **НЕЛЬЗЯ пушить в `main` или `mobile-dev` напрямую.** Только в `mobile-dev3.0`.
12. **НЕЛЬЗЯ пушить файл без чтения его текущего SHA** (иначе конфликт и потеря данных).
13. **НЕЛЬЗЯ угадывать структуру существующего файла** — всегда читать перед редактированием.
14. **НЕЛЬЗЯ делать несколько коммитов когда можно один** — использовать `push_files` для батч-пуша.

### БД и API
15. **НЕЛЬЗЯ делать прямые SQL-миграции без записи в ROADMAP** (что добавлено/изменено в таблице).
16. **НЕЛЬЗЯ хранить JWT в AsyncStorage** — только в `SecureStore` через `storage.js`.
17. **НЕЛЬЗЯ делать DELETE без подтверждения** (`AlertModal.js`).

### Документация
18. **НЕЛЬЗЯ завершать этап без обновления** `DEVLOG_v3.md`, `ROADMAP_v3.md`, `QA_v3.md`.
19. **НЕЛЬЗЯ завершать сессию без обновления** `AI_CONTEXT.md` (этот файл).

---

## 🏗️ Архитектура

### Инфраструктура
- **Мобилка:** React Native + Expo SDK (Bare Workflow)
- **Бэкенд:** Node.js + Express, хостинг **Beget** (`var/www/backend/`)
- **БД:** MySQL на Beget, phpMyAdmin для ручных миграций
- **Тестирование:** Expo Dev Client на Android-устройстве
- **Уведомления:** Expo Notifications — работают ТОЛЬКО в собранном APK (не в Dev Client)
- **Live Activity:** только APK
- **Бранч разработки:** `mobile-dev3.0`

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
| `Button.js` | Основная кнопка. Пропы: `variant` (primary/secondary/outline/danger), `noBorder`, `loading`, `disabled` |
| `Input.js` | Текстовое поле. Проп `containerStyle` для переопределения внешнего контейнера (напр. `marginBottom: 0`) |
| `Modal.js` | Модальное окно (скролл-шит снизу, Pressable-backdrop) |
| `Card.js` | Карточка |
| `AlertModal.js` | Модалка подтверждения (да/нет) |
| `DatePicker.js` | Нативный DatePicker через `react-native-modal-datetime-picker` |
| `DatePickerModal.js` | Старая версия (не используется активно) |
| `TimePicker.js` | Барабан HH:MM. FlatList + getItemLayout + disableIntervalMomentum |
| `FocusSessionModal.js` | Модалка концентрат-сессии: выбор времени → таймер. Экспортирует `hasFocusSession`, `getFocusSession` |
| `HabitTable.js` | Таблица-сетка привычек (дни × привычки). Пропы: `onHabitDelete`, `onHabitEdit` |
| `MonthPickerModal.js` | Пикер месяца/года |
| `ReorderHabitsModal.js` | Drag-переупорядочивание привычек |
| `TabBar.js` / `SimpleTabBar.js` | Кастомный таббар |

### src/screens/
| Файл | Назначение |
|------|------------|
| `LoginScreen.js` | Вход |
| `RegisterScreen.js` | Регистрация |
| `ForgotPasswordScreen.js` | Восстановление пароля |
| `TasksScreen.js` | **Главный экран задач** (~1700 строк). Содержит: список задач, папки, drag&drop, подзадачи, фокус-сессии |
| `HabitsScreen.js` | Экран привычек (таблица + создание/редактирование/удаление с подтверждением) |
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
colors.danger2         // тёмно-красный (второй цвет градиента danger) — ⚠️ может отсутствовать в теме, Button использует danger1 как fallback
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

## 🗄️ База данных (MySQL) — полная схема

### Подключение
- Хост: Beget (MySQL сервер внутри хостинга)
- Управление вручную: **phpMyAdmin** (через панель Beget)
- Из кода: через `mysql2` в `server.js` (connection pool)
- Миграций нет — все изменения вручную через phpMyAdmin + запись в ROADMAP

### Полная схема таблиц

```sql
-- Пользователи
users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Задачи
tasks (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  title            VARCHAR(500) NOT NULL,
  date             DATE,
  deadline         DATE,
  time             VARCHAR(5),
  priority         INT DEFAULT 0,
  done             TINYINT(1) DEFAULT 0,
  done_date        DATE,
  comment          TEXT,
  isrecurring      TINYINT(1) DEFAULT 0,
  recurrencetype   VARCHAR(50),
  recurrencevalue  VARCHAR(50),
  isgenerated      TINYINT(1) DEFAULT 0,
  templateid       INT,
  folderid         INT,
  focussessions    INT DEFAULT 0,
  subtasks_count   INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Подзадачи
subtasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  task_id     INT NOT NULL,
  title       VARCHAR(500) NOT NULL,
  completed   TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)

-- Папки
folders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  emoji       VARCHAR(10) DEFAULT NULL,
  order_index INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Привычки
habits (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  name            VARCHAR(255) NOT NULL,
  unit            VARCHAR(50),
  plan            INT DEFAULT 1,
  target_type     VARCHAR(20) DEFAULT 'daily',
  start_date      DATE,
  end_date        DATE,
  days_of_week    JSON,
  order_index     INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Записи выполнения привычек
habit_records (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  habit_id  INT NOT NULL,
  user_id   INT NOT NULL,
  year      INT NOT NULL,
  month     INT NOT NULL,
  day       INT NOT NULL,
  value     FLOAT DEFAULT 0,
  UNIQUE KEY unique_record (habit_id, year, month, day),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
)

-- Дни рождения и личные события
birthdays (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  day           INT NOT NULL,
  month         INT NOT NULL,
  year          INT,
  type          VARCHAR(30) DEFAULT 'birthday',
  notify_before INT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

### Именование полей: MySQL ↔ JS
В MySQL поля в **snake_case** (`folder_id`, `is_recurring`). В JS-коде — **camelCase** (`folderId`, `isRecurring`).
Бэкенд иногда отдаёт snake_case, иногда нет — использовать защитные `??` цепочки:
```js
task.folderId    ?? task.folder_id    ?? null
task.isRecurring ?? task.is_recurring ?? task.isrecurring ?? 0
task.doneDate    ?? task.done_date    ?? null
```

---

## 🔌 API (Backend)

Бэкенд: `var/www/backend/server.js`

### Основные роуты
```
POST   /auth/login
POST   /auth/register
POST   /auth/forgot-password

GET    /tasks              ?month=&year=
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id
PUT    /tasks/:id/stop-recurring
POST   /tasks/:id/focus
GET    /tasks/stats

GET    /tasks/:id/subtasks
POST   /tasks/:id/subtasks
PUT    /subtasks/:id/toggle
DELETE /subtasks/:id

GET    /folders
POST   /folders
PUT    /folders/:id
DELETE /folders/:id
PUT    /folders/reorder

GET    /habits             ?year=&month=
POST   /habits
PUT    /habits/:id
DELETE /habits/:id        ?year=&month=
GET    /habits/records/:year/:month
POST   /habits/records
DELETE /habits/records/:habitId/:year/:month/:day
PUT    /habits/reorder

GET    /birthdays
POST   /birthdays
PUT    /birthdays/:id
DELETE /birthdays/:id

GET    /user/profile
PUT    /profile
PUT    /profile/password
```

---

## 🛠️ Рабочий процесс (Workflow)

### Схема работы AI + Разработчик

```
AI (этот чат)                          Разработчик (локально)
─────────────────────────────          ──────────────────────────────
1. Читает задачу                       1. Ставит задачу
2. Читает нужные файлы из GitHub       
3. Пишет/правит код                    
4. Пушит в mobile-dev3.0 (GitHub MCP)  
                                       2. git pull origin mobile-dev3.0
                                       3. Тестирует на телефоне (Dev Client)
                                       4. Сообщает результат
5. Обновляет документы                 
```

### Команды для разработчика (локально)

```bash
# Подтянуть изменения от AI:
git pull origin mobile-dev3.0

# Если конфликт:
git fetch origin
git reset --hard origin/mobile-dev3.0

# Запустить Dev Client:
npx expo start --dev-client

# Собрать APK (preview):
eas build --profile preview --platform android
```

### Деплой бэкенда на Beget

```bash
ssh username@hostname
cd /var/www/backend/
git pull origin mobile-dev3.0
pm2 restart server
pm2 logs server --lines 50
```

---

## 🔧 Ключевые паттерны кода

### Оптимистичный UI
```js
const oldId = task.folderId;
setTasks(prev => prev.map(t => t.id === id ? {...t, folderId: newId} : t));
try {
  await tasksAPI.updateTask(id, { folderId: newId });
} catch {
  setTasks(prev => prev.map(t => t.id === id ? {...t, folderId: oldId} : t));
  showToast('❌ Ошибка. Изменения отменены.');
}
```

### Button — важные пропы
```jsx
// Danger-кнопка без рамки (например, удаление в модале)
<Button title="Удалить" variant="danger" noBorder onPress={handleDelete} />

// Outline (отмена)
<Button title="Отмена" variant="outline" onPress={onClose} />
```

### Input — убрать отступ снизу (в строке с другим элементом)
```jsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Input
    placeholder="Значение"
    containerStyle={{ flex: 1, marginBottom: 0 }}
  />
  <TouchableOpacity ...>
    <Text>Тоггл</Text>
  </TouchableOpacity>
</View>
```

### Gesture Handler (Drag & Drop)
```js
// PanGestureHandler снаружи, LongPressGestureHandler внутри
<PanGestureHandler ref={panRef} simultaneousHandlers={longPressRef}>
  <Animated.View>
    <LongPressGestureHandler ref={longPressRef} simultaneousHandlers={panRef} minDurationMs={400}>
      <Animated.View>{/* контент */}</Animated.View>
    </LongPressGestureHandler>
  </Animated.View>
</PanGestureHandler>
```

---

## 📋 Текущий статус (17.03.2026)

### Завершённые этапы
- ✅ **Этап 1** — Архитектура задач (TimePicker, DatePicker, цикличность, подзадачи, фокус-сессия, свайпы)
- ✅ **Этап 2** — Папки (CRUD, drag&drop, фильтрация, анимация)
- ✅ **Этап 3** — Привычки UX (удаление, форма, тоггл план/период, Button danger, нет рамки)

### Следующий шаг
- **Этап 4** — Календарь: задачи + привычки в сетке, тап на день, ДР/события, переключатель вида

### Техдолг
- TimePicker: шероховатости при быстром броске (не критично)
- `src/screens/TasksScreen.js.save` — мусорный файл, удалить
- `ThemeContext.js` — добавить `danger2` во все темы (сейчас Button fallback на `danger1`)

---

## 🤝 Правила работы с AI

### Стиль взаимодействия
- Общение **на русском** (кроме кода и технических терминов)
- AI действует как **co-pilot**: анализирует, предлагает, реализует
- Перед реализацией — кратко описать план (1-3 пункта), не перечислять очевидное
- Не переспрашивать по мелочам — если задача понятна, сразу делать
- Коммиты делать сразу в ветку `mobile-dev3.0` через GitHub MCP

### Порядок работы с кодом
1. Прочитать нужные файлы (`get_file_contents`) — получить SHA и понять структуру
2. Написать изменения
3. Один файл → `create_or_update_file` с SHA; несколько → `push_files`
4. Обновить документы (DEVLOG, ROADMAP, QA, AI_CONTEXT)

### Приоритеты
1. Не сломать то что работает
2. Оптимистичный UI везде где возможно
3. Производительность (FlatList > ScrollView для длинных списков)
4. Простой пользовательский опыт (меньше экранов/модалок, больше жестов)

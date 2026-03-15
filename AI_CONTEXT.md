# 🤖 AI_CONTEXT — Контекст проекта Mind&Motion для новых чатов

> **Читай этот файл первым делом.** Здесь вся информация для немедленной продуктивной работы.
> Последнее обновление: 15.03.2026

---

## 🧠 Суть проекта

**Mind&Motion** — мобильное приложение-органайзер (React Native + Expo) для личной продуктивности. Включает: задачи с подзадачами, привычки, календарь, концентрат-сессии (таймер фокуса), дни рождения, профиль. Бэкенд на Node.js + MySQL.

**Аудитория:** Один разработчик (владелец репо `bragingena1998`) + AI-ассистент в роли co-pilot разработчика.

---

## 🚫 ЗАКОНЫ — КАТЕГОРИЧЕСКИ НЕЛЬЗЯ

> Это не рекомендации. Это жёсткие правила. Нарушение = поломка проекта.

### Код
1. **НЕЛЬЗЯ хардкодить цвета** (`'#fff'`, `'black'` и т.д.). Только `colors.X` из `useTheme()`.
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
| `TasksScreen.js` | **Главный экран задач** (~1700 строк). Содержит: список задач, папки, drag&drop, подзадачи, фокус-сессии |
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
  user_id          INT NOT NULL,            -- FK → users.id
  title            VARCHAR(500) NOT NULL,
  date             DATE,                    -- дата задачи (для отображения)
  deadline         DATE,                    -- дедлайн (NULL если не задан)
  time             VARCHAR(5),              -- формат 'HH:MM', NULL если не задано
  priority         INT DEFAULT 0,           -- 0=нет, 1=низкий, 2=средний, 3=высокий
  done             TINYINT(1) DEFAULT 0,
  done_date        DATE,                    -- когда выполнена
  comment          TEXT,
  isrecurring      TINYINT(1) DEFAULT 0,
  recurrencetype   VARCHAR(50),             -- 'day' | 'week' | 'month'
  recurrencevalue  VARCHAR(50),             -- доп. параметры повторения
  isgenerated      TINYINT(1) DEFAULT 0,    -- создана автоматически сервером
  templateid       INT,                     -- ID исходной задачи-шаблона
  folderid         INT,                     -- FK → folders.id, NULL если без папки
  focussessions    INT DEFAULT 0,           -- кол-во концентрат-сессий
  subtasks_count   INT DEFAULT 0,           -- кэш кол-ва подзадач
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Подзадачи
subtasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  task_id     INT NOT NULL,                 -- FK → tasks.id
  title       VARCHAR(500) NOT NULL,
  completed   TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
)

-- Папки
folders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,                 -- FK → users.id
  name        VARCHAR(100) NOT NULL,
  emoji       VARCHAR(10) DEFAULT NULL,     -- эмодзи-иконка
  order_index INT DEFAULT 0,               -- порядок отображения
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Привычки
habits (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  name            VARCHAR(255) NOT NULL,
  frequency_type  VARCHAR(50),             -- 'daily' | 'weekly' | 'custom'
  frequency_days  VARCHAR(100),            -- JSON массив дней [0,1,2...] или NULL
  start_date      DATE,
  end_date        DATE,                    -- NULL = бессрочно
  color           VARCHAR(20),
  order_index     INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

-- Логи выполнения привычек
habit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  habit_id    INT NOT NULL,
  user_id     INT NOT NULL,
  date        DATE NOT NULL,
  completed   TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_habit_date (habit_id, date),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
)

-- Дни рождения и личные события
birthdays (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  day           INT NOT NULL,              -- 1-31
  month         INT NOT NULL,              -- 1-12
  year          INT,                       -- NULL = год неизвестен
  type          VARCHAR(30) DEFAULT 'birthday', -- 'birthday' | 'anniversary' | 'event'
  notify_before INT DEFAULT 1,             -- за сколько дней уведомить
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

### Важные особенности БД
- `subtasks_count` — это **кэш**, не рассчитывается на лету. Обновлять вручную при добавлении/удалении подзадач.
- `templateid` — ссылка на исходную задачу при создании повторяющейся копии. Для остановки цикла — `PUT /tasks/:templateid/stop-recurring`.
- `deadline = NULL` если не задан (не копировать `date` в `deadline`!).
- `folderid = NULL` = задача без папки (показывается во «Все задачи»).
- Все CASCADE ON DELETE — при удалении пользователя/задачи всё дочернее удаляется.

---

## 🔌 API (Backend)

Бэкенд: `var/www/backend/server.js`

### Основные роуты
```
POST   /auth/login
POST   /auth/register
POST   /auth/forgot-password

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
POST   /habits
PUT    /habits/:id
DELETE /habits/:id
GET    /habits/logs        ?month=&year=
POST   /habits/:id/toggle  body: {date}

GET    /birthdays
POST   /birthdays
PUT    /birthdays/:id
DELETE /birthdays/:id

GET    /profile
PUT    /profile
PUT    /profile/password
```

### Auth
- JWT токен. Заголовок: `Authorization: Bearer <token>`
- Токен хранится в `SecureStore`, подставляется автоматически через axios interceptor в `api.js`
- Refresh токена нет — при истечении редирект на Login

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

**Подтянуть изменения от AI:**
```bash
git pull origin mobile-dev3.0
```

**Если конфликт:**
```bash
git fetch origin
git reset --hard origin/mobile-dev3.0
# ВНИМАНИЕ: теряет локальные незакоммиченные изменения
```

**Запустить Dev Client:**
```bash
npx expo start --dev-client
```

**Собрать APK (preview):**
```bash
eas build --profile preview --platform android
```

### Деплой бэкенда на Beget

Бэкенд находится в репо в папке `var/www/backend/`. После изменений в `server.js` нужно задеплоить на Beget.

**Способ 1 — через SSH (рекомендуется):**
```bash
# Подключиться к Beget по SSH
ssh username@hostname

# Перейти в папку бэкенда
cd /var/www/backend/

# Подтянуть изменения из GitHub
git pull origin mobile-dev3.0

# Перезапустить сервер (через PM2)
pm2 restart server
# или
pm2 restart all

# Проверить статус
pm2 status
pm2 logs server --lines 50
```

**Способ 2 — через FileManager Beget (только для мелких правок):**
1. Открыть панель Beget → FileManager
2. Перейти в `/var/www/backend/`
3. Загрузить/отредактировать `server.js`
4. Перезапустить процесс через раздел «Node.js» в панели

**Структура на Beget:**
```
/var/www/backend/
├── server.js          # Главный файл API
├── package.json
├── node_modules/
└── .env               # Переменные окружения (DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET)
                       # ⚠️ .env НЕ в репо! Хранится только на Beget
```

**Переменные окружения (`.env` на Beget):**
```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_secret_key
PORT=3000
```

**Проверить что сервер работает:**
```bash
curl https://ваш-домен.beget.tech/tasks  # должен вернуть 401 (значит работает)
```

### Миграции БД
Все изменения схемы — **вручную через phpMyAdmin** на Beget:
1. Открыть phpMyAdmin через панель Beget
2. Выбрать нужную БД
3. Вкладка SQL → выполнить ALTER TABLE
4. **Записать изменение в ROADMAP_v3.md** в секции «БД» нужного этапа

Пример миграции:
```sql
ALTER TABLE tasks ADD COLUMN subtasks_count INT DEFAULT 0;
ALTER TABLE folders ADD COLUMN emoji VARCHAR(10) DEFAULT NULL;
```

---

## 🔧 Ключевые паттерны кода

### Оптимистичный UI
Всегда сначала обновляем state локально, потом делаем API-запрос. При ошибке — откатываем:
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

### Gesture Handler (Drag & Drop)
Правило порядка: **PanGestureHandler снаружи, LongPressGestureHandler внутри.**
```js
<PanGestureHandler ref={panRef} simultaneousHandlers={longPressRef} onGestureEvent={onPan}>
  <Animated.View>
    <LongPressGestureHandler ref={longPressRef} simultaneousHandlers={panRef} minDurationMs={400} onHandlerStateChange={onLongPress}>
      <Animated.View>
        {/* контент карточки */}
      </Animated.View>
    </LongPressGestureHandler>
  </Animated.View>
</PanGestureHandler>
```

### Координаты через measure
`onLayout` даёт размеры относительно родителя. Для абсолютных координат нужен `ref.measure()`.
При асинхронных measure — использовать `setTimeout(..., 50)` чтобы layout точно завершился:
```js
ref.current.measure((x, y, width, height, pageX, pageY) => {
  // pageX, pageY — абсолютные координаты на экране
});
// При вызове после render:
setTimeout(() => ref.current?.measure(...), 50);
```

### Анимации
```js
// Простые переходы
Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

// Hover-пульс — ТОЛЬКО отдельный компонент с собственным Animated.Value
// НЕ через state, НЕ общий value для всего списка
const pulseAnim = useRef(new Animated.Value(1)).current;
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
    Animated.timing(pulseAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }),
  ])
).start();
```

### Toast вместо Alert
```js
// ✅ Правильно — для информации и успеха
showToast('✅ Задача перемещена в папку!');
showToast('❌ Не удалось сохранить.');

// ✅ Правильно — для деструктивных действий
Alert.alert('Удалить задачу?', 'Это действие нельзя отменить', [
  { text: 'Отмена', style: 'cancel' },
  { text: 'Удалить', style: 'destructive', onPress: handleDelete }
]);
```

---

## 📋 Текущий статус (15.03.2026)

### Завершённые этапы
- ✅ **Этап 1** — Архитектура задач (TimePicker, DatePicker, цикличность, подзадачи, фокус-сессия, свайпы)
- ✅ **Этап 2** — Папки (CRUD, drag&drop, фильтрация, анимация)

### Следующий шаг
- **Этап 3** — Привычки: починить удаление, упростить форму, логика дат

### Техдолг
- TimePicker: шероховатости при быстром броске (не критично)
- `src/screens/TasksScreen.js.save` — мусорный файл, удалить

---

## 🤝 Правила работы с AI

### Стиль взаимодействия
- Общение **на русском** (кроме кода и технических терминов)
- AI действует как **co-pilot**: анализирует, предлагает, реализует
- Перед реализацией — кратко описать план (1-3 пункта), не перечислять очевидное
- Не переспрашивать по мелочам — если задача понятна, сразу делать
- Коммиты делать сразу в ветку `mobile-dev3.0` через GitHub MCP

### Инструменты AI (GitHub MCP)
| Действие | Инструмент |
|----------|------------|
| Прочитать файл | `get_file_contents` |
| Создать/обновить 1 файл | `create_or_update_file` (требует SHA!) |
| Пушить несколько файлов | `push_files` (один коммит) |
| Прочитать структуру папки | `get_file_contents` на директорию |
| Получить SHA файла | `get_file_contents` → поле `sha` |
| История коммитов | `list_commits` |

### Порядок работы с кодом
1. Прочитать нужные файлы (`get_file_contents`) — получить SHA и понять структуру
2. Написать изменения
3. Один файл → `create_or_update_file` с SHA; несколько → `push_files`
4. Обновить документы (DEVLOG, ROADMAP, QA, AI_CONTEXT)

### Документация
- После завершения этапа → обновить `DEVLOG_v3.md`, `ROADMAP_v3.md`, `QA_v3.md`
- После сессии → обновить `AI_CONTEXT.md` (этот файл)
- Формат записи в DEVLOG — строго по шаблону в конце файла

### Приоритеты
1. Не сломать то что работает
2. Оптимистичный UI везде где возможно
3. Производительность (FlatList > ScrollView для длинных списков)
4. Простой пользовательский опыт (меньше экранов/модалок, больше жестов)

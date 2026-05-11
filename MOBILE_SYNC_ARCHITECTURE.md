# Мобильная синхронизация и модалки — Архитектура

> Версия: май 2026  
> Ветка: `mobile`  
> Статус: ✅ Реализовано

---

## Обзор

В мобильном приложении реализована двусторонняя синхронизация между всеми основными экранами через `DataSyncContext`. Также исправлены критические баги с модалками и recurring задачами.

---

## DataSyncContext — Двусторонняя синхронизация

### Файл
`src/contexts/DataSyncContext.js`

### Архитектура
```javascript
const DataSyncContext = createContext(null);

export const DataSyncProvider = ({ children }) => {
  const [tick, setTick] = useState(0);
  const bumpAll = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo(() => ({ tick, bumpAll }), [tick, bumpAll]);
  
  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
};
```

### Принцип работы
1. **tick** — счётчик изменений, увеличивается при любом действии
2. **bumpAll()** — функция для оповещения всех экранов об изменениях
3. **useFocusEffect** — обновление при переходе между вкладками с throttle 3 секунды

---

## Подписанные экраны

### 1. TasksScreen
```javascript
const { tick, bumpAll } = useDataSync();

// Подписка на изменения других экранов
useEffect(() => {
  if (tick === 0) return;
  loadTasks();
}, [tick]);

// Оповещение других экранов
const toggleTask = async (task) => {
  // ... логика изменения задачи
  bumpAll();
};
```

### 2. DashboardScreen
```javascript
const { tick, bumpAll } = useDataSync();

// Подписка через useLocalFirst с зависимостью от tick
const { data, loading } = useLocalFirst({
  type: 'dashboard',
  fetchFunction: loadDashboard,
  dependencies: [tick], // Обновляем при изменении tick
});

// useFocusEffect для мгновенного обновления при переходе
useFocusEffect(
  useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 3000) return;
    lastLoadTimeRef.current = now;
    loadDashboard();
  }, [loadDashboard])
);
```

### 3. CalendarScreen
```javascript
const { bumpAll, tick } = useDataSync();
const lastLoadTimeRef = useRef(0);

// Подписка на изменения других экранов
useEffect(() => {
  if (tick === 0) return;
  lastLoadTimeRef.current = 0; // Сбрасываем throttle
  loadData();
}, [tick]);

// useFocusEffect с throttle 3 секунды
useFocusEffect(
  useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 3000) return;
    lastLoadTimeRef.current = now;
    loadData();
  }, [year, month])
);

// Оповещение при создании/удалении событий
const saveEvent = async () => {
  // ... логика сохранения
  bumpAll();
};

const deleteEvent = async id => {
  // ... логика удаления
  bumpAll();
};
```

### 4. HabitsScreen
```javascript
const { bumpAll, tick } = useDataSync();

// Подписка на изменения других экранов
useEffect(() => {
  if (tick === 0) return;
  lastLoadTimeRef.current = 0; // Сбрасываем throttle
  if (loadRecords) loadRecords();
}, [tick]);

// useFocusEffect с throttle 3 секунды
useFocusEffect(
  useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 3000) return;
    lastLoadTimeRef.current = now;
    if (loadRecords) loadRecords();
    if (loadHabits) loadHabits();
  }, [loadRecords, loadHabits])
);

// Оповещение при изменении привычек
const handleCellChange = async () => {
  // ... логика изменения
  bumpAll();
};
```

---

## Modal Component — Исправленные проблемы

### Файл
`src/components/Modal.js`

### Проблема 1: GestureHandlerRootView вне Modal
**Решено:** Добавлен `GestureHandlerRootView` внутри `RNModal`

```javascript
<GestureHandlerRootView style={{ flex: 1 }}>
  <KeyboardAvoidingView>
    {/* Содержимое модалки */}
  </KeyboardAvoidingView>
</GestureHandlerRootView>
```

### Проблема 2: ScrollView из gesture-handler без RootView
**Решено:** Возвращён `ScrollView` из `react-native`

```javascript
import { ScrollView } from 'react-native'; // НЕ из gesture-handler

<ScrollView
  contentContainerStyle={styles.contentContainer}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="none"
  nestedScrollEnabled
  bounces={false}
>
  {children}
</ScrollView>
```

### Проблема 3: KeyboardAvoidingView на Android
**Решено:** Отключён на Android

```javascript
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  enabled={Platform.OS === 'ios'}
>
```

---

## Recurring Tasks — Исправленные проблемы

### Файл
`src/screens/TasksScreen.js`

### Проблема 1: Отсутствие nextDate в API запросе
**Решено:** Добавлен `nextDate` при выполнении recurring задачи

```javascript
await tasksAPI.updateTaskOffline(taskId, {
  title: t.title, 
  date: t.date, 
  deadline: t.deadline,
  priority: normPriority(t.priority) === 'high' ? 1 : normPriority(t.priority) === 'low' ? 3 : 2,
  comment: t.comment || '', 
  done, 
  doneDate: done ? toMysqlFormat(new Date()) : null,
  time: t.time, 
  isRecurring: t.isRecurring, 
  recurrenceType: t.recurrenceType,
  folderId: t.folderId || null,
  nextDate: done && t.isRecurring ? getNextRecurringDate(t) : undefined, // ✅ ДОБАВЛЕНО
});
```

### Проблема 2: Некорректный парсинг ISO дат
**Решено:** Исправлена функция `getNextRecurringDate`

```javascript
const getNextRecurringDate = (task) => {
  // Очищаем дату от времени и Z-суффикса перед парсингом
  let rawDate = task.date || null;
  let cleanDate = null;

  if (rawDate) {
    // Берём только первые 10 символов: "YYYY-MM-DD"
    cleanDate = String(rawDate).slice(0, 10);
  }

  // Парсим локально (без UTC сдвига)
  const baseDate = cleanDate
    ? new Date(cleanDate + 'T00:00:00')
    : new Date();

  // Защита от Invalid Date
  if (isNaN(baseDate.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ... остальная логика расчёта следующей даты
};
```

---

## История изменений

| Дата | Изменение | Коммит | Автор |
|------|-----------|---------|--------|
| 2026-05-10 | Исправление скролла в модалке (KeyboardAvoidingView, ScrollView) | `c63ee56` | Cascade |
| 2026-05-10 | Добавление nextDate в recurring задачи | `9c7f056` | Cascade |
| 2026-05-10 | Реализация двусторонней синхронизации (Calendar, Dashboard) | `9c7f056` | Cascade |
| 2026-05-10 | Исправление getNextRecurringDate для ISO дат | `9c7f056` | Cascade |
| 2026-05-10 | GestureHandlerRootView внутри RNModal | `03ce258` | Cascade |

---

## Связанные файлы

- `src/contexts/DataSyncContext.js` — контекст синхронизации
- `src/components/Modal.js` — компонент модалки
- `src/screens/TasksScreen.js` — recurring задачи
- `src/screens/HabitsScreen.js` — привычки
- `src/screens/CalendarScreen.js` — календарь
- `src/screens/DashboardScreen.js` — дашборд
- `backend/routes/tasks.js` — серверная логика recurring задач

---

## Результаты

✅ **Двусторонняя синхронизация:** Все экраны обновляются при изменениях на других экранах  
✅ **Модалки:** Скролл работает без клавиатуры, нет моргания, корректная работа с жестами  
✅ **Recurring задачи:** Создаются с правильной датой, нет дублирования  
✅ **Performance:** Throttle 3 секунды предотвращает лишние запросы  
✅ **Offline-first:** Оптимистичные обновления с откатом при ошибках

// src/screens/TasksScreen.js
// Экран задач с исправленным свайпом, чекбоксами и модалкой очистки

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl, 
  Alert,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import Background from '../components/Background';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../services/api';
import { getToken } from '../services/storage';
// Импорт Swipeable из gesture-handler
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Используем api напрямую
const toMysqlFormat = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const tasksAPI = {
  getTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

import DatePicker from '../components/DatePicker';

// === ВЫНЕСЕННЫЙ КОМПОНЕНТ ДЛЯ РЕНДЕРА ПОДЗАДАЧИ ===
const SubtaskItem = React.memo(({ subtask, parentId, colors, onToggle, onDelete }) => {
  const isCompleted = !!subtask.completed; // Принудительно boolean

  return (
    <View style={styles.subtaskItem}>
      <TouchableOpacity
        onPress={() => onToggle(subtask.id, parentId)}
        style={styles.subtaskCheckbox}
      >
        <View
          style={[
            styles.checkbox,
            {
              width: 20, 
              height: 20,
              borderColor: isCompleted ? colors.ok1 : colors.borderSubtle,
              backgroundColor: isCompleted ? colors.ok1 : 'transparent',
            },
          ]}
        >
          {isCompleted && (
            <Text style={[styles.checkmark, { fontSize: 12 }]}>✓</Text>
          )}
        </View>
      </TouchableOpacity>

      <Text
        style={[
          styles.subtaskTitle,
          { color: isCompleted ? colors.textMuted : colors.textMain },
          isCompleted && { textDecorationLine: 'line-through' }
        ]}
      >
        {subtask.title || '(без названия)'}
      </Text>

      <TouchableOpacity
        onPress={() => onDelete(subtask.id, parentId)}
        style={styles.subtaskDeleteBtn}
      >
        <Text style={{ fontSize: 14 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
});


const TasksScreen = ({ navigation }) => {
  const { colors, spacing, changeTheme, theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Текущая дата
const [isArchiveMode, setIsArchiveMode] = useState(false); // Режим архива
const [showMonthPicker, setShowMonthPicker] = useState(false); // Модалка
const [showAddModal, setShowAddModal] = useState(false);
const [hideCompleted, setHideCompleted] = useState(true);
const [editingTask, setEditingTask] = useState(null);
const [taskToDelete, setTaskToDelete] = useState(null); // ← НОВАЯ СТРОКА
const [sortBy, setSortBy] = useState('date');
const [showFilterMenu, setShowFilterMenu] = useState(false);
const [newTask, setNewTask] = useState({
  title: '',
  date: new Date().toISOString().split('T')[0],
  deadline: new Date().toISOString().split('T')[0],
  priority: 2,
  comment: '',
});
const [stats, setStats] = useState({
  today: 0,
  todayPlan: 0,
  week: 0,
  month: 0,
  total: 0
});
    // Подзадачи
  const [expandedTasks, setExpandedTasks] = useState({}); // { taskId: true/false }
  const [subtasks, setSubtasks] = useState({}); // { taskId: [subtasks] }
  const [loadingSubtasks, setLoadingSubtasks] = useState({});
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [currentTaskForSubtask, setCurrentTaskForSubtask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Модалка "Чистка старых задач"
  const [showOverdueCleanupModal, setShowOverdueCleanupModal] = useState(false);
  const [overdueTasksList, setOverdueTasksList] = useState([]);


  // Список тем для кнопки
  const themes = [
    { key: 'default', emoji: '🎨' },
    { key: 'storm', emoji: '⚡' },
    { key: 'ice', emoji: '❄️' },
    { key: 'blood', emoji: '🔥' },
    { key: 'toxic', emoji: '☢️' },
    { key: 'glitch', emoji: '👾' },
  ];

  const currentTheme = themes.find(t => t.key === theme);

  // Циклическое переключение тем
  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex].key);
  };

  // Загрузка задач
  useEffect(() => {
    loadTasks();
  }, []);

// 1. Сначала объявляем loadStats
const loadStats = async () => {
  try {
    const response = await api.get('/tasks/stats');
    setStats({
      today: response.data.completed_today || 0,
      todayPlan: response.data.total_today_plan || 0,
      week: response.data.completed_week || 0,
      month: response.data.completed_month || 0,
      total: response.data.completed_total || 0
    });
  } catch (err) {
    console.error('Ошибка загрузки статистики:', err);
  }
};

// Загрузка задач (с учетом выбранного месяца)
const loadTasks = async (date = selectedDate) => { // <-- Принимаем дату (по умолчанию текущая выбранная)
  try {
    setError('');
    const token = await getToken();
    
    if (!token) {
      console.log('⚠️ Нет токена, возврат на логин');
      // TODO: заменить на navigation.navigate('Login') для RN
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return;
    }

    // 1. Определяем, какой месяц грузить
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    
    const isCurrentMonth = (targetMonth === currentMonth && targetYear === currentYear);

    // 2. Готовим параметры для API
    let params = {};
    if (!isCurrentMonth) {
      // Если месяц прошлый -> шлем параметры для фильтрации
      params = { 
        month: targetMonth, 
        year: targetYear 
      };
      // Можно выставить флаг "Архив", чтобы показать юзеру, что это история
      // setIsArchiveMode(true); 
    } else {
      // setIsArchiveMode(false);
    }

    console.log(`📡 Загружаем задачи за: ${targetMonth + 1}.${targetYear} (params:`, params, ')');

    // 3. Загружаем данные
    // Если месяц текущий -> грузим задачи + статистику
    // Если прошлый -> только задачи (статистику не трогаем или можно обнулить)
    
    let tasksData = [];
    
    if (isCurrentMonth) {
      // Грузим всё параллельно
      const [tasksRes, _] = await Promise.all([
        api.get('/tasks', { params }), // Используем api.get напрямую для передачи params
        loadStats()
      ]);
      tasksData = tasksRes.data;
    } else {
      // Грузим только задачи (архив)
      const response = await api.get('/tasks', { params });
      tasksData = response.data;
    }

    console.log(`✅ Загружено ${tasksData.length} задач`);
    
    // 4. Форматируем данные
    const formattedTasks = tasksData.map(task => ({
      ...task,
      priority: task.priority === 1 ? 'high' : task.priority === 3 ? 'low' : 'medium',
      dueDate: task.deadline || task.date,
      completed: task.done || false,
    }));
    
    setTasks(formattedTasks);
    
    // --- ПРОВЕРКА НА СТАРЫЕ ЗАДАЧИ (> 7 дней просрочки) ---
    // Выполняем 1 раз при первой загрузке (когда loading был true)
    if (loading) {
       checkOverdueTasks(formattedTasks);
    }

    setLoading(false);
    
  } catch (err) {
    console.error('❌ Ошибка загрузки задач:', err);
    setError('Ошибка загрузки задач');
    setTasks([]);
    setLoading(false);
  }
};

  // Проверка просроченных задач
  const checkOverdueTasks = async (allTasks) => {
    try {
      const lastCheckStr = await AsyncStorage.getItem('lastOverdueCheckDate');
      const todayStr = new Date().toISOString().split('T')[0];

      // Если сегодня уже проверяли - не показываем
      if (lastCheckStr === todayStr) {
        console.log('✅ Проверка просроченных задач уже была сегодня');
        return;
      }

      // Фильтруем задачи: не выполненные И просроченные > 7 дней
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

      const oldTasks = allTasks.filter(t => {
        if (t.completed) return false;
        const deadline = t.deadline ? t.deadline.split('T')[0] : (t.date ? t.date.split('T')[0] : null);
        // Если deadline < (сегодня - 7 дней)
        return deadline && deadline < oneWeekAgoStr;
      });

      if (oldTasks.length > 0) {
        console.log(`🔥 Найдено ${oldTasks.length} старых задач! Показываем модалку.`);
        setOverdueTasksList(oldTasks);
        setShowOverdueCleanupModal(true);
        // Запоминаем, что сегодня показали
        await AsyncStorage.setItem('lastOverdueCheckDate', todayStr);
      }
    } catch (e) {
      console.error('Ошибка проверки просрочки:', e);
    }
  };

  // Удаление старых задач (всех разом)
  const handleDeleteOldTasks = async () => {
    try {
      setLoading(true);
      // Удаляем параллельно
      await Promise.all(overdueTasksList.map(t => tasksAPI.deleteTask(t.id)));
      
      console.log('🗑️ Старые задачи удалены');
      setShowOverdueCleanupModal(false);
      setOverdueTasksList([]);
      
      // Перезагружаем список
      await loadTasks(); 
    } catch (err) {
      console.error('❌ Ошибка удаления старых задач:', err);
      Alert.alert('Ошибка', 'Не удалось удалить все задачи');
      setLoading(false);
    }
  };


  // Обновление списка
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

// Переключение статуса задачи
const toggleTask = async (taskId) => {
  try {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    // 1. Оптимистичное обновление UI (чтобы галочка сработала мгновенно)
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    // 2. Формируем данные
    // Если помечаем выполненной -> ставим ТЕКУЩЕЕ время
    // Если снимаем галочку -> null
    const newDoneState = !taskToUpdate.completed;
    // Используем toISOString(), чтобы сохранить точное время (UTC)
    const newDoneDate = newDoneState ? toMysqlFormat(new Date()) : null;

    const updatedTaskData = {
      title: taskToUpdate.title,
      date: taskToUpdate.date,
      deadline: taskToUpdate.deadline,
      priority: taskToUpdate.priority === 'high' ? 1 : taskToUpdate.priority === 'low' ? 3 : 2,
      comment: taskToUpdate.comment || '',
      done: newDoneState, 
      doneDate: newDoneDate, // <--- ОТПРАВЛЯЕМ ПОЛНУЮ ДАТУ
    };

    // 3. Отправляем на сервер
    await tasksAPI.updateTask(taskId, updatedTaskData);
    
    // 4. ОБНОВЛЯЕМ СТАТИСТИКУ (чтобы счетчики пересчитались)
    await loadStats(); // <--- ВАЖНО!
    
  } catch (error) {
    console.error('❌ Ошибка переключения задачи:', error);
    // Откатываем изменения при ошибке
    loadTasks();
  }
};


useEffect(() => {
  const checkToken = async () => {
    try {
      const token = await getToken();
      console.log('🔑 TOKEN:', token ? 'OK ' + token.slice(0, 20) + '...' : 'NULL');
      
      // Тест API
      const tasks = await tasksAPI.getTasks();
      console.log('✅ GET работает:', tasks.length, 'задач');
    } catch (err) {
      console.error('❌ TOKEN/API ошибка:', err.message);
    }
  };
  checkToken();
}, []);

const deleteTask = useCallback(async (taskId) => {
  try {
    console.log('🗑️ Удаляем задачу ID:', taskId);
    
    // 1. Оптимистичное обновление UI
    setTasks((prevTasks) => prevTasks.filter(task => task.id !== taskId));
    
    // 2. Отправляем DELETE на сервер
    await tasksAPI.deleteTask(taskId);
    
    console.log('✅ Задача удалена (UI + API)');
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    
    // 3. Откатываем при ошибке
    loadTasks();
    Alert.alert('Ошибка', 'Не удалось удалить задачу');
  }
}, []);

// Загрузка подзадач
const loadSubtasks = async (taskId) => {
  try {
    setLoadingSubtasks(prev => ({ ...prev, [taskId]: true }));
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    
    // ЗАЩИТА: Проверяем, что response.data — это массив
    const rawData = Array.isArray(response.data) ? response.data : [];
    
    // FIX: Форматируем подзадачи (приводим к булевым, чтобы не было 0 в JSX)
    const formattedSubtasks = rawData.map(st => ({
        ...st,
        completed: Boolean(st.completed || st.done), // Поддержка и completed, и done, превращаем в true/false
    }));

    console.log(`📋 Загружено ${formattedSubtasks.length} подзадач для задачи ${taskId}`);
    
    setSubtasks(prev => ({ ...prev, [taskId]: formattedSubtasks }));
    setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
  } catch (err) {
    console.error('Ошибка загрузки подзадач:', err);
    setSubtasks(prev => ({ ...prev, [taskId]: [] })); // Пустой массив при ошибке
    setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
  }
};

// Раскрытие/скрытие подзадач
const toggleExpand = (taskId) => {
  const isExpanded = expandedTasks[taskId];
  
  if (!isExpanded) {
    // Раскрываем - загружаем подзадачи
    loadSubtasks(taskId);
  }
  
  setExpandedTasks(prev => ({ ...prev, [taskId]: !isExpanded }));
};

// Переключение статуса подзадачи
const toggleSubtask = async (subtaskId, taskId) => {
  try {
    await api.put(`/subtasks/${subtaskId}/toggle`);
    // Обновляем локально
    setSubtasks(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    }));
  } catch (err) {
    console.error('Ошибка переключения подзадачи:', err);
  }
};

// Добавление подзадачи
const addSubtask = async () => {
  if (!newSubtaskTitle.trim() || !currentTaskForSubtask) return;
  
  try {
    const response = await api.post(`/tasks/${currentTaskForSubtask}/subtasks`, {
      title: newSubtaskTitle
    });
    
    // Добавляем в локальный стейт
    setSubtasks(prev => ({
      ...prev,
      [currentTaskForSubtask]: [...(prev[currentTaskForSubtask] || []), response.data]
    }));
    
    setNewSubtaskTitle('');
    setShowAddSubtaskModal(false);
    setCurrentTaskForSubtask(null);
  } catch (err) {
    console.error('Ошибка добавления подзадачи:', err);
  }
};

// Удаление подзадачи
const deleteSubtask = async (subtaskId, taskId) => {
  try {
    await api.delete(`/subtasks/${subtaskId}`);
    setSubtasks(prev => ({
      ...prev,
      [taskId]: prev[taskId].filter(st => st.id !== subtaskId)
    }));
  } catch (err) {
    console.error('Ошибка удаления подзадачи:', err);
  }
};



  const handleEditTask = (task) => {
  setNewTask({
    title: task.title,
    date: task.date.split('T')[0],
    deadline: task.deadline.split('T')[0],
    priority: task.priority === 'high' ? 1 : task.priority === 'low' ? 3 : 2,
    comment: task.comment || '',
  });
  setEditingTask(task);
  setShowAddModal(true);
};

// ← ДОБАВЬ ЭТУ ФУНКЦИЮ:
const handleLogout = () => {
  // TODO: заменить на navigation.navigate('Login') + AsyncStorage.removeItem для RN
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('app-auth-token');
    localStorage.removeItem('app-user-email');
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};


  // --- ИСПРАВЛЕННАЯ СТАТИСТИКА ---
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Хелпер для получения начала недели
  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };
  const startOfWeek = getStartOfWeek(new Date()).toISOString().split('T')[0];
  const startOfWeekStr = startOfWeek; // ← FIX: Объявляем переменную явно
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  // Считаем правильно
  const completedToday = tasks.filter(t => {
    if (!t.completed || !t.doneDate) return false;
    // Берем только первые 10 символов (YYYY-MM-DD)
    const d = typeof t.doneDate === 'string' ? t.doneDate.substring(0, 10) : ''; 
    return d === todayStr;
  }).length;

  const completedWeek = tasks.filter(t => {
    if (!t.completed || !t.doneDate) return false;
    const d = typeof t.doneDate === 'string' ? t.doneDate.substring(0, 10) : ''; 
    return d >= startOfWeekStr;
  }).length;

  const completedMonth = tasks.filter(t => {
    if (!t.completed || !t.doneDate) return false;
    const d = typeof t.doneDate === 'string' ? t.doneDate.substring(0, 10) : ''; 
    return d >= startOfMonth;
  }).length;

  const completedTotal = tasks.filter(t => t.completed).length;



/// Форматирование даты для отображения (как на сайте)
const formatTaskDate = (task) => {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const dateStr = task.date;
  const deadlineStr = task.deadline;

  // Если нет deadline или они совпадают
  if (!deadlineStr || dateStr === deadlineStr) {
    return formatDate(dateStr);
  }

  // Если разные - показываем диапазон
  const dateObj = new Date(dateStr);
  const deadlineObj = new Date(deadlineStr);

  const dayStart = String(dateObj.getDate()).padStart(2, '0');
  const dayEnd = String(deadlineObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  // Если один месяц
  if (dateObj.getMonth() === deadlineObj.getMonth() && 
      dateObj.getFullYear() === deadlineObj.getFullYear()) {
    return `${dayStart}-${dayEnd}.${month}.${year}`;
  }

  // Разные месяцы
  return `${formatDate(dateStr)} - ${formatDate(deadlineStr)}`;
};

// Фильтрация задач
const filteredTasks = hideCompleted 
  ? tasks.filter(t => !t.completed) 
  : tasks;

// Определение статуса задачи по дате
const getTaskStatus = (task) => {
  // Приводим все даты к формату YYYY-MM-DD для корректного сравнения
  const today = new Date().toISOString().split('T')[0];
  
  // Если date/deadline приходят как ISO (2026-02-05T00:00:00.000Z), обрезаем до YYYY-MM-DD
  const startDate = task.date ? task.date.split('T')[0] : today;
  const endDate = task.deadline ? task.deadline.split('T')[0] : startDate;
  
  // console.log('📅 getTaskStatus:', task.title, '| today:', today, '| start:', startDate, '| end:', endDate);
  
  // Если сегодня попадает в диапазон [startDate, endDate] - задача актуальна
  if (today >= startDate && today <= endDate) {
    // console.log('✅ Статус: today');
    return 'today';
  }
  
  // Если дедлайн уже прошёл - просрочено
  if (endDate < today) {
    // console.log('🔥 Статус: overdue');
    return 'overdue';
  }
  
  // Если задача ещё в будущем
  // console.log('📆 Статус: future');
  return 'future';
};



// Сортировка задач
const sortedTasks = [...filteredTasks].sort((a, b) => {
  if (sortBy === 'date') {
    // ИСПОЛЬЗУЕМ getTaskStatus вместо ручной проверки deadline
    const statusA = getTaskStatus(a);
    const statusB = getTaskStatus(b);
    
    // Порядок категорий: overdue (1) → today (2) → future (3)
    const categoryOrder = { overdue: 1, today: 2, future: 3 };
    const categoryA = categoryOrder[statusA];
    const categoryB = categoryOrder[statusB];
    
    // console.log('🔀 Сортировка:', a.title, '(', statusA, categoryA, ') vs', b.title, '(', statusB, categoryB, ')');
    
    // Сначала сортируем по категориям
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    // Внутри категории — по deadline
    const deadlineA = a.deadline ? a.deadline.split('T')[0] : a.date.split('T')[0];
    const deadlineB = b.deadline ? b.deadline.split('T')[0] : b.date.split('T')[0];
    
    return new Date(deadlineA) - new Date(deadlineB);
  }
  
  if (sortBy === 'priority') {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }
  
  if (sortBy === 'title') {
    return a.title.localeCompare(b.title, 'ru');
  }
  
  return 0;
});



// Рендер одной задачи (КРАСИВЫЙ + НОВЫЙ UX)
const renderTask = ({ item }) => {
  const isExpanded = expandedTasks[item.id];
  const taskSubtasks = subtasks[item.id] || [];
  const isLoadingSubtasks = loadingSubtasks[item.id];
  
  // Цвета приоритета
  const getPriorityColor = () => {
    switch (item.priority) {
      case 'high': return colors.danger1;
      case 'medium': return colors.accent1;
      case 'low': return colors.ok1;
      default: return colors.textMuted;
    }
  };
  
  // Статус и цвета
  const taskStatus = getTaskStatus(item);
  const getStatusColor = () => {
    if (item.completed) return colors.textMuted; // Серый если выполнено
    if (taskStatus === 'overdue') return colors.danger1;
    if (taskStatus === 'today') return colors.ok1;
    return colors.borderSubtle;
  };

  // Swipe Actions
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={styles.swipeActionRight}>
        <Animated.Text style={[styles.swipeActionText, { transform: [{ scale }] }]}>
          🗑️
        </Animated.Text>
      </View>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={styles.swipeActionLeft}>
        <Animated.Text style={[styles.swipeActionText, { transform: [{ scale }] }]}>
          ✓
        </Animated.Text>
      </View>
    );
  };

  const onSwipeableOpen = (direction) => {
    if (direction === 'left') {
      // Свайп вправо (зеленый) -> Выполнить
      toggleTask(item.id);
    } else if (direction === 'right') {
      // Свайп влево (красный) -> Удалить
      setTaskToDelete(item);
    }
  };

  // Обработчик долгого нажатия
  const handleLongPress = () => {
    handleEditTask(item);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Swipeable
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={onSwipeableOpen} // <--- АВТО-ДЕЙСТВИЕ
        containerStyle={{ borderRadius: 12, overflow: 'hidden' }}
      >
      <TouchableOpacity
        style={[
          styles.taskItem,
          {
            backgroundColor: colors.surface,
            borderColor: getStatusColor(), // Цвет рамки теперь всегда актуальный
            borderWidth: 2, // Всегда жирная рамка
            opacity: item.completed ? 0.6 : 1,
            marginBottom: 0,
            borderRadius: 0, 
          },
          item.completed && styles.taskCompleted,
        ]}
        activeOpacity={0.7}
        onPress={() => toggleExpand(item.id)} // ТАП -> Раскрыть
        onLongPress={handleLongPress}         // ДОЛГИЙ ТАП -> Редактировать
      >
        
        {/* ЧЕКБОКС (Слева) */}
        <TouchableOpacity 
          style={styles.checkboxArea}
          onPress={(e) => {
            e.stopPropagation();
            toggleTask(item.id);
          }}
        >
          <View
            style={[
              styles.checkbox,
              {
                // Цвет чекбокса совпадает с цветом рамки (статуса)
                borderColor: getStatusColor(),
                backgroundColor: item.completed ? getStatusColor() : 'transparent',
              },
            ]}
          >
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* КОНТЕНТ */}
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              { color: item.completed ? colors.textMuted : colors.textMain },
              item.completed && styles.taskTitleCompleted,
            ]}
            numberOfLines={isExpanded ? 0 : 2}
          >
            {item.title}
          </Text>

          {/* БЕЙДЖИКИ (Статус, Приоритет, Дата) */}
          {!item.completed && (
            <View style={styles.statusBadge}>
              {taskStatus === 'overdue' && (
                <Text style={[styles.statusText, { color: colors.danger1 }]}>
                  🔥 ПРОСРОЧЕНО
                </Text>
              )}
              {taskStatus === 'today' && (
                <Text style={[styles.statusText, { color: colors.ok1 }]}>
                  ⚡ СЕГОДНЯ
                </Text>
              )}
              {taskStatus === 'future' && (
                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                  📅 В ПЛАНЕ
                </Text>
              )}
            </View>
          )}

          <View style={styles.taskMeta}>
            {/* Приоритет */}
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
              <Text style={styles.priorityText}>
                {item.priority === 'high' ? 'Высокий' : 
                 item.priority === 'medium' ? 'Средний' : 'Низкий'}
              </Text>
            </View>
            
            {/* Дата */}
            <Text style={[styles.taskDate, { color: colors.textMuted }]}>
              {formatTaskDate(item)}
            </Text>

            {/* Кол-во подзадач (если есть) */}
            {!isExpanded && (item.subtasks_count > 0 || taskSubtasks.length > 0) && (
               <Text style={{fontSize: 10, color: colors.textMuted, marginLeft: 4}}>
                 📋 {taskSubtasks.length > 0 ? taskSubtasks.length : '...'}
               </Text>
            )}
          </View>
        </View>

        {/* Стрелочка раскрытия */}
        <View style={{ paddingLeft: 8, justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {isExpanded ? '▲' : '▼'}\n          </Text>
        </View>

      </TouchableOpacity>
      </Swipeable>

      {/* ПОДЗАДАЧИ */}
      {isExpanded && (
        <View style={[styles.subtasksContainer, { backgroundColor: colors.surface }]}>
          {isLoadingSubtasks ? (
            <ActivityIndicator size="small" color={colors.accent1} />
          ) : (
            <>
              {taskSubtasks.length === 0 && (
                <Text style={{color: colors.textMuted, fontSize: 12, marginBottom: 8}}>Нет подзадач</Text>
              )}
              
              {taskSubtasks.map(subtask => (
                <SubtaskItem 
                  key={subtask.id}
                  subtask={subtask}
                  parentId={item.id}
                  colors={colors}
                  onToggle={toggleSubtask}
                  onDelete={deleteSubtask}
                />
              ))}

              <TouchableOpacity
                style={styles.addSubtaskBtn}
                onPress={() => {
                  setCurrentTaskForSubtask(item.id);
                  setShowAddSubtaskModal(true);
                }}
              >
                <Text style={[styles.addSubtaskBtnText, { color: colors.accent1 }]}>
                  + Добавить подзадачу
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};





  if (loading) {
    return (
      <Background>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent1} />
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Шапка */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerTitle, { color: colors.accentText }]}>
    МОИ ЗАДАЧИ
          </Text>
          
          <View style={styles.headerButtons}>
          
          <TouchableOpacity 
  onPress={() => setShowMonthPicker(true)}
  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
>
  <Text style={[styles.headerTitle, { color: colors.accentText }]}>
    {selectedDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase()}
  </Text>
  <Text style={{ fontSize: 12, color: colors.textMuted }}>▼</Text>
</TouchableOpacity>

        
          </View>
        </View>

{/* Статистика (Серверная) */}
<View style={styles.statsContainer}>
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    {/* СЕГОДНЯ: Выполнено / План */}
    <Text style={[styles.statNumber, { color: colors.accentText }]}>
      {stats.today}/{stats.todayPlan}
    </Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>СЕГОДНЯ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{stats.week}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>НЕДЕЛЯ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{stats.month}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>МЕСЯЦ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{stats.total}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>ВСЕГО</Text>
  </View>
</View>

{/* === ЧИПЫ ФИЛЬТРАЦИИ И СОРТИРОВКИ (НОВОЕ) === */}
<View style={styles.chipsContainer}>
  {/* Кнопка скрытия выполненных */}
  <TouchableOpacity
    style={[
      styles.chip,
      { 
        backgroundColor: hideCompleted ? colors.accent1 : colors.surface,
        borderColor: colors.borderSubtle
      }
    ]}
    onPress={() => setHideCompleted(!hideCompleted)}
  >
    <Text style={[
      styles.chipText, 
      { color: hideCompleted ? '#020617' : colors.textMuted, fontSize: 13, fontWeight: '700' } // УВЕЛИЧИЛ
    ]}>
      {hideCompleted ? 'Скрыты ✅' : 'Все задачи'}
    </Text>
  </TouchableOpacity>

  {/* Кнопка сортировки */}
  <TouchableOpacity
    style={[
      styles.chip,
      { backgroundColor: colors.surface, borderColor: colors.borderSubtle }
    ]}
    onPress={() => {
      // Циклическое переключение сортировки: date -> priority -> title -> date
      const nextSort = sortBy === 'date' ? 'priority' : sortBy === 'priority' ? 'title' : 'date';
      setSortBy(nextSort);
    }}
  >
    <Text style={[styles.chipText, { color: colors.textMain, fontSize: 13, fontWeight: '700' }]}> {/* УВЕЛИЧИЛ */}
      {sortBy === 'date' && '📅 По дате'}
      {sortBy === 'priority' && '🔥 По важности'}
      {sortBy === 'title' && 'abc По имени'}
    </Text>
  </TouchableOpacity>
</View>


        {/* Список задач */}
        <FlatList
          data={sortedTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent1}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                У вас пока нет задач
              </Text>
            </View>
          }
        />

         {/* Плавающая кнопка добавления (FAB) */}
      <TouchableOpacity
  style={[
    styles.fab, 
    { backgroundColor: colors.accent1 }
  ]}
  onPress={() => setShowAddModal(true)}
>
  <Text style={[styles.fabIcon, { color: colors.background }]}>+</Text>
</TouchableOpacity>
</View>
</GestureHandlerRootView>

 {/* ========== МОДАЛКИ ========== */}

 {/* Модалка "Чистка просроченных" */}
{showOverdueCleanupModal && (
<Modal
  visible
  onClose={() => setShowOverdueCleanupModal(false)}
  title="🔥 Старые задачи"
>
  <Text style={[styles.deleteModalText, { color: colors.textMain, textAlign: 'left', marginBottom: 4 }]}>
    У вас накопились просроченные задачи (более 7 дней).
  </Text>
  <Text style={{color: colors.textMuted, fontSize: 13, marginBottom: 16}}>
    Всего: {overdueTasksList.length} шт. Рекомендуем очистить список для мотивации.
  </Text>

  <View style={{maxHeight: 200, marginBottom: 16}}>
     <FlatList 
       data={overdueTasksList}
       keyExtractor={item => item.id.toString()}
       renderItem={({item}) => (
         <View style={{flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center'}}>
            <Text style={{color: colors.danger1}}>•</Text>
            <Text style={{color: colors.textMain, fontSize: 14}} numberOfLines={1}>{item.title}</Text>
         </View>
       )}
     />
  </View>

  <View style={styles.deleteModalButtons}>
    <TouchableOpacity
      style={[styles.deleteModalButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
      onPress={() => setShowOverdueCleanupModal(false)}
    >
      <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>Оставить</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.deleteModalButton, { backgroundColor: colors.danger1, borderColor: colors.danger1 }]}
      onPress={handleDeleteOldTasks}
    >
      <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>Удалить все</Text>
    </TouchableOpacity>
  </View>
</Modal>
)}

 {/* Модалка добавления задачи */}
{showAddModal && (
<Modal
  visible
  onClose={() => {
    setNewTask({ 
      title: '', 
      date: new Date().toISOString().split('T')[0],
      deadline: new Date().toISOString().split('T')[0],
      priority: 2,
      comment: '',
    });
    setEditingTask(null);
    setShowAddModal(false);
  }}
  title={editingTask ? "Редактировать задачу" : "Новая задача"}
>

  <Input
    label="Название задачи"
    placeholder="Например: Купить продукты"
    value={newTask.title}
    onChangeText={(text) => setNewTask({ ...newTask, title: text })}
  />

<DatePicker
  label="Дата (когда планируете)"
  value={newTask.date}
  onChangeDate={(date) => {
    console.log('📅 Выбрана дата:', date);
    setNewTask({ 
      ...newTask, 
      date: date,
      deadline: date,
    });
  }}
/>

<DatePicker
  label="Срок (deadline)"
  value={newTask.deadline}
  onChangeDate={(date) => {
    console.log('⏰ Выбран срок:', date);
    setNewTask({ ...newTask, deadline: date });
  }}
/>


  {/* Приоритет */}
<View style={styles.formGroup}>
  <Text style={[styles.formLabel, { color: colors.textMain }]}>
    Приоритет
  </Text>
  <View style={styles.priorityRow}>
    <TouchableOpacity
      style={[
        styles.priorityBtn,
        {
          backgroundColor: newTask.priority === 1 ? colors.danger1 : colors.surface,
          borderColor: newTask.priority === 1 ? colors.danger1 : colors.borderSubtle,
        },
      ]}
      onPress={() => setNewTask({ ...newTask, priority: 1 })}
    >
      <Text style={[styles.priorityBtnText, { color: newTask.priority === 1 ? '#020617' : colors.textMain }]}>
        ВЫСОКИЙ
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.priorityBtn,
        {
          backgroundColor: newTask.priority === 2 ? colors.accent1 : colors.surface,
          borderColor: newTask.priority === 2 ? colors.accent1 : colors.borderSubtle,
        },
      ]}
      onPress={() => setNewTask({ ...newTask, priority: 2 })}
    >
      <Text style={[styles.priorityBtnText, { color: newTask.priority === 2 ? '#020617' : colors.textMain }]}>
        СРЕДНИЙ
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.priorityBtn,
        {
          backgroundColor: newTask.priority === 3 ? colors.ok1 : colors.surface,
          borderColor: newTask.priority === 3 ? colors.ok1 : colors.borderSubtle,
        },
      ]}
      onPress={() => setNewTask({ ...newTask, priority: 3 })}
    >
      <Text style={[styles.priorityBtnText, { color: newTask.priority === 3 ? '#020617' : colors.textMain }]}>
        НИЗКИЙ
      </Text>
    </TouchableOpacity>
  </View>
</View>


  <Button
  title={editingTask ? "Сохранить" : "Добавить"}
  onPress={async () => {
    if (!newTask.title.trim()) {
      setError('Название задачи не может быть пусто');
      return;
    }

    try {
      setLoading(true);
      
      const taskToSend = {
        title: newTask.title,
        date: newTask.date,
        deadline: newTask.deadline,
        priority: newTask.priority,
        comment: newTask.comment || '',
        done: false,
        doneDate: null,
      };

      if (editingTask) {
        // РЕДАКТИРОВАНИЕ
        console.log('📝 Редактируем задачу:', editingTask.id);
        await tasksAPI.updateTask(editingTask.id, taskToSend);
        
        // Обновляем локально
        setTasks(tasks.map(t => 
          t.id === editingTask.id 
            ? {
                ...t,
                ...taskToSend,
                priority: taskToSend.priority === 1 ? 'high' : taskToSend.priority === 3 ? 'low' : 'medium',
                dueDate: taskToSend.deadline,
              }
            : t
        ));
        
      } else {
        // СОЗДАНИЕ
        console.log('➕ Создаём задачу');
        const createdTask = await tasksAPI.createTask(taskToSend);
        
        const formattedTask = {
          ...createdTask,
          priority: createdTask.priority === 1 ? 'high' : createdTask.priority === 3 ? 'low' : 'medium',
          dueDate: createdTask.deadline || createdTask.date,
        };
        
        setTasks([...tasks, formattedTask]);
      }
      
      // Очищаем форму
      setNewTask({ 
        title: '', 
        date: new Date().toISOString().split('T')[0],
        deadline: new Date().toISOString().split('T')[0],
        priority: 2,
        comment: '',
      });
      
      setEditingTask(null);
      setShowAddModal(false);
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError('Не удалось сохранить задачу: ' + err.message);
      setLoading(false);
    }
  }}
/>

{/* Кнопка удаления (только при редактировании) */}
{editingTask && (
  <TouchableOpacity
    style={[styles.deleteButton, { marginTop: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger1 }]}
    onPress={() => {
      setShowAddModal(false);
      setTaskToDelete(editingTask);
    }}
  >
    <Text style={{ color: colors.danger1, textAlign: 'center' }}>🗑️ Удалить задачу</Text>
  </TouchableOpacity>
)}
</Modal>
)}

{/* Модалка удаления */}
{taskToDelete && (
<Modal
  visible
  onClose={() => setTaskToDelete(null)}
  title="Удалить задачу?"
>
  <Text style={[styles.deleteModalText, { color: colors.textMain }]}>
    Задача "{taskToDelete.title}" будет удалена навсегда.
  </Text>
  
  <Text style={[styles.deleteModalWarning, { color: colors.textMuted }]}>
    Это действие нельзя отменить.
  </Text>
  
  <View style={styles.deleteModalButtons}>
    <TouchableOpacity
      style={[styles.deleteModalButton, { 
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
      }]}
      onPress={() => {
        console.log('❌ Отмена удаления');
        setTaskToDelete(null);
      }}
    >
      <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>
        Отмена
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.deleteModalButton, { 
        backgroundColor: colors.danger1,
        borderColor: colors.danger1,
      }]}
      onPress={() => {
        console.log('✅ Подтверждено удаление ID:', taskToDelete.id);
        deleteTask(taskToDelete.id);
        setTaskToDelete(null);
      }}
    >
      <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>
        Удалить
      </Text>
    </TouchableOpacity>
  </View>
</Modal>
)}

{/* Модалка добавления подзадачи */}
{showAddSubtaskModal && (
<Modal
  visible
  onClose={() => {
    setShowAddSubtaskModal(false);
    setNewSubtaskTitle('');
    setCurrentTaskForSubtask(null);
  }}
  title="Новая подзадача"
>
  <Input
    label="Название"
    placeholder="Например: Купить молоко"
    value={newSubtaskTitle}
    onChangeText={setNewSubtaskTitle}
  />
  
  <Button
    title="Добавить"
    onPress={addSubtask}
  />
</Modal>
)}

{/* Модалка выбора месяца */}
{showMonthPicker && (
<Modal
  visible
  onClose={() => setShowMonthPicker(false)}
  title="Выберите месяц"
>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
    {Array.from({ length: 12 }).map((_, i) => {
       const date = new Date(selectedDate.getFullYear(), i, 1);
       const isSelected = i === selectedDate.getMonth();
       return (
         <TouchableOpacity
           key={i}
           style={{
             padding: 10,
             backgroundColor: isSelected ? colors.accent1 : colors.surface,
             borderRadius: 8,
             borderWidth: 1,
             borderColor: colors.borderSubtle,
             width: '30%',
             alignItems: 'center'
           }}
           onPress={() => {
             const newDate = new Date(selectedDate.getFullYear(), i, 1);
             setSelectedDate(newDate);
             loadTasks(newDate);
             setShowMonthPicker(false);
           }}
         >
           <Text style={{ 
             color: isSelected ? '#000' : colors.textMain, 
             fontWeight: isSelected ? 'bold' : 'normal',
             textTransform: 'capitalize'
           }}>
             {date.toLocaleString('ru-RU', { month: 'short' })}
           </Text>
         </TouchableOpacity>
       );
    })}
  </View>
  
  {/* Переключатель года */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' }}>
    <TouchableOpacity onPress={() => {
       const newDate = new Date(selectedDate.getFullYear() - 1, selectedDate.getMonth(), 1);
       setSelectedDate(newDate);
    }}>
       <Text style={{ fontSize: 24, color: colors.textMain }}>←</Text>
    </TouchableOpacity>
    <Text style={{ fontSize: 18, color: colors.textMain, fontWeight: 'bold' }}>
       {selectedDate.getFullYear()}
    </Text>
    <TouchableOpacity onPress={() => {
       const newDate = new Date(selectedDate.getFullYear() + 1, selectedDate.getMonth(), 1);
       setSelectedDate(newDate);
    }}>
       <Text style={{ fontSize: 24, color: colors.textMain }}>→</Text>
    </TouchableOpacity>
  </View>
</Modal>
)}

    </Background>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.12,
    textTransform: 'uppercase',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeEmoji: {
    fontSize: 20,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#020617',
    textTransform: 'uppercase',
  },
 listContent: {
  padding: 16,
  paddingBottom: 100,
},
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  taskCompleted: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#020617',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
priorityBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
  minWidth: 70,
},
priorityText: {
  fontSize: 9,
  fontWeight: '600',
  color: '#020617',
  textTransform: 'uppercase',
  letterSpacing: 0.05,
},

  taskDate: {
    fontSize: 11,
  },
  buttonContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
statsContainer: {
  flexDirection: 'row',
  padding: 16,
  gap: 8,
},
filterContainer: {
  paddingHorizontal: 16,
  paddingBottom: 8,
},

filterText: {
  fontSize: 13,
  fontWeight: '600',
  letterSpacing: 0.06,
},
statCard: {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 4,
},
statNumber: {
  fontSize: 28,
  fontWeight: '700',
  marginBottom: 4,
},
statLabel: {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.08,
},
formGroup: {
  marginBottom: 16,
},
formLabel: {
  fontSize: 14,
  fontWeight: '500',
  marginBottom: 8,
  letterSpacing: 0.06,
},
priorityRow: {
  flexDirection: 'row',
  gap: 6,
},
priorityBtn: {
  flex: 1,
  paddingVertical: 8,
  paddingHorizontal: 4,
  borderRadius: 999,
  borderWidth: 1,
  alignItems: 'center',
},
priorityBtnText: {
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.05,
},
deleteButton: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
  justifyContent: 'center',
  alignItems: 'center',
},
taskMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
taskActions: {
  position: 'absolute',
  top: 8,
  right: 8,
  flexDirection: 'row',
  gap: 8,
  zIndex: 10,
},
actionButton: {
  width: 32,
  height: 32,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
},
statusBadge: {
  marginBottom: 6,
},
statusText: {
  fontSize: 9,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.08,
},
filterContainer: {
  paddingHorizontal: 16,
  paddingVertical: 8,
},
filterMenuButton: {
  width: 44,
  height: 44,
  borderRadius: 12,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
filterMenu: {
  marginTop: 8,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  gap: 12,
},
filterMenuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 8,
},
filterMenuItemText: {
  fontSize: 14,
  fontWeight: '500',
},
filterMenuLabel: {
  fontSize: 11,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.08,
  marginTop: 4,
},
filterMenuDivider: {
  height: 1,
  marginVertical: 4,
},
deleteModalText: {
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 12,
  textAlign: 'center',
},
deleteModalWarning: {
  fontSize: 12,
  textAlign: 'center',
  marginBottom: 24,
},
deleteModalButtons: {
  flexDirection: 'row',
  gap: 12,
},
deleteModalButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 999,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
deleteModalButtonText: {
  fontSize: 13,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.06,
},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
  fabIcon: {
    fontSize: 32,
    color: '#020617',
    fontWeight: 'bold',
    marginTop: -4,
  },
subtasksContainer: {
  marginLeft: 20,
  marginRight: 20,
  marginTop: -8,
  marginBottom: 12,
  padding: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(148, 163, 184, 0.2)',
},
subtaskItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  gap: 8,
},
subtaskCheckbox: {
  marginRight: 4,
},
subtaskTitle: {
  flex: 1,
  fontSize: 14,
},
subtaskDeleteBtn: {
  padding: 4,
},
addSubtaskBtn: {
  marginTop: 8,
  paddingVertical: 8,
  alignItems: 'center',
},
addSubtaskBtnText: {
  fontSize: 13,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.06,
},
swipeActionRight: {
  backgroundColor: '#FF4444',
  justifyContent: 'center',
  alignItems: 'flex-end',
  paddingHorizontal: 20,
  borderRadius: 12,
  flex: 1,
},
swipeActionLeft: {
  backgroundColor: '#22C55E',
  justifyContent: 'center',
  alignItems: 'flex-start',
  paddingHorizontal: 20,
  borderRadius: 12,
  flex: 1,
},
swipeActionText: {
  fontSize: 24,
  color: 'white',
},
chipsContainer: {
  flexDirection: 'row',
  gap: 8,
  paddingHorizontal: 16,
  paddingBottom: 8,
},
chip: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
},
chipText: {
  fontSize: 12,
  fontWeight: '600',
},
});

export default TasksScreen;

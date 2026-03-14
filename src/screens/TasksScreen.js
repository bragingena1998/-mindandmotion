// src/screens/TasksScreen.js
// Этап 1: время, цикличность, фокус-сессия по свайпу влево, кнопка редактирования

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
  Animated,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import Background from '../components/Background';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../services/api';
import { getToken } from '../services/storage';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import FocusSessionModal from '../components/FocusSessionModal';

const toMysqlFormat = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const tasksAPI = {
  getTasks: async (params) => {
    const response = await api.get('/tasks', { params });
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
  stopRecurring: async (id) => {
    const response = await api.put(`/tasks/${id}/stop-recurring`);
    return response.data;
  },
  addFocusSession: async (id) => {
    const response = await api.post(`/tasks/${id}/focus`);
    return response.data;
  },
};


// === ПОДЗАДАЧА ===
const SubtaskItem = React.memo(({ subtask, parentId, colors, onToggle, onDelete }) => {
  const isCompleted = !!subtask.completed;

  return (
    <View style={styles.subtaskItem}>
      <TouchableOpacity onPress={() => onToggle(subtask.id, parentId)} style={styles.subtaskCheckbox}>
        <View style={[
          styles.checkbox,
          { width: 20, height: 20, borderColor: isCompleted ? colors.ok1 : colors.borderSubtle, backgroundColor: isCompleted ? colors.ok1 : 'transparent' }
        ]}>
          {isCompleted && <Text style={[styles.checkmark, { fontSize: 12 }]}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text style={[
        styles.subtaskTitle,
        { color: isCompleted ? colors.textMuted : colors.textMain },
        isCompleted && { textDecorationLine: 'line-through' }
      ]}>
        {subtask.title || '(без названия)'}
      </Text>
      <TouchableOpacity onPress={() => onDelete(subtask.id, parentId)} style={styles.subtaskDeleteBtn}>
        <Text style={{ fontSize: 14 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
});


const TasksScreen = ({ navigation }) => {
  const { colors, spacing, theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [showMonthPicker, setShowMonthPicker] = useState(false); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null); 
  const [sortBy, setSortBy] = useState('date');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Фокус-сессия
  const [focusTask, setFocusTask] = useState(null); // задача для которой запускаем фокус
  const swipeableRefs = useRef({});
  
  const [newTask, setNewTask] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    deadline: new Date().toISOString().split('T')[0],
    time: null,
    priority: 2,
    comment: '',
    isrecurring: 0,
    recurrencetype: null,
  });
  
  const [stats, setStats] = useState({ today: 0, todayPlan: 0, week: 0, month: 0, total: 0 });
  
  // Подзадачи
  const [expandedTasks, setExpandedTasks] = useState({}); 
  const [subtasks, setSubtasks] = useState({}); 
  const [loadingSubtasks, setLoadingSubtasks] = useState({});
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [currentTaskForSubtask, setCurrentTaskForSubtask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Чистка старых задач
  const [showOverdueCleanupModal, setShowOverdueCleanupModal] = useState(false);
  const [overdueTasksList, setOverdueTasksList] = useState([]);


  useEffect(() => {
    loadTasks();
  }, []);

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

  const loadTasks = async (date = selectedDate) => { 
    try {
      setError('');
      const token = await getToken();
      if (!token) return;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const targetMonth = date.getMonth();
      const targetYear = date.getFullYear();
      const isCurrentMonth = (targetMonth === currentMonth && targetYear === currentYear);

      let params = {};
      if (!isCurrentMonth) {
        params = { month: targetMonth, year: targetYear };
      }

      let tasksData = [];
      if (isCurrentMonth) {
        const [tasksRes] = await Promise.all([tasksAPI.getTasks(params), loadStats()]);
        tasksData = tasksRes;
      } else {
        tasksData = await tasksAPI.getTasks(params);
      }
      
      const formattedTasks = tasksData.map(task => ({
        ...task,
        priority: task.priority === 1 ? 'high' : task.priority === 3 ? 'low' : 'medium',
        dueDate: task.deadline || task.date,
        completed: task.done || false,
        time: task.time || null,
        isrecurring: task.isrecurring || 0,
        recurrencetype: task.recurrencetype || null,
        focusSessions: task.focusSessions || 0,
      }));
      
      setTasks(formattedTasks);
      
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

  const checkOverdueTasks = async (allTasks) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

      const oldTasks = allTasks.filter(t => {
        if (t.completed) return false;
        const taskDate = t.deadline ? t.deadline.split('T')[0] : (t.date ? t.date.split('T')[0] : null);
        return taskDate && taskDate < oneWeekAgoStr;
      });

      if (oldTasks.length > 0) {
        setOverdueTasksList(oldTasks);
        setShowOverdueCleanupModal(true);
        await AsyncStorage.setItem('lastOverdueCheckDate', todayStr);
      }
    } catch (e) {
      console.error('Ошибка проверки просрочки:', e);
    }
  };

  const handleDeleteOldTasks = async () => {
    try {
      setLoading(true);
      await Promise.all(overdueTasksList.map(t => tasksAPI.deleteTask(t.id)));
      setShowOverdueCleanupModal(false);
      setOverdueTasksList([]);
      await loadTasks(); 
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить все задачи');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const toggleTask = async (taskId) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      );

      const newDoneState = !taskToUpdate.completed;
      const newDoneDate = newDoneState ? toMysqlFormat(new Date()) : null;

      await tasksAPI.updateTask(taskId, {
        title: taskToUpdate.title,
        date: taskToUpdate.date,
        deadline: taskToUpdate.deadline,
        priority: taskToUpdate.priority === 'high' ? 1 : taskToUpdate.priority === 'low' ? 3 : 2,
        comment: taskToUpdate.comment || '',
        done: newDoneState, 
        doneDate: newDoneDate,
        time: taskToUpdate.time,
        isrecurring: taskToUpdate.isrecurring,
        recurrencetype: taskToUpdate.recurrencetype
      });
      
      if (newDoneState && taskToUpdate.isrecurring) {
        setTimeout(() => loadTasks(), 1000); 
      }

      await loadStats(); 
      
    } catch (error) {
      console.error('❌ Ошибка переключения задачи:', error);
      loadTasks();
    }
  };

  const deleteTask = useCallback(async (taskId) => {
    try {
      setTasks((prevTasks) => prevTasks.filter(task => task.id !== taskId));
      await tasksAPI.deleteTask(taskId);
    } catch (error) {
      loadTasks();
      Alert.alert('Ошибка', 'Не удалось удалить задачу');
    }
  }, []);

  // Остановка повторений — через новый endpoint
  const stopRecurring = async (taskId) => {
    try {
      await tasksAPI.stopRecurring(taskId);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, isrecurring: 0, recurrencetype: null } : task
        )
      );
      setEditingTask(prev => prev ? { ...prev, isrecurring: 0, recurrencetype: null } : prev);
      Alert.alert('Успешно', 'Повторения для этой задачи отключены.');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отключить повторения');
    }
  };

  // Завершение фокус-сессии — записываем +1 на сервер
  const handleFocusComplete = async (taskId) => {
    try {
      await tasksAPI.addFocusSession(taskId);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, focusSessions: (task.focusSessions || 0) + 1 } : task
        )
      );
    } catch (err) {
      console.error('Focus session save error:', err);
    }
  };

  const loadSubtasks = async (taskId) => {
    try {
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: true }));
      const response = await api.get(`/tasks/${taskId}/subtasks`);
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formattedSubtasks = rawData.map(st => ({
          ...st,
          completed: Boolean(st.completed || st.done),
      }));
      setSubtasks(prev => ({ ...prev, [taskId]: formattedSubtasks }));
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, subtasks_count: formattedSubtasks.length } : task
        )
      );
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
    } catch (err) {
      setSubtasks(prev => ({ ...prev, [taskId]: [] })); 
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const toggleExpand = (taskId) => {
    const isExpanded = expandedTasks[taskId];
    if (!isExpanded) loadSubtasks(taskId);
    setExpandedTasks(prev => ({ ...prev, [taskId]: !isExpanded }));
  };

  const toggleSubtask = async (subtaskId, taskId) => {
    try {
      await api.put(`/subtasks/${subtaskId}/toggle`);
      setSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(st => 
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        )
      }));
    } catch (err) {}
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !currentTaskForSubtask) return;
    try {
      const response = await api.post(`/tasks/${currentTaskForSubtask}/subtasks`, { title: newSubtaskTitle });
      const newSubtask = { ...response.data, completed: false };
      setSubtasks(prev => {
        const currentList = prev[currentTaskForSubtask] || [];
        const newList = [...currentList, newSubtask];
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === currentTaskForSubtask ? { ...task, subtasks_count: newList.length } : task
          )
        );
        return { ...prev, [currentTaskForSubtask]: newList };
      });
      setNewSubtaskTitle('');
      setShowAddSubtaskModal(false);
      setCurrentTaskForSubtask(null);
    } catch (err) {}
  };

  const deleteSubtask = async (subtaskId, taskId) => {
    try {
      await api.delete(`/subtasks/${subtaskId}`);
      setSubtasks(prev => {
        const currentList = prev[taskId] || [];
        const newList = currentList.filter(st => st.id !== subtaskId);
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, subtasks_count: newList.length } : task
          )
        );
        return { ...prev, [taskId]: newList };
      });
    } catch (err) {}
  };


  const handleEditTask = (task) => {
    setNewTask({
      title: task.title,
      date: task.date.split('T')[0],
      deadline: task.deadline.split('T')[0],
      time: task.time || null,
      priority: task.priority === 'high' ? 1 : task.priority === 'low' ? 3 : 2,
      comment: task.comment || '',
      isrecurring: task.isrecurring || 0,
      recurrencetype: task.recurrencetype || null
    });
    setEditingTask(task);
    setShowAdvancedSettings(!!(task.time || task.isrecurring));
    setShowAddModal(true);
  };


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
    let result = '';

    if (!deadlineStr || dateStr === deadlineStr) {
      result = formatDate(dateStr);
    } else {
      const dateObj = new Date(dateStr);
      const deadlineObj = new Date(deadlineStr);
      const dayStart = String(dateObj.getDate()).padStart(2, '0');
      const dayEnd = String(deadlineObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      if (dateObj.getMonth() === deadlineObj.getMonth() && dateObj.getFullYear() === deadlineObj.getFullYear()) {
        result = `${dayStart}-${dayEnd}.${month}.${year}`;
      } else {
        result = `${formatDate(dateStr)} - ${formatDate(deadlineStr)}`;
      }
    }
    
    if (task.time) result += ` • ${task.time}`;
    if (task.isrecurring) result += ` 🔄`;
    if (task.focusSessions > 0) result += ` 🎯${task.focusSessions}`;
    
    return result;
  };

  const filteredTasks = hideCompleted ? tasks.filter(t => !t.completed) : tasks;

  const getTaskStatus = (task) => {
    const today = new Date().toISOString().split('T')[0];
    const startDate = task.date ? task.date.split('T')[0] : today;
    const endDate = task.deadline ? task.deadline.split('T')[0] : startDate;
    if (today >= startDate && today <= endDate) return 'today';
    if (endDate < today) return 'overdue';
    return 'future';
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'date') {
      const statusA = getTaskStatus(a);
      const statusB = getTaskStatus(b);
      const categoryOrder = { overdue: 1, today: 2, future: 3 };
      if (categoryOrder[statusA] !== categoryOrder[statusB]) {
        return categoryOrder[statusA] - categoryOrder[statusB];
      }
      const deadlineA = a.deadline ? a.deadline.split('T')[0] : a.date.split('T')[0];
      const deadlineB = b.deadline ? b.deadline.split('T')[0] : b.date.split('T')[0];
      const dateDiff = new Date(deadlineA) - new Date(deadlineB);
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.time || '23:59';
      const timeB = b.time || '23:59';
      return timeA.localeCompare(timeB);
    }
    if (sortBy === 'priority') {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'ru');
    return 0;
  });


  // === РЕНДЕР ЗАДАЧИ ===
  const renderTask = ({ item }) => {
    const isExpanded = expandedTasks[item.id];
    const taskSubtasks = subtasks[item.id] || [];
    const isLoadingSubtasks = loadingSubtasks[item.id];
    
    const getPriorityColor = () => {
      switch (item.priority) {
        case 'high': return colors.danger1;
        case 'medium': return colors.accent1;
        case 'low': return colors.ok1;
        default: return colors.textMuted;
      }
    };
    
    const taskStatus = getTaskStatus(item);
    const getStatusColor = () => {
      if (item.completed) return colors.textMuted;
      if (taskStatus === 'overdue') return colors.danger1;
      if (taskStatus === 'today') return colors.ok1;
      return colors.borderSubtle;
    };

    // СВАЙП ВЛЕВО — Концентрат (фокус-сессия)
    const renderLeftActions = (progress, dragX) => {
      const scale = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [0.8, 1],
        extrapolate: 'clamp',
      });
      return (
        <View style={styles.swipeActionLeft}>
          <Animated.Text style={[styles.swipeActionText, { transform: [{ scale }] }]}>
            🎯
          </Animated.Text>
          <Animated.Text style={[{ fontSize: 10, color: '#020617', fontWeight: '700', marginTop: 2 }, { transform: [{ scale }] }]}>
            ФОКУС
          </Animated.Text>
        </View>
      );
    };

    // СВАЙП ВПРАВО — Удалить
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

    const onSwipeableOpen = (direction) => {
      if (direction === 'left') {
        // Закрываем свайп и открываем модалку фокус-сессии
        swipeableRefs.current[item.id]?.close();
        setFocusTask(item);
      }
      if (direction === 'right') {
        setTaskToDelete(item);
      }
    };

    return (
      <View style={{ marginBottom: 12 }}>
        <Swipeable
          ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
          renderLeftActions={renderLeftActions}
          renderRightActions={renderRightActions}
          onSwipeableOpen={onSwipeableOpen}
          containerStyle={{ borderRadius: 12, overflow: 'hidden' }}
          friction={2}
        >
          <TouchableOpacity
            style={[
              styles.taskItem,
              {
                backgroundColor: colors.surface,
                borderColor: getStatusColor(),
                borderWidth: 2,
                opacity: item.completed ? 0.6 : 1,
                marginBottom: 0,
                borderRadius: 12,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => toggleExpand(item.id)}
          >
            <TouchableOpacity 
              style={styles.checkboxArea}
              onPress={(e) => { e.stopPropagation(); toggleTask(item.id); }}
            >
              <View style={[
                styles.checkbox,
                { borderColor: getStatusColor(), backgroundColor: item.completed ? getStatusColor() : 'transparent' }
              ]}>
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>

            <View style={styles.taskContent}>
              <Text
                style={[styles.taskTitle, { color: item.completed ? colors.textMuted : colors.textMain, paddingRight: 30 }]}
                numberOfLines={isExpanded ? 0 : 2}
              >
                {item.title}
              </Text>

              {!item.completed && (
                <View style={styles.statusBadge}>
                  {taskStatus === 'overdue' && <Text style={[styles.statusText, { color: colors.danger1 }]}>🔥 ПРОСРОЧЕНО</Text>}
                  {taskStatus === 'today' && <Text style={[styles.statusText, { color: colors.ok1 }]}>⚡ СЕГОДНЯ</Text>}
                  {taskStatus === 'future' && <Text style={[styles.statusText, { color: colors.textMuted }]}>📅 В ПЛАНЕ</Text>}
                </View>
              )}

              <View style={styles.taskMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
                  <Text style={styles.priorityText}>
                    {item.priority === 'high' ? 'Высокий' : item.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </Text>
                </View>
                <Text style={[styles.taskDate, { color: colors.textMuted }]}>
                  {formatTaskDate(item)}
                </Text>
                {((item.subtasks_count > 0) || taskSubtasks.length > 0) && (
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>
                    📋 {taskSubtasks.length > 0 ? taskSubtasks.length : item.subtasks_count}
                  </Text>
                )}
              </View>
            </View>

            {/* Кнопка редактирования */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={(e) => { e.stopPropagation(); handleEditTask(item); }}
            >
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>

            <View style={{ paddingLeft: 8, justifyContent: 'flex-end', paddingBottom: 5 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>
        </Swipeable>

        {isExpanded && (
          <View style={[styles.subtasksContainer, { backgroundColor: colors.surface }]}>
            {isLoadingSubtasks ? (
              <ActivityIndicator size="small" color={colors.accent1} />
            ) : (
              <>
                {taskSubtasks.length === 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Нет подзадач</Text>
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
                  onPress={() => { setCurrentTaskForSubtask(item.id); setShowAddSubtaskModal(true); }}
                >
                  <Text style={[styles.addSubtaskBtnText, { color: colors.accent1 }]}>+ Добавить подзадачу</Text>
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
          <Text style={[styles.headerTitle, { color: colors.accentText }]}>МОИ ЗАДАЧИ</Text>
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

        {/* Статистика */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
            <Text style={[styles.statNumber, { color: colors.accentText }]}>{stats.today}/{stats.todayPlan}</Text>
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

        {/* Фильтры/сортировка */}
        <View style={styles.chipsContainer}>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: hideCompleted ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
            onPress={() => setHideCompleted(!hideCompleted)}
          >
            <Text style={[styles.chipText, { color: hideCompleted ? '#020617' : colors.textMuted, fontSize: 13, fontWeight: '700' }]}>
              {hideCompleted ? 'Скрыты ✅' : 'Все задачи'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            onPress={() => {
              const nextSort = sortBy === 'date' ? 'priority' : sortBy === 'priority' ? 'title' : 'date';
              setSortBy(nextSort);
            }}
          >
            <Text style={[styles.chipText, { color: colors.textMain, fontSize: 13, fontWeight: '700' }]}>
              {sortBy === 'date' && '📅 По дате'}
              {sortBy === 'priority' && '🔥 По важности'}
              {sortBy === 'title' && 'abc По имени'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={sortedTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent1} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>У вас пока нет задач</Text>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent1 }]}
          onPress={() => {
            setNewTask({ 
              title: '', 
              date: new Date().toISOString().split('T')[0],
              deadline: new Date().toISOString().split('T')[0],
              time: null, priority: 2, comment: '', isrecurring: 0, recurrencetype: null
            });
            setEditingTask(null);
            setShowAdvancedSettings(false);
            setShowAddModal(true);
          }}
        >
          <Text style={[styles.fabIcon, { color: colors.background }]}>+</Text>
        </TouchableOpacity>
      </View>
      </GestureHandlerRootView>


      {/* ========== МОДАЛКИ ========== */}

      {/* Фокус-сессия */}
      {focusTask && (
        <FocusSessionModal
          visible={!!focusTask}
          task={focusTask}
          onClose={() => setFocusTask(null)}
          onComplete={() => {
            handleFocusComplete(focusTask.id);
            setFocusTask(null);
          }}
        />
      )}

      {/* Чистка просроченных */}
      {showOverdueCleanupModal && (
        <Modal visible onClose={() => setShowOverdueCleanupModal(false)} title="🔥 Старые задачи">
          <Text style={[styles.deleteModalText, { color: colors.textMain, textAlign: 'left', marginBottom: 4 }]}>
            У вас накопились просроченные задачи (более 7 дней).
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
            Всего: {overdueTasksList.length} шт. Рекомендуем очистить список для мотивации.
          </Text>
          <View style={{ maxHeight: 200, marginBottom: 16 }}>
            <FlatList 
              data={overdueTasksList}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Text style={{ color: colors.danger1 }}>•</Text>
                  <Text style={{ color: colors.textMain, fontSize: 14 }} numberOfLines={1}>{item.title}</Text>
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

      {/* Модалка добавления/редактирования */}
      {showAddModal && (
        <Modal
          visible
          onClose={() => setShowAddModal(false)}
          title={editingTask ? 'Редактировать задачу' : 'Новая задача'}
        >
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
            <Input
              label="Название задачи"
              placeholder="Например: Купить продукты"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />
            <DatePicker
              label="Дата (когда планируете)"
              value={newTask.date}
              onChangeDate={(date) => setNewTask({ ...newTask, date: date, deadline: date })}
            />
            <DatePicker
              label="Срок (deadline)"
              value={newTask.deadline}
              onChangeDate={(date) => setNewTask({ ...newTask, deadline: date })}
            />

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textMain }]}>Приоритет</Text>
              <View style={styles.priorityRow}>
                {[{val: 1, label: 'ВЫСОКИЙ', activeColor: colors.danger1}, {val: 2, label: 'СРЕДНИЙ', activeColor: colors.accent1}, {val: 3, label: 'НИЗКИЙ', activeColor: colors.ok1}].map(p => (
                  <TouchableOpacity
                    key={p.val}
                    style={[
                      styles.priorityBtn,
                      { backgroundColor: newTask.priority === p.val ? p.activeColor : colors.surface, borderColor: newTask.priority === p.val ? p.activeColor : colors.borderSubtle }
                    ]}
                    onPress={() => setNewTask({ ...newTask, priority: p.val })}
                  >
                    <Text style={[styles.priorityBtnText, { color: newTask.priority === p.val ? '#020617' : colors.textMain }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Раскрывашка доп. настройки */}
            <TouchableOpacity 
              style={[styles.advancedToggle, { borderColor: colors.borderSubtle }]}
              onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <Text style={{ color: colors.textMain, fontWeight: '600' }}>
                {showAdvancedSettings ? '▼ Скрыть доп. настройки' : '▶ Дополнительные настройки'}
              </Text>
            </TouchableOpacity>

            {showAdvancedSettings && (
              <View style={styles.advancedSettings}>
                <TimePicker
                  label="Точное время (необязательно)"
                  value={newTask.time}
                  onChangeTime={(time) => setNewTask({ ...newTask, time })}
                />
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Повторение</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { val: null, label: 'Без повторений' },
                      { val: 'daily', label: '📅 Каждый день' },
                      { val: 'weekly', label: '📅 Каждую неделю' },
                      { val: 'monthly', label: '📅 Каждый месяц' }
                    ].map(item => (
                      <TouchableOpacity
                        key={String(item.val)}
                        style={[
                          styles.chip,
                          { 
                            backgroundColor: newTask.recurrencetype === item.val ? colors.accent1 : colors.surface,
                            borderColor: colors.borderSubtle,
                            paddingVertical: 6, paddingHorizontal: 10
                          }
                        ]}
                        onPress={() => setNewTask({ ...newTask, isrecurring: item.val ? 1 : 0, recurrencetype: item.val })}
                      >
                        <Text style={[styles.chipText, { color: newTask.recurrencetype === item.val ? '#020617' : colors.textMuted }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <Button
                title={editingTask ? 'Сохранить' : 'Добавить'}
                onPress={async () => {
                  if (!newTask.title.trim()) {
                    Alert.alert('Ошибка', 'Название задачи не может быть пустым');
                    return;
                  }
                  try {
                    setLoading(true);
                    const taskToSend = {
                      title: newTask.title,
                      date: newTask.date,
                      deadline: newTask.deadline,
                      time: newTask.time,
                      priority: newTask.priority,
                      comment: newTask.comment || '',
                      done: false,
                      doneDate: null,
                      isrecurring: newTask.isrecurring,
                      recurrencetype: newTask.recurrencetype
                    };
                    if (editingTask) {
                      await tasksAPI.updateTask(editingTask.id, taskToSend);
                    } else {
                      await tasksAPI.createTask(taskToSend);
                    }
                    setShowAddModal(false);
                    setTimeout(() => loadTasks(), 300);
                  } catch (err) {
                    Alert.alert('Ошибка', 'Не удалось сохранить задачу: ' + err.message);
                    setLoading(false);
                  }
                }}
              />
            </View>

            {/* Кнопка остановки повторений */}
            {editingTask && editingTask.isrecurring === 1 && (
              <TouchableOpacity
                style={[styles.deleteButton, { marginTop: 12, borderWidth: 1, borderColor: colors.accent1 }]}
                onPress={() => stopRecurring(editingTask.id)}
              >
                <Text style={{ color: colors.accentText, textAlign: 'center' }}>🔄 Остановить повторения</Text>
              </TouchableOpacity>
            )}

            {/* Кнопка удаления */}
            {editingTask && (
              <TouchableOpacity
                style={[styles.deleteButton, { marginTop: 12, borderWidth: 1, borderColor: colors.danger1 }]}
                onPress={() => { setShowAddModal(false); setTaskToDelete(editingTask); }}
              >
                <Text style={{ color: colors.danger1, textAlign: 'center' }}>🗑️ Удалить задачу</Text>
              </TouchableOpacity>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      )}

      {/* Модалка удаления */}
      {taskToDelete && (
        <Modal visible onClose={() => setTaskToDelete(null)} title="Удалить задачу?">
          <Text style={[styles.deleteModalText, { color: colors.textMain }]}>
            Задача "{taskToDelete.title}" будет удалена.
          </Text>
          <Text style={[styles.deleteModalWarning, { color: colors.textMuted }]}>Это действие нельзя отменить.</Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={[styles.deleteModalButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setTaskToDelete(null)}
            >
              <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteModalButton, { backgroundColor: colors.danger1, borderColor: colors.danger1 }]}
              onPress={() => { deleteTask(taskToDelete.id); setTaskToDelete(null); }}
            >
              <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Модалка добавления подзадачи */}
      {showAddSubtaskModal && (
        <Modal
          visible
          onClose={() => { setShowAddSubtaskModal(false); setNewSubtaskTitle(''); setCurrentTaskForSubtask(null); }}
          title="Новая подзадача"
        >
          <Input label="Название" placeholder="Например: Купить молоко" value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} />
          <Button title="Добавить" onPress={addSubtask} />
        </Modal>
      )}

      {/* Модалка выбора месяца */}
      {showMonthPicker && (
        <Modal visible onClose={() => setShowMonthPicker(false)} title="Выберите месяц">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const date = new Date(selectedDate.getFullYear(), i, 1);
              const isSelected = i === selectedDate.getMonth();
              return (
                <TouchableOpacity
                  key={i}
                  style={{ padding: 10, backgroundColor: isSelected ? colors.accent1 : colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, width: '30%', alignItems: 'center' }}
                  onPress={() => { const newDate = new Date(selectedDate.getFullYear(), i, 1); setSelectedDate(newDate); loadTasks(newDate); setShowMonthPicker(false); }}
                >
                  <Text style={{ color: isSelected ? '#000' : colors.textMain, fontWeight: isSelected ? 'bold' : 'normal', textTransform: 'capitalize' }}>
                    {date.toLocaleString('ru-RU', { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear() - 1, selectedDate.getMonth(), 1))}>
              <Text style={{ fontSize: 24, color: colors.textMain }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, color: colors.textMain, fontWeight: 'bold' }}>{selectedDate.getFullYear()}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear() + 1, selectedDate.getMonth(), 1))}>
              <Text style={{ fontSize: 24, color: colors.textMain }}>→</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

    </Background>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.25)' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.12, textTransform: 'uppercase' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  listContent: { padding: 16, paddingBottom: 100 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkboxArea: { paddingRight: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  checkmark: { fontSize: 14, fontWeight: 'bold', color: '#020617' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, minWidth: 60, alignItems: 'center' },
  priorityText: { fontSize: 9, fontWeight: '600', color: '#020617', textTransform: 'uppercase', letterSpacing: 0.05 },
  taskDate: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', elevation: 4 },
  statNumber: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.08 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, letterSpacing: 0.06 },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  priorityBtnText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.05 },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  statusBadge: { marginBottom: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.08 },
  deleteModalText: { fontSize: 15, lineHeight: 22, marginBottom: 12, textAlign: 'center' },
  deleteModalWarning: { fontSize: 12, textAlign: 'center', marginBottom: 24 },
  deleteModalButtons: { flexDirection: 'row', gap: 12 },
  deleteModalButton: { flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteModalButtonText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.06 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, zIndex: 100 },
  fabIcon: { fontSize: 32, fontWeight: 'bold', marginTop: -4 },
  subtasksContainer: { marginLeft: 20, marginRight: 20, marginTop: -8, marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  subtaskTitle: { flex: 1, fontSize: 14 },
  subtaskDeleteBtn: { padding: 4 },
  addSubtaskBtn: { marginTop: 8, paddingVertical: 8, alignItems: 'center' },
  addSubtaskBtnText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.06 },
  swipeActionLeft: { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12, flex: 1 },
  swipeActionRight: { backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, borderRadius: 12, flex: 1 },
  swipeActionText: { fontSize: 24, color: 'white' },
  chipsContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  editButton: { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 10 },
  advancedToggle: { padding: 12, borderWidth: 1, borderRadius: 8, marginVertical: 8, alignItems: 'center' },
  advancedSettings: { padding: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)', borderRadius: 8, marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.05)' },
  subtaskCheckbox: { padding: 2 },
});

export default TasksScreen;

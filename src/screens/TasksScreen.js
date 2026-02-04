// src/screens/TasksScreen.js
// Экран задач с вашими стилями

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl, 
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import Background from '../components/Background';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../services/api';
import { getToken } from '../services/storage';
import { tasksAPI } from '../services/api';


const TasksScreen = ({ navigation }) => {
  const { colors, spacing, changeTheme, theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
const [showAddModal, setShowAddModal] = useState(false);
const [hideCompleted, setHideCompleted] = useState(true);
const [editingTask, setEditingTask] = useState(null);
const [sortBy, setSortBy] = useState('date');
const [showFilterMenu, setShowFilterMenu] = useState(false);
const [newTask, setNewTask] = useState({
  title: '',
  date: new Date().toISOString().split('T')[0],  // Дата планирования
  deadline: new Date().toISOString().split('T')[0],  // Срок
  priority: 2,  // 1=высокий, 2=средний, 3=низкий (как на сайте)
  comment: '',
});



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

const loadTasks = async () => {
  try {
    setError('');
    const token = await getToken();
    
    if (!token) {
      navigation.replace('Login');
      return;
    }

    // Загружаем реальные задачи с API
    const data = await tasksAPI.getTasks();
    console.log('🔍 RAW данные с API:', JSON.stringify(data, null, 2));
    
  // Преобразуем приоритеты из чисел (1,2,3) в строки (high, medium, low)
const formattedTasks = data.map(task => ({
  ...task,
  priority: task.priority === 1 ? 'high' : task.priority === 3 ? 'low' : 'medium',
  dueDate: task.deadline || task.date,
  completed: task.done || false, // ← ДОБАВЬ ЭТУ СТРОКУ
}));

    
    setTasks(formattedTasks);
    setLoading(false);
  } catch (err) {
    console.error('Ошибка загрузки задач:', err);
    setError('Ошибка загрузки задач');
    setTasks([]);
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

    // Оптимистичное обновление UI
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    // Формируем данные для отправки (как бэкенд ожидает)
    const updatedTaskData = {
      title: taskToUpdate.title,
      date: taskToUpdate.date,
      deadline: taskToUpdate.deadline,
      priority: taskToUpdate.priority === 'high' ? 1 : taskToUpdate.priority === 'low' ? 3 : 2,
      comment: taskToUpdate.comment || '',
      done: !taskToUpdate.completed, // Переключаем
      doneDate: !taskToUpdate.completed ? new Date().toISOString().split('T')[0] : null,
    };

    // Отправляем на сервер через updateTask
    await tasksAPI.updateTask(taskId, updatedTaskData);
    
  } catch (error) {
    console.error('❌ Ошибка переключения задачи:', error);
    // Откатываем изменения при ошибке
    loadTasks();
  }
};



const deleteTask = async (taskId) => {
  console.log('🗑️ Попытка удаления задачи:', taskId);
  
  try {
    // Удаляем на сервере
    console.log('📡 Отправляем запрос на сервер...');
    await tasksAPI.deleteTask(taskId);
    console.log('✅ Задача удалена на сервере');
    
    // Удаляем из локального массива
    setTasks(prevTasks => {
      const newTasks = prevTasks.filter(t => t.id !== taskId);
      console.log('🔄 Обновлён локальный список:', newTasks.length, 'задач');
      return newTasks;
    });
    
  } catch (err) {
    console.error('❌ Ошибка удаления задачи:', err);
    Alert.alert('Ошибка', 'Не удалось удалить задачу: ' + err.message);
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
const handleLogout = async () => {
  await AsyncStorage.removeItem('token');
  navigation.replace('Login');
};


// Расчёт статистики (как на сайте)
const today = new Date();
const todayStr = today.toISOString().split('T')[0]; // '2026-02-03'

// Начало недели (понедельник)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const startOfWeek = getStartOfWeek(today);
const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

// Начало месяца
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

// Подсчёт (используем doneDate из БД!)
const completedToday = tasks.filter(t => {
  if (!t.completed || !t.doneDate) return false;
  const doneDate = new Date(t.doneDate).toISOString().split('T')[0];
  return doneDate === todayStr;
}).length;

const completedWeek = tasks.filter(t => {
  if (!t.completed || !t.doneDate) return false;
  const doneDate = new Date(t.doneDate).toISOString().split('T')[0];
  return doneDate >= startOfWeekStr;
}).length;

const completedMonth = tasks.filter(t => {
  if (!t.completed || !t.doneDate) return false;
  const doneDate = new Date(t.doneDate);
  return doneDate.getMonth() === today.getMonth() && 
         doneDate.getFullYear() === today.getFullYear();
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
  const today = new Date().toISOString().split('T')[0];
  const startDate = task.date;
  const endDate = task.deadline || task.date;
  
  // Если сегодня попадает в диапазон [startDate, endDate] - задача актуальна
  if (today >= startDate && today <= endDate) return 'today';
  
  // Если дедлайн уже прошёл - просрочено
  if (endDate < today) return 'overdue';
  
  // Если задача ещё в будущем
  return 'future';
};


// Сортировка задач
const sortedTasks = [...filteredTasks].sort((a, b) => {
  if (sortBy === 'date') {
    // УМНАЯ СОРТИРОВКА ПО ДАТЕ
    const today = new Date().toISOString().split('T')[0];
    
    const deadlineA = a.deadline || a.date;
    const deadlineB = b.deadline || b.date;
    
    // Категоризация задач
    const getCategoryOrder = (deadline) => {
      if (deadline < today) return 1; // Просроченные (красные) - сверху
      if (deadline === today) return 2; // Сегодняшние (зелёные) - в середине
      return 3; // Будущие (приглушённые) - внизу
    };
    
    const categoryA = getCategoryOrder(deadlineA);
    const categoryB = getCategoryOrder(deadlineB);
    
    // Сначала по категориям
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    // Внутри категории - по дате
    return new Date(deadlineA) - new Date(deadlineB);
  }
  
  if (sortBy === 'priority') {
    // По приоритету (высокий -> средний -> низкий)
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }
  
  if (sortBy === 'title') {
    // По названию (А -> Я)
    return a.title.localeCompare(b.title, 'ru');
  }
  
  return 0;
});



// Рендер одной задачи
const renderTask = ({ item }) => {
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
    if (item.completed) return colors.borderSubtle;
    if (taskStatus === 'overdue') return colors.danger1;
    if (taskStatus === 'today') return colors.ok1;
    return colors.borderSubtle;
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        {
          backgroundColor: colors.surface,
          borderColor: getStatusColor(),
          borderWidth: taskStatus === 'future' ? 1 : 2,
          opacity: item.completed ? 0.5 : (taskStatus === 'future' ? 0.6 : 1),
        },
        item.completed && styles.taskCompleted,
      ]}
      onPress={() => toggleTask(item.id)}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: item.completed ? colors.ok1 : colors.borderSubtle,
            backgroundColor: item.completed ? colors.ok1 : 'transparent',
          },
        ]}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <View style={styles.taskContent}>
        {/* ← КНОПКИ СВЕРХУ СПРАВА */}
        <View style={styles.taskActions}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleEditTask(item);
            }}
            style={styles.actionButton}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Удалить задачу?',
                `"${item.title}" будет удалена навсегда`,
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Удалить', 
                    onPress: () => deleteTask(item.id),
                    style: 'destructive' 
                  },
                ]
              );
            }}
            style={styles.actionButton}
          >
            <Text style={{ fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.taskTitle,
            { color: item.completed ? colors.textMuted : colors.textMain },
            item.completed && styles.taskTitleCompleted,
          ]}
        >
          {item.title}
        </Text>
        
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
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor() },
            ]}
          >
            <Text style={styles.priorityText}>
              {item.priority === 'high' ? 'Высокий' : 
               item.priority === 'medium' ? 'Средний' : 'Низкий'}
            </Text>
          </View>
          
          <Text style={[styles.taskDate, { color: colors.textMuted }]}>
            {formatTaskDate(item)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
      <View style={styles.container}>
        {/* Шапка */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerTitle, { color: colors.accentText }]}>
    МОИ ЗАДАЧИ
          </Text>
          
          <View style={styles.headerButtons}>
            {/* Кнопка темы */}
            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={cycleTheme}
            >
              <Text style={styles.themeEmoji}>{currentTheme?.emoji}</Text>
            </TouchableOpacity>

            {/* Кнопка выхода */}
            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: colors.danger1,
                  borderColor: colors.danger1,
                },
              ]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </View>
{/* Статистика */}
<View style={styles.statsContainer}>
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{completedToday}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>СЕГОДНЯ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{completedWeek}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>НЕДЕЛЯ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{completedMonth}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>МЕСЯЦ</Text>
  </View>
  
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
    <Text style={[styles.statNumber, { color: colors.accentText }]}>{completedTotal}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>ВСЕГО</Text>
  </View>
</View>


{/* Кнопка фильтра/сортировки */}
<View style={styles.filterContainer}>
 <TouchableOpacity
  style={[
    styles.filterMenuButton,
    {
      backgroundColor: colors.surface,
      borderColor: colors.accentBorder,
    },
  ]}
  onPress={() => setShowFilterMenu(!showFilterMenu)}
>
  <Text style={{ fontSize: 20 }}>⚙️</Text>
</TouchableOpacity>


  {/* Выпадающее меню */}
  {showFilterMenu && (
    <View style={[styles.filterMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      {/* Скрыть выполненные */}
      <TouchableOpacity
        style={styles.filterMenuItem}
        onPress={() => setHideCompleted(!hideCompleted)}
      >
        <Text style={{ fontSize: 16 }}>
          {hideCompleted ? '✅' : '⬜'}
        </Text>
        <Text style={[styles.filterMenuItemText, { color: colors.textMain }]}>
          Скрыть выполненные
        </Text>
      </TouchableOpacity>

      {/* Разделитель */}
      <View style={[styles.filterMenuDivider, { backgroundColor: colors.borderSubtle }]} />

      {/* Сортировка */}
      <Text style={[styles.filterMenuLabel, { color: colors.textMuted }]}>
        СОРТИРОВКА:
      </Text>

      <TouchableOpacity
        style={styles.filterMenuItem}
        onPress={() => setSortBy('date')}
      >
        <Text style={{ fontSize: 16 }}>
          {sortBy === 'date' ? '🔘' : '⚪'}
        </Text>
        <Text style={[styles.filterMenuItemText, { color: colors.textMain }]}>
          По дате
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterMenuItem}
        onPress={() => setSortBy('priority')}
      >
        <Text style={{ fontSize: 16 }}>
          {sortBy === 'priority' ? '🔘' : '⚪'}
        </Text>
        <Text style={[styles.filterMenuItemText, { color: colors.textMain }]}>
          По приоритету
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterMenuItem}
        onPress={() => setSortBy('title')}
      >
        <Text style={{ fontSize: 16 }}>
          {sortBy === 'title' ? '🔘' : '⚪'}
        </Text>
        <Text style={[styles.filterMenuItemText, { color: colors.textMain }]}>
          По названию
        </Text>
      </TouchableOpacity>
    </View>
  )}
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

         {/* Кнопка добавления задачи */}
        <View style={styles.buttonContainer}>
          <Button
            title="+ Добавить задачу"
            onPress={() => setShowAddModal(true)}
          />
        </View>
      </View> 


 {/* Модалка добавления задачи */}
<Modal
  visible={showAddModal}
  onClose={() => {
    setNewTask({ 
      title: '', 
      date: new Date().toISOString().split('T')[0],
      deadline: new Date().toISOString().split('T')[0],
      priority: 2,
      comment: '',
    });
    setEditingTask(null); // ← ДОБАВИЛИ
    setShowAddModal(false);
  }}
  title={editingTask ? "Редактировать задачу" : "Новая задача"} // ← ИЗМЕНИЛИ
>

  <Input
    label="Название задачи"
    placeholder="Например: Купить продукты"
    value={newTask.title}
    onChangeText={(text) => setNewTask({ ...newTask, title: text })}
  />

 <Input
  label="Дата (когда планируете)"
  value={newTask.date}
  onChangeText={(text) => setNewTask({ ...newTask, date: text })}
  placeholder="03.02.2026"
/>

<Input
  label="Срок (deadline)"
  value={newTask.deadline}
  onChangeText={(text) => setNewTask({ ...newTask, deadline: text })}
  placeholder="10.02.2026"
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
  title={editingTask ? "Сохранить" : "Добавить"} // ← ИЗМЕНИЛИ ТЕКСТ
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

</Modal>

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
  gap: 8, // Уменьшили с 12 до 8
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

});

export default TasksScreen;


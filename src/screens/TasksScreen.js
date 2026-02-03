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
  RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ← ДОБАВЬТЕ ЭТО
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Card from '../components/Card';
import api from '../services/api';
import { getToken } from '../services/storage';

const TasksScreen = ({ navigation }) => {
  const { colors, spacing, changeTheme, theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

// Загрузка задач
const loadTasks = async () => {
  try {
    setError('');
    const token = await getToken();
    
    if (!token) {
      navigation.replace('Login');
      return;
    }

    // ⚠️ API для задач ещё не готов, используем моковые данные
    // Когда API будет готов, раскомментируйте это:
    // const response = await api.get('/tasks', {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // setTasks(response.data);

    // Моковые данные (временно)
    setTimeout(() => {
      setTasks([
        { 
          id: 1, 
          title: 'Сделать дизайн мобильного приложения', 
          completed: false,
          priority: 'high',
          dueDate: '2026-02-03'
        },
        { 
          id: 2, 
          title: 'Написать код для TasksScreen', 
          completed: true,
          priority: 'medium',
          dueDate: '2026-02-03'
        },
        { 
          id: 3, 
          title: 'Протестировать приложение', 
          completed: false,
          priority: 'low',
          dueDate: '2026-02-04'
        },
      ]);
      setLoading(false);
    }, 500);

  } catch (err) {
    console.error('Ошибка загрузки задач:', err);
    setError('Ошибка загрузки задач. Используются моковые данные.');
    
    // Всё равно показываем моковые данные, чтобы не было пусто
    setTasks([
      { 
        id: 1, 
        title: 'Тестовая задача 1', 
        completed: false,
        priority: 'high',
        dueDate: '2026-02-03'
      },
    ]);
    setLoading(false);
  }
};

  // Обновление списка (pull to refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Переключение статуса задачи
  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  // Выход
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  // Рендер одной задачи
  const renderTask = ({ item }) => {
    // Цвет приоритета
    const getPriorityColor = () => {
      switch (item.priority) {
        case 'high': return colors.danger1;
        case 'medium': return colors.accent1;
        case 'low': return colors.ok1;
        default: return colors.textMuted;
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.taskItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          },
          item.completed && styles.taskCompleted,
        ]}
        onPress={() => toggleTask(item.id)}
      >
        {/* Чекбокс */}
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

        {/* Контент задачи */}
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              { color: item.completed ? colors.textMuted : colors.textMain },
              item.completed && styles.taskTitleCompleted,
            ]}
          >
            {item.title}
          </Text>
          
          {/* Приоритет */}
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
              {item.dueDate}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent1} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      {/* Список задач */}
      <FlatList
        data={tasks}
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
          onPress={() => alert('Функция в разработке')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#020617',
    textTransform: 'uppercase',
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
});

export default TasksScreen;


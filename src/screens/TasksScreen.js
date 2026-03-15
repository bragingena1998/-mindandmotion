// src/screens/TasksScreen.js

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
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Background from '../components/Background';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../services/api';
import { getToken } from '../services/storage';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  GestureHandlerRootView,
  LongPressGestureHandler,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import FocusSessionModal, { hasFocusSession, getFocusSession } from '../components/FocusSessionModal';

const toMysqlFormat = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

const tasksAPI = {
  getTasks: async (params) => (await api.get('/tasks', { params })).data,
  createTask: async (taskData) => (await api.post('/tasks', taskData)).data,
  updateTask: async (id, taskData) => (await api.put(`/tasks/${id}`, taskData)).data,
  deleteTask: async (id) => (await api.delete(`/tasks/${id}`)).data,
  stopRecurring: async (id) => (await api.put(`/tasks/${id}/stop-recurring`)).data,
  addFocusSession: async (id) => (await api.post(`/tasks/${id}/focus`)).data,
};

const foldersAPI = {
  getFolders: async () => (await api.get('/folders')).data,
  createFolder: async (data) => (await api.post('/folders', data)).data,
  updateFolder: async (id, data) => (await api.put(`/folders/${id}`, data)).data,
  deleteFolder: async (id) => (await api.delete(`/folders/${id}`)).data,
  reorderFolders: async (folders) => (await api.put('/folders/reorder', { folders })).data,
};

const EMOJI_LIST = ['📁','💼','🏠','🎯','📚','💡','🏋️','🎨','🛒','❤️','⭐','🚀','🌿','🎮','🧘','🔬','🎵','✈️','💰','🏆'];

// ==================== TOAST ====================

const Toast = ({ message, visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible) return null;
  return (
    <Animated.View style={[toastStyles.container, { opacity }]} pointerEvents="none">
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(20,20,30,0.88)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 9999,
    elevation: 20,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

// ==================== SUBTASK ITEM ====================

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
      ]}>{subtask.title || '(без названия)'}</Text>
      <TouchableOpacity onPress={() => onDelete(subtask.id, parentId)} style={styles.subtaskDeleteBtn}>
        <Text style={{ fontSize: 14 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
});

// ==================== FOLDER DROP CHIP ====================
// Каждый чип имеет свой ref для measure абсолютных координат
// и свой Animated.Value для pulse-анимации при наведении.

const FolderDropChip = React.memo(({ folder, isHovered, colors, onMeasure }) => {
  const viewRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  // При маунте и когда dragTask появляется — замеряем координаты
  useEffect(() => {
    if (onMeasure) {
      // Задержка 80ms гарантирует что layout завершён
      const timer = setTimeout(() => {
        viewRef.current?.measure?.((lx, ly, lw, lh, px, py) => {
          onMeasure(folder.id, { x: px, y: py, width: lw, height: lh });
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [onMeasure, folder.id]);

  // Pulse-анимация при наведении
  useEffect(() => {
    if (isHovered) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.04, duration: 200, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isHovered]);

  return (
    <Animated.View
      ref={viewRef}
      style={[
        styles.folderDropZone,
        {
          backgroundColor: isHovered ? colors.accent1 : colors.surface + 'CC',
          borderColor: isHovered ? colors.accent1 : colors.borderSubtle,
          transform: [{ scale: scaleAnim }],
          shadowColor: isHovered ? colors.accent1 : 'transparent',
          shadowOpacity: isHovered ? 0.7 : 0,
          shadowRadius: isHovered ? 10 : 0,
          elevation: isHovered ? 10 : 2,
        }
      ]}
    >
      <Text style={[styles.folderChipText, { color: isHovered ? '#020617' : colors.textMain }]}>
        {folder.icon} {folder.name}
      </Text>
    </Animated.View>
  );
});

// ==================== DRAGGABLE TASK ITEM ====================
// ВАЖНО: PanGestureHandler снаружи, LongPressGestureHandler внутри.

const DraggableTaskItem = React.memo(({
  item,
  colors,
  dragTask,
  expandedTasks,
  subtasks,
  loadingSubtasks,
  swipeableRefs,
  onLongPressStart,
  onPanGestureEvent,
  onPanStateChange,
  toggleTask,
  toggleExpand,
  handleEditTask,
  toggleSubtask,
  deleteSubtask,
  setCurrentTaskForSubtask,
  setShowAddSubtaskModal,
  setFocusTask,
  setFocusVisible,
  getFolderById,
  getTaskStatus,
  formatTaskDate,
}) => {
  const longPressRef = useRef(null);
  const panRef = useRef(null);

  const isExpanded = expandedTasks[item.id];
  const taskSubtasks = subtasks[item.id] || [];
  const isLoadingSubtasks = loadingSubtasks[item.id];
  const getPriorityColor = () => ({ high: colors.danger1, medium: colors.accent1, low: colors.ok1 }[item.priority] || colors.textMuted);
  const taskStatus = getTaskStatus(item);
  const getStatusColor = () => {
    if (item.completed) return colors.textMuted;
    if (taskStatus === 'overdue') return colors.danger1;
    if (taskStatus === 'today') return colors.ok1;
    return colors.borderSubtle;
  };
  const folder = getFolderById(item.folderId);
  const isDraggingThis = dragTask?.id === item.id;

  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [0, 60], outputRange: [0.8, 1], extrapolate: 'clamp' });
    return (
      <View style={styles.swipeActionLeft}>
        <Animated.Text style={[styles.swipeActionText, { transform: [{ scale }] }]}>✓</Animated.Text>
        <Animated.Text style={[{ fontSize: 10, color: '#020617', fontWeight: '700', marginTop: 2 }, { transform: [{ scale }] }]}>ГОТОВО</Animated.Text>
      </View>
    );
  };

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={styles.swipeActionRight}>
        <Animated.Text style={[styles.swipeActionText, { transform: [{ scale }] }]}>🎯</Animated.Text>
        <Animated.Text style={[{ fontSize: 10, color: '#020617', fontWeight: '700', marginTop: 2 }, { transform: [{ scale }] }]}>ФОКУС</Animated.Text>
      </View>
    );
  };

  const onSwipeableOpen = (direction) => {
    if (direction === 'left') { swipeableRefs.current[item.id]?.close(); toggleTask(item.id); }
    if (direction === 'right') { swipeableRefs.current[item.id]?.close(); setFocusTask(item); setFocusVisible(true); }
  };

  return (
    <PanGestureHandler
      ref={panRef}
      simultaneousHandlers={longPressRef}
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanStateChange}
    >
      <Animated.View style={{ marginBottom: 12, opacity: isDraggingThis ? 0.4 : 1 }}>
        <LongPressGestureHandler
          ref={longPressRef}
          simultaneousHandlers={panRef}
          minDurationMs={400}
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.ACTIVE) {
              onLongPressStart(item, nativeEvent.absoluteX, nativeEvent.absoluteY);
            }
          }}
        >
          <Animated.View>
            <Swipeable
              ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
              renderLeftActions={renderLeftActions}
              renderRightActions={renderRightActions}
              onSwipeableOpen={onSwipeableOpen}
              containerStyle={{ borderRadius: 12, overflow: 'hidden' }}
              friction={1.5}
              leftThreshold={60}
              rightThreshold={60}
              enabled={!dragTask}
            >
              <TouchableOpacity
                style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: getStatusColor(), borderWidth: 2, opacity: item.completed ? 0.6 : 1, marginBottom: 0, borderRadius: 12 }]}
                activeOpacity={0.7}
                onPress={() => !dragTask && toggleExpand(item.id)}
              >
                <TouchableOpacity style={styles.checkboxArea} onPress={(e) => { e.stopPropagation(); if (!dragTask) toggleTask(item.id); }}>
                  <View style={[styles.checkbox, { borderColor: getStatusColor(), backgroundColor: item.completed ? getStatusColor() : 'transparent' }]}>
                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, { color: item.completed ? colors.textMuted : colors.textMain, paddingRight: 30 }]} numberOfLines={isExpanded ? 0 : 2}>
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
                      <Text style={styles.priorityText}>{item.priority === 'high' ? 'Высокий' : item.priority === 'medium' ? 'Средний' : 'Низкий'}</Text>
                    </View>
                    <Text style={[styles.taskDate, { color: colors.textMuted }]}>{formatTaskDate(item)}</Text>
                    {((item.subtasks_count > 0) || taskSubtasks.length > 0) && (
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>📋 {taskSubtasks.length > 0 ? taskSubtasks.length : item.subtasks_count}</Text>
                    )}
                    {folder && (
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>{folder.icon} {folder.name}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={(e) => { e.stopPropagation(); if (!dragTask) handleEditTask(item); }}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
                <View style={{ paddingLeft: 8, justifyContent: 'flex-end', paddingBottom: 5 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>

            {isExpanded && (
              <View style={[styles.subtasksContainer, { backgroundColor: colors.surface }]}>
                {isLoadingSubtasks ? <ActivityIndicator size="small" color={colors.accent1} /> : (
                  <>
                    {taskSubtasks.length === 0 && <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Нет подзадач</Text>}
                    {taskSubtasks.map(st => <SubtaskItem key={st.id} subtask={st} parentId={item.id} colors={colors} onToggle={toggleSubtask} onDelete={deleteSubtask} />)}
                    <TouchableOpacity style={styles.addSubtaskBtn} onPress={() => { setCurrentTaskForSubtask(item.id); setShowAddSubtaskModal(true); }}>
                      <Text style={[styles.addSubtaskBtnText, { color: colors.accent1 }]}>+ Добавить подзадачу</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </Animated.View>
        </LongPressGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
});

// ==================== MAIN SCREEN ====================

const TasksScreen = ({ navigation }) => {
  const { colors } = useTheme();
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

  // --- Toast ---
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  };

  // --- Папки ---
  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');
  const [folderToDelete, setFolderToDelete] = useState(null);

  // --- Редактирование папки ---
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderEmoji, setEditFolderEmoji] = useState('📁');
  const [showFolderActionModal, setShowFolderActionModal] = useState(false);
  const [selectedFolderForAction, setSelectedFolderForAction] = useState(null);

  // --- Drag & Drop ---
  const [dragTask, setDragTask] = useState(null);
  const dragTaskRef = useRef(null);
  const [hoveredFolder, setHoveredFolder] = useState('none');
  const hoveredFolderRef = useRef('none');
  const dragAnim = useRef(new Animated.ValueXY()).current;
  // Абсолютные координаты чипов: { [String(folderId)]: { x, y, width, height } }
  const folderChipLayouts = useRef({});

  const [focusTask, setFocusTask] = useState(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const swipeableRefs = useRef({});

  const emptyTask = () => ({
    title: '',
    date: new Date().toISOString().split('T')[0],
    deadline: null,
    time: null,
    priority: 2,
    comment: '',
    isRecurring: 0,
    recurrenceType: null,
    folderId: null,
  });

  const [newTask, setNewTask] = useState(emptyTask());
  const [stats, setStats] = useState({ today: 0, todayPlan: 0, week: 0, month: 0, total: 0 });
  const [expandedTasks, setExpandedTasks] = useState({});
  const [subtasks, setSubtasks] = useState({});
  const [loadingSubtasks, setLoadingSubtasks] = useState({});
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [currentTaskForSubtask, setCurrentTaskForSubtask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showOverdueCleanupModal, setShowOverdueCleanupModal] = useState(false);
  const [overdueTasksList, setOverdueTasksList] = useState([]);

  useEffect(() => { loadTasks(); loadFolders(); }, []);

  useEffect(() => {
    if (!focusVisible && hasFocusSession()) {
      const session = getFocusSession();
      if (session) {
        const found = tasks.find(t => t.id === session.taskId);
        if (found) setFocusTask(found);
      }
    }
  }, [tasks]);

  // ==================== FOLDERS ====================

  const loadFolders = async () => {
    try {
      const data = await foldersAPI.getFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('loadFolders error:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const created = await foldersAPI.createFolder({ name: newFolderName.trim(), icon: newFolderEmoji });
      setFolders(prev => [...prev, created]);
      setNewFolderName('');
      setNewFolderEmoji('📁');
      setShowCreateFolderModal(false);
      showToast(`📁 Папка «${created.name}» создана`);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось создать папку: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleUpdateFolder = async () => {
    if (!editFolderName.trim() || !editingFolder) return;
    try {
      await foldersAPI.updateFolder(editingFolder.id, {
        name: editFolderName.trim(),
        icon: editFolderEmoji,
      });
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? { ...f, name: editFolderName.trim(), icon: editFolderEmoji } : f));
      setEditingFolder(null);
      showToast(`✏️ Папка обновлена`);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось обновить папку: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleDeleteFolder = async (folder) => {
    try {
      await foldersAPI.deleteFolder(folder.id);
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      if (activeFolderId === folder.id) setActiveFolderId(null);
      setTasks(prev => prev.map(t => t.folderId === folder.id ? { ...t, folderId: null } : t));
      setFolderToDelete(null);
      showToast(`🗑️ Папка «${folder.name}» удалена`);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить папку');
    }
  };

  const handleMoveFolderUp = async (folder) => {
    const idx = folders.findIndex(f => f.id === folder.id);
    if (idx <= 0) return;
    const newFolders = [...folders];
    [newFolders[idx - 1], newFolders[idx]] = [newFolders[idx], newFolders[idx - 1]];
    setFolders(newFolders);
    setShowFolderActionModal(false);
    try {
      await foldersAPI.reorderFolders(newFolders.map((f, i) => ({ id: f.id, order_index: i })));
      showToast('↑ Папка перемещена');
    } catch {
      loadFolders();
      showToast('❌ Не удалось переместить папку');
    }
  };

  const handleMoveFolderDown = async (folder) => {
    const idx = folders.findIndex(f => f.id === folder.id);
    if (idx < 0 || idx >= folders.length - 1) return;
    const newFolders = [...folders];
    [newFolders[idx], newFolders[idx + 1]] = [newFolders[idx + 1], newFolders[idx]];
    setFolders(newFolders);
    setShowFolderActionModal(false);
    try {
      await foldersAPI.reorderFolders(newFolders.map((f, i) => ({ id: f.id, order_index: i })));
      showToast('↓ Папка перемещена');
    } catch {
      loadFolders();
      showToast('❌ Не удалось переместить папку');
    }
  };

  const getFolderById = useCallback((id) => folders.find(f => f.id === id) || null, [folders]);

  const handleFolderLongPress = (folder) => {
    setSelectedFolderForAction(folder);
    setShowFolderActionModal(true);
  };

  // ==================== DRAG & DROP ====================

  // Callback для FolderDropChip — сохраняет абсолютные координаты чипа
  // fid === null → ключ 'null' (папка "Без папки")
  const onChipMeasure = useCallback((fid, layout) => {
    folderChipLayouts.current[String(fid)] = layout;
  }, []);

  const onLongPressStart = useCallback((task, absX, absY) => {
    // Сбрасываем координаты чипов — они перемерятся при маунте FolderDropChip
    folderChipLayouts.current = {};
    dragTaskRef.current = task;
    setDragTask(task);
    dragAnim.setValue({ x: absX - 160, y: absY - 30 });
  }, [dragAnim]);

  const onPanGestureEvent = useCallback(({ nativeEvent }) => {
    if (!dragTaskRef.current) return;
    const { absoluteX: pageX, absoluteY: pageY } = nativeEvent;
    dragAnim.setValue({ x: pageX - 160, y: pageY - 30 });

    // Ищем чип по абсолютным координатам — без привязки к строке,
    // только X и Y попадают в bounding box чипа
    let found = 'none';
    for (const [fid, layout] of Object.entries(folderChipLayouts.current)) {
      if (
        pageX >= layout.x &&
        pageX <= layout.x + layout.width &&
        pageY >= layout.y - 16 &&
        pageY <= layout.y + layout.height + 16
      ) {
        found = fid === 'null' ? null : parseInt(fid);
        break;
      }
    }

    if (hoveredFolderRef.current !== found) {
      hoveredFolderRef.current = found;
      setHoveredFolder(found);
    }
  }, [dragAnim]);

  const onPanStateChange = useCallback(async ({ nativeEvent }) => {
    if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED || nativeEvent.state === State.FAILED) {
      const task = dragTaskRef.current;
      if (!task) return;

      const targetFolderId = hoveredFolderRef.current;

      dragTaskRef.current = null;
      setDragTask(null);
      setHoveredFolder('none');
      hoveredFolderRef.current = 'none';
      folderChipLayouts.current = {};

      if (targetFolderId === 'none') return;
      if (targetFolderId === task.folderId) return;

      try {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, folderId: targetFolderId } : t));
        await tasksAPI.updateTask(task.id, {
          title: task.title,
          date: task.date,
          deadline: task.deadline,
          priority: task.priority === 'high' ? 1 : task.priority === 'low' ? 3 : 2,
          comment: task.comment || '',
          done: task.completed ? 1 : 0,
          doneDate: task.doneDate || null,
          time: task.time,
          isRecurring: task.isRecurring,
          recurrenceType: task.recurrenceType,
          folderId: targetFolderId,
        });
        const folderName = targetFolderId === null
          ? 'убрана из папки'
          : `→ «${getFolderById(targetFolderId)?.name}»`;
        showToast(`📂 ${task.title} ${folderName}`);
      } catch {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, folderId: task.folderId } : t));
        showToast('❌ Не удалось переместить задачу');
      }
    }
  }, [getFolderById]);

  // ==================== STATS & TASKS ====================

  const loadStats = async () => {
    try {
      const res = await api.get('/tasks/stats');
      setStats({
        today: res.data.completed_today || 0,
        todayPlan: res.data.total_today_plan || 0,
        week: res.data.completed_week || 0,
        month: res.data.completed_month || 0,
        total: res.data.completed_total || 0,
      });
    } catch (err) { console.error('Статистика ошибка:', err); }
  };

  const loadTasks = async (date = selectedDate) => {
    try {
      setError('');
      const token = await getToken();
      if (!token) return;
      const now = new Date();
      const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      const params = isCurrentMonth ? {} : { month: date.getMonth(), year: date.getFullYear() };
      let tasksData;
      if (isCurrentMonth) {
        const [res] = await Promise.all([tasksAPI.getTasks(params), loadStats()]);
        tasksData = res;
      } else {
        tasksData = await tasksAPI.getTasks(params);
      }
      const formatted = tasksData.map(task => ({
        ...task,
        priority: task.priority === 1 ? 'high' : task.priority === 3 ? 'low' : 'medium',
        dueDate: task.deadline || task.date,
        completed: task.done || false,
        time: task.time || null,
        isRecurring: task.isRecurring ?? task.is_recurring ?? task.isrecurring ?? 0,
        recurrenceType: task.recurrenceType ?? task.recurrence_type ?? task.recurrencetype ?? null,
        focusSessions: task.focusSessions || 0,
        folderId: task.folderId ?? task.folder_id ?? null,
      }));
      setTasks(formatted);
      if (loading) checkOverdueTasks(formatted);
      setLoading(false);
    } catch (err) {
      console.error('❌ Загрузка задач:', err);
      setError('Ошибка загрузки задач');
      setTasks([]);
      setLoading(false);
    }
  };

  const checkOverdueTasks = async (allTasks) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
      const old = allTasks.filter(t => {
        if (t.completed) return false;
        const d = t.deadline ? t.deadline.split('T')[0] : t.date ? t.date.split('T')[0] : null;
        return d && d < oneWeekAgoStr;
      });
      if (old.length > 0) { setOverdueTasksList(old); setShowOverdueCleanupModal(true); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteOldTasks = async () => {
    try {
      setLoading(true);
      await Promise.all(overdueTasksList.map(t => tasksAPI.deleteTask(t.id)));
      setShowOverdueCleanupModal(false);
      setOverdueTasksList([]);
      await loadTasks();
    } catch { Alert.alert('Ошибка', 'Не удалось удалить все задачи'); setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadTasks(); setRefreshing(false); };

  const toggleTask = async (taskId) => {
    try {
      const t = tasks.find(x => x.id === taskId);
      if (!t) return;
      setTasks(prev => prev.map(x => x.id === taskId ? { ...x, completed: !x.completed } : x));
      const done = !t.completed;
      await tasksAPI.updateTask(taskId, {
        title: t.title, date: t.date, deadline: t.deadline,
        priority: t.priority === 'high' ? 1 : t.priority === 'low' ? 3 : 2,
        comment: t.comment || '', done, doneDate: done ? toMysqlFormat(new Date()) : null,
        time: t.time, isRecurring: t.isRecurring, recurrenceType: t.recurrenceType,
        folderId: t.folderId || null,
      });
      if (done) showToast('✅ Задача выполнена!');
      if (done && t.isRecurring) setTimeout(() => loadTasks(), 1000);
      await loadStats();
    } catch { loadTasks(); }
  };

  const deleteTask = useCallback(async (taskId) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await tasksAPI.deleteTask(taskId);
      showToast('🗑️ Задача удалена');
    } catch { loadTasks(); Alert.alert('Ошибка', 'Не удалось удалить задачу'); }
  }, []);

  const stopRecurring = async (taskId) => {
    try {
      await tasksAPI.stopRecurring(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isRecurring: 0, recurrenceType: null } : t));
      setEditingTask(prev => prev ? { ...prev, isRecurring: 0, recurrenceType: null } : prev);
      setNewTask(prev => ({ ...prev, isRecurring: 0, recurrenceType: null }));
      showToast('🔄 Повторения остановлены');
    } catch { Alert.alert('Ошибка', 'Не удалось отключить повторения'); }
  };

  const handleFocusComplete = async (taskId) => {
    try {
      await tasksAPI.addFocusSession(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, focusSessions: (t.focusSessions || 0) + 1 } : t));
    } catch (err) { console.error(err); }
  };

  const loadSubtasks = async (taskId) => {
    try {
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: true }));
      const res = await api.get(`/tasks/${taskId}/subtasks`);
      const raw = Array.isArray(res.data) ? res.data : [];
      const fmt = raw.map(st => ({ ...st, completed: Boolean(st.completed || st.done) }));
      setSubtasks(prev => ({ ...prev, [taskId]: fmt }));
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks_count: fmt.length } : t));
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
    } catch {
      setSubtasks(prev => ({ ...prev, [taskId]: [] }));
      setLoadingSubtasks(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const toggleExpand = (taskId) => {
    if (!expandedTasks[taskId]) loadSubtasks(taskId);
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleSubtask = async (subtaskId, taskId) => {
    try {
      await api.put(`/subtasks/${subtaskId}/toggle`);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st) }));
    } catch {}
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !currentTaskForSubtask) return;
    try {
      const res = await api.post(`/tasks/${currentTaskForSubtask}/subtasks`, { title: newSubtaskTitle });
      const ns = { ...res.data, completed: false };
      setSubtasks(prev => {
        const list = [...(prev[currentTaskForSubtask] || []), ns];
        setTasks(pt => pt.map(t => t.id === currentTaskForSubtask ? { ...t, subtasks_count: list.length } : t));
        return { ...prev, [currentTaskForSubtask]: list };
      });
      setNewSubtaskTitle(''); setShowAddSubtaskModal(false); setCurrentTaskForSubtask(null);
    } catch {}
  };

  const deleteSubtask = async (subtaskId, taskId) => {
    try {
      await api.delete(`/subtasks/${subtaskId}`);
      setSubtasks(prev => {
        const list = (prev[taskId] || []).filter(st => st.id !== subtaskId);
        setTasks(pt => pt.map(t => t.id === taskId ? { ...t, subtasks_count: list.length } : t));
        return { ...prev, [taskId]: list };
      });
    } catch {}
  };

  const handleEditTask = (task) => {
    const dateStr = task.date ? task.date.split('T')[0] : null;
    const deadlineRaw = task.deadline ? task.deadline.split('T')[0] : null;
    const effectiveDeadline = (deadlineRaw && deadlineRaw !== dateStr) ? deadlineRaw : null;
    setNewTask({
      title: task.title,
      date: dateStr || new Date().toISOString().split('T')[0],
      deadline: effectiveDeadline,
      time: task.time || null,
      priority: task.priority === 'high' ? 1 : task.priority === 'low' ? 3 : 2,
      comment: task.comment || '',
      isRecurring: task.isRecurring ?? 0,
      recurrenceType: task.recurrenceType ?? null,
      folderId: task.folderId ?? null,
    });
    setEditingTask(task);
    setShowAdvancedSettings(!!(task.time || task.isRecurring || task.recurrenceType || effectiveDeadline || task.folderId));
    setShowAddModal(true);
  };

  const formatTaskDate = useCallback((task) => {
    const fmt = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    };
    const dateStr = task.date;
    const deadlineStr = task.deadline;
    let result = '';
    if (!deadlineStr || dateStr === deadlineStr) {
      result = fmt(dateStr);
    } else {
      const dA = new Date(dateStr), dB = new Date(deadlineStr);
      if (dA.getMonth() === dB.getMonth() && dA.getFullYear() === dB.getFullYear()) {
        result = `${String(dA.getDate()).padStart(2,'0')}-${String(dB.getDate()).padStart(2,'0')}.${String(dA.getMonth()+1).padStart(2,'0')}.${dA.getFullYear()}`;
      } else {
        result = `${fmt(dateStr)} - ${fmt(deadlineStr)}`;
      }
    }
    if (task.time) result += ` • ${task.time}`;
    if (task.isRecurring) result += ` 🔄`;
    if (task.focusSessions > 0) result += ` 🎯${task.focusSessions}`;
    return result;
  }, []);

  const filteredTasks = tasks
    .filter(t => !hideCompleted || !t.completed)
    .filter(t => activeFolderId === null || t.folderId === activeFolderId);

  const getTaskStatus = useCallback((task) => {
    const today = new Date().toISOString().split('T')[0];
    const start = task.date ? task.date.split('T')[0] : today;
    const end = task.deadline ? task.deadline.split('T')[0] : start;
    if (today >= start && today <= end) return 'today';
    if (end < today) return 'overdue';
    return 'future';
  }, []);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'date') {
      const order = { overdue: 1, today: 2, future: 3 };
      const sa = getTaskStatus(a), sb = getTaskStatus(b);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      const da = (a.deadline || a.date || '').split('T')[0];
      const db = (b.deadline || b.date || '').split('T')[0];
      const diff = new Date(da) - new Date(db);
      if (diff !== 0) return diff;
      return (a.time || '23:59').localeCompare(b.time || '23:59');
    }
    if (sortBy === 'priority') { const o = { high: 1, medium: 2, low: 3 }; return o[a.priority] - o[b.priority]; }
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'ru');
    return 0;
  });

  // ==================== RENDER ====================

  const renderTask = useCallback(({ item }) => (
    <DraggableTaskItem
      item={item}
      colors={colors}
      dragTask={dragTask}
      expandedTasks={expandedTasks}
      subtasks={subtasks}
      loadingSubtasks={loadingSubtasks}
      swipeableRefs={swipeableRefs}
      onLongPressStart={onLongPressStart}
      onPanGestureEvent={onPanGestureEvent}
      onPanStateChange={onPanStateChange}
      toggleTask={toggleTask}
      toggleExpand={toggleExpand}
      handleEditTask={handleEditTask}
      toggleSubtask={toggleSubtask}
      deleteSubtask={deleteSubtask}
      setCurrentTaskForSubtask={setCurrentTaskForSubtask}
      setShowAddSubtaskModal={setShowAddSubtaskModal}
      setFocusTask={setFocusTask}
      setFocusVisible={setFocusVisible}
      getFolderById={getFolderById}
      getTaskStatus={getTaskStatus}
      formatTaskDate={formatTaskDate}
    />
  ), [colors, dragTask, expandedTasks, subtasks, loadingSubtasks, onLongPressStart, onPanGestureEvent, onPanStateChange, getFolderById, getTaskStatus, formatTaskDate]);

  if (loading) return <Background><View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.accent1} /></View></Background>;

  const dragFolderList = [{ id: null, icon: '📋', name: 'Без папки' }, ...folders];

  return (
    <Background>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>

          {/* HEADER */}
          <View style={[styles.header, { backgroundColor: colors.surface }]}>
            <Text style={[styles.headerTitle, { color: colors.accentText }]}>МОИ ЗАДАЧИ</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.headerTitle, { color: colors.accentText }]}>
                {selectedDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase()}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* ФОКУС-БАННЕР */}
          {focusTask && !focusVisible && (
            <TouchableOpacity style={[styles.focusBanner, { backgroundColor: colors.accent1 }]} onPress={() => setFocusVisible(true)}>
              <Text style={{ color: '#020617', fontWeight: '700', fontSize: 13 }}>🎯 Идёт фокус-сессия: {focusTask.title}</Text>
            </TouchableOpacity>
          )}

          {/* DRAG HINT */}
          {dragTask && (
            <View style={[styles.dragHint, { backgroundColor: colors.accent1 + '22', borderColor: colors.accent1 }]}>
              <Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                📂 Перетащи в папку ниже или отпусти для отмены
              </Text>
            </View>
          )}

          {/* СТАТИСТИКА */}
          {!dragTask && (
            <View style={styles.statsContainer}>
              {[{ n: `${stats.today}/${stats.todayPlan}`, l: 'СЕГОДНЯ' }, { n: stats.week, l: 'НЕДЕЛЯ' }, { n: stats.month, l: 'МЕСЯЦ' }, { n: stats.total, l: 'ВСЕГО' }].map((s, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
                  <Text style={[styles.statNumber, { color: colors.accentText }]}>{s.n}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.l}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ЧИПЫ ФИЛЬТРА */}
          {!dragTask && (
            <View style={styles.chipsContainer}>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: hideCompleted ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
                onPress={() => setHideCompleted(!hideCompleted)}
              >
                <Text style={[styles.chipText, { color: hideCompleted ? '#020617' : colors.textMuted }]}>
                  {hideCompleted ? 'Скрыты ✅' : 'Все задачи'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                onPress={() => { const n = sortBy === 'date' ? 'priority' : sortBy === 'priority' ? 'title' : 'date'; setSortBy(n); }}
              >
                <Text style={[styles.chipText, { color: colors.textMain }]}>
                  {sortBy === 'date' && '📅 По дате'}{sortBy === 'priority' && '🔥 По важности'}{sortBy === 'title' && 'abc По имени'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ПАПКИ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foldersScroll}
            style={styles.foldersScrollWrapper}
            scrollEnabled={!dragTask}
          >
            {dragTask ? (
              // Режим дропа: рендерим FolderDropChip, каждый сам замеряет свои координаты
              dragFolderList.map(folder => {
                const fid = folder.id;
                const isHovered = hoveredFolder === fid;
                return (
                  <FolderDropChip
                    key={String(fid)}
                    folder={folder}
                    isHovered={isHovered}
                    colors={colors}
                    onMeasure={onChipMeasure}
                  />
                );
              })
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.folderChip, { backgroundColor: activeFolderId === null ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
                  onPress={() => setActiveFolderId(null)}
                >
                  <Text style={[styles.folderChipText, { color: activeFolderId === null ? '#020617' : colors.textMain }]}>📋 Все</Text>
                </TouchableOpacity>

                {folders.map(folder => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.folderChip, { backgroundColor: activeFolderId === folder.id ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
                    onPress={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
                    onLongPress={() => handleFolderLongPress(folder)}
                    delayLongPress={350}
                  >
                    <Text style={[styles.folderChipText, { color: activeFolderId === folder.id ? '#020617' : colors.textMain }]}>
                      {folder.icon} {folder.name}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.folderChip, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderStyle: 'dashed' }]}
                  onPress={() => setShowCreateFolderModal(true)}
                >
                  <Text style={[styles.folderChipText, { color: colors.textMuted }]}>＋ Папка</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* СПИСОК ЗАДАЧ */}
          <FlatList
            data={sortedTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent1} />}
            scrollEnabled={!dragTask}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {activeFolderId ? 'В этой папке нет задач' : 'У вас пока нет задач'}
                </Text>
              </View>
            }
          />

          {/* FAB */}
          {!dragTask && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: colors.accent1 }]}
              onPress={() => {
                setNewTask({ ...emptyTask(), folderId: activeFolderId });
                setEditingTask(null);
                setShowAdvancedSettings(false);
                setShowAddModal(true);
              }}
            >
              <Text style={[styles.fabIcon, { color: colors.background }]}>+</Text>
            </TouchableOpacity>
          )}

          {/* ПРИЗРАК */}
          {dragTask && (
            <Animated.View
              style={[
                styles.dragGhost,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accent1,
                  transform: dragAnim.getTranslateTransform(),
                }
              ]}
              pointerEvents="none"
            >
              <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {dragTask.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                {getFolderById(dragTask.folderId)?.name || 'Без папки'}
              </Text>
            </Animated.View>
          )}

        </View>
      </GestureHandlerRootView>

      {/* TOAST */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* ФОКУС-СЕССИЯ */}
      {focusTask && (
        <FocusSessionModal
          visible={focusVisible}
          task={focusTask}
          onClose={() => { setFocusVisible(false); setFocusTask(null); }}
          onComplete={() => { handleFocusComplete(focusTask.id); setFocusVisible(false); setFocusTask(null); }}
          onMinimize={() => setFocusVisible(false)}
        />
      )}

      {/* МОДАЛ ПРОСРОЧЕННЫХ */}
      {showOverdueCleanupModal && (
        <Modal visible onClose={() => setShowOverdueCleanupModal(false)} title="🔥 Старые задачи">
          <Text style={[styles.deleteModalText, { color: colors.textMain, textAlign: 'left', marginBottom: 4 }]}>Просроченные задачи (более 7 дней). Всего: {overdueTasksList.length}</Text>
          <View style={{ maxHeight: 200, marginBottom: 16 }}>
            <FlatList data={overdueTasksList} keyExtractor={i => i.id.toString()} renderItem={({ item: i }) => (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.danger1 }}>•</Text>
                <Text style={{ color: colors.textMain, fontSize: 14 }} numberOfLines={1}>{i.title}</Text>
              </View>
            )} />
          </View>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} onPress={() => setShowOverdueCleanupModal(false)}>
              <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>Оставить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.danger1, borderColor: colors.danger1 }]} onPress={handleDeleteOldTasks}>
              <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>Удалить все</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* МОДАЛ ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ ЗАДАЧИ */}
      {showAddModal && (
        <Modal visible onClose={() => setShowAddModal(false)} title={editingTask ? 'Редактировать' : 'Новая задача'}>
          <Input
            label="Название"
            placeholder="Например: Купить продукты"
            value={newTask.title}
            onChangeText={(t) => setNewTask(p => ({ ...p, title: t }))}
          />
          <DatePicker
            label="Дата"
            value={newTask.date}
            onChangeDate={(d) => setNewTask(p => ({ ...p, date: d }))}
          />
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textMain }]}>Приоритет</Text>
            <View style={styles.priorityRow}>
              {[{val:1,label:'ВЫСОКИЙ',c:colors.danger1},{val:2,label:'СРЕДНИЙ',c:colors.accent1},{val:3,label:'НИЗКИЙ',c:colors.ok1}].map(p => (
                <TouchableOpacity key={p.val}
                  style={[styles.priorityBtn, { backgroundColor: newTask.priority===p.val ? p.c : colors.surface, borderColor: newTask.priority===p.val ? p.c : colors.borderSubtle }]}
                  onPress={() => setNewTask(prev => ({ ...prev, priority: p.val }))}
                >
                  <Text style={[styles.priorityBtnText, { color: newTask.priority===p.val ? '#020617' : colors.textMain }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.advancedToggle, { borderColor: colors.borderSubtle }]}
            onPress={() => setShowAdvancedSettings(p => !p)}
          >
            <Text style={{ color: colors.textMain, fontWeight: '600' }}>
              {showAdvancedSettings ? '▼ Скрыть доп. настройки' : '▶ Дополнительные настройки'}
            </Text>
          </TouchableOpacity>
          {showAdvancedSettings && (
            <View style={styles.advancedSettings}>
              <DatePicker
                label="Срок (deadline) — необязательно"
                value={newTask.deadline}
                onChangeDate={(d) => setNewTask(p => ({ ...p, deadline: d }))}
                allowClear
              />
              <TimePicker
                label="Точное время (необязательно)"
                value={newTask.time}
                onChangeTime={(t) => setNewTask(p => ({ ...p, time: t }))}
              />
              {folders.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textMain }]}>Папка</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    <TouchableOpacity
                      style={[styles.chip, { backgroundColor: !newTask.folderId ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
                      onPress={() => setNewTask(p => ({ ...p, folderId: null }))}
                    >
                      <Text style={[styles.chipText, { color: !newTask.folderId ? '#020617' : colors.textMuted }]}>Без папки</Text>
                    </TouchableOpacity>
                    {folders.map(f => (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.chip, { backgroundColor: newTask.folderId === f.id ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}
                        onPress={() => setNewTask(p => ({ ...p, folderId: f.id }))}
                      >
                        <Text style={[styles.chipText, { color: newTask.folderId === f.id ? '#020617' : colors.textMuted }]}>{f.icon} {f.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMain }]}>Повторение</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: null, label: 'Без' },
                    { val: 'daily', label: '📅 День' },
                    { val: 'weekly', label: '📅 Неделя' },
                    { val: 'monthly', label: '📅 Месяц' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={String(opt.val)}
                      style={[styles.chip, { backgroundColor: newTask.recurrenceType===opt.val ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle, paddingVertical: 6, paddingHorizontal: 10 }]}
                      onPress={() => setNewTask(p => ({ ...p, isRecurring: opt.val ? 1 : 0, recurrenceType: opt.val }))}
                    >
                      <Text style={[styles.chipText, { color: newTask.recurrenceType===opt.val ? '#020617' : colors.textMuted }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          {editingTask && !!(editingTask.isRecurring || editingTask.recurrenceType) && (
            <TouchableOpacity
              style={[styles.stopRecurringBtn, { borderColor: colors.accent1, marginTop: 12 }]}
              onPress={() => stopRecurring(editingTask.id)}
            >
              <Text style={{ color: colors.accentText, textAlign: 'center' }}>🔄 Остановить повторения</Text>
            </TouchableOpacity>
          )}
          <View style={{ marginTop: 16 }}>
            <Button
              title={editingTask ? 'Сохранить' : 'Добавить'}
              onPress={async () => {
                if (!newTask.title.trim()) { Alert.alert('Ошибка', 'Название не может быть пустым'); return; }
                try {
                  setLoading(true);
                  const payload = {
                    title: newTask.title,
                    date: newTask.date,
                    deadline: newTask.deadline || null,
                    time: newTask.time,
                    priority: newTask.priority,
                    comment: newTask.comment || '',
                    done: false,
                    doneDate: null,
                    isRecurring: newTask.isRecurring,
                    recurrenceType: newTask.recurrenceType,
                    folderId: newTask.folderId || null,
                  };
                  await (editingTask
                    ? tasksAPI.updateTask(editingTask.id, payload)
                    : tasksAPI.createTask(payload)
                  );
                  showToast(editingTask ? '✏️ Задача обновлена' : '✅ Задача добавлена');
                  setShowAddModal(false);
                  setTimeout(() => loadTasks(), 300);
                } catch (err) {
                  Alert.alert('Ошибка', 'Не удалось сохранить: ' + err.message);
                  setLoading(false);
                }
              }}
            />
          </View>
          {editingTask && (
            <TouchableOpacity
              style={[styles.deleteButton, { marginTop: 12, borderWidth: 1, borderColor: colors.danger1 }]}
              onPress={() => { setShowAddModal(false); setTaskToDelete(editingTask); }}
            >
              <Text style={{ color: colors.danger1, textAlign: 'center' }}>🗑️ Удалить задачу</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 20 }} />
        </Modal>
      )}

      {/* МОДАЛ УДАЛЕНИЯ ЗАДАЧИ */}
      {taskToDelete && (
        <Modal visible onClose={() => setTaskToDelete(null)} title="Удалить?">
          <Text style={[styles.deleteModalText, { color: colors.textMain }]}>Задача "{taskToDelete.title}" будет удалена.</Text>
          <Text style={[styles.deleteModalWarning, { color: colors.textMuted }]}>Это действие нельзя отменить.</Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} onPress={() => setTaskToDelete(null)}>
              <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.danger1, borderColor: colors.danger1 }]} onPress={() => { deleteTask(taskToDelete.id); setTaskToDelete(null); }}>
              <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* МОДАЛ ПОДЗАДАЧИ */}
      {showAddSubtaskModal && (
        <Modal visible onClose={() => { setShowAddSubtaskModal(false); setNewSubtaskTitle(''); setCurrentTaskForSubtask(null); }} title="Новая подзадача">
          <Input label="Название" placeholder="Например: Купить молоко" value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} />
          <Button title="Добавить" onPress={addSubtask} />
        </Modal>
      )}

      {/* МОДАЛ ВЫБОРА МЕСЯЦА */}
      {showMonthPicker && (
        <Modal visible onClose={() => setShowMonthPicker(false)} title="Выберите месяц">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date(selectedDate.getFullYear(), i, 1);
              const isSel = i === selectedDate.getMonth();
              return (
                <TouchableOpacity key={i}
                  style={{ padding: 10, backgroundColor: isSel ? colors.accent1 : colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, width: '30%', alignItems: 'center' }}
                  onPress={() => { const nd = new Date(selectedDate.getFullYear(), i, 1); setSelectedDate(nd); loadTasks(nd); setShowMonthPicker(false); }}
                >
                  <Text style={{ color: isSel ? '#000' : colors.textMain, fontWeight: isSel ? 'bold' : 'normal', textTransform: 'capitalize' }}>
                    {d.toLocaleString('ru-RU', { month: 'short' })}
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

      {/* МОДАЛ СОЗДАНИЯ ПАПКИ */}
      {showCreateFolderModal && (
        <Modal visible onClose={() => { setShowCreateFolderModal(false); setNewFolderName(''); setNewFolderEmoji('📁'); }} title="Новая папка">
          <Input
            label="Название"
            placeholder="Например: Работа"
            value={newFolderName}
            onChangeText={setNewFolderName}
          />
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textMain }]}>Стикер</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {EMOJI_LIST.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewFolderEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    { borderColor: newFolderEmoji === e ? colors.accent1 : colors.borderSubtle, backgroundColor: newFolderEmoji === e ? colors.accent1 + '33' : 'transparent' }
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Button title="Создать папку" onPress={handleCreateFolder} />
          <View style={{ height: 12 }} />
        </Modal>
      )}

      {/* МОДАЛ ДЕЙСТВИЙ С ПАПКОЙ (долгое нажатие) */}
      {showFolderActionModal && selectedFolderForAction && (
        <Modal
          visible
          onClose={() => { setShowFolderActionModal(false); setSelectedFolderForAction(null); }}
          title={`${selectedFolderForAction.icon} ${selectedFolderForAction.name}`}
        >
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TouchableOpacity
              style={[styles.folderActionBtn, { flex: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
              onPress={() => handleMoveFolderUp(selectedFolderForAction)}
            >
              <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>← Влево</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.folderActionBtn, { flex: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
              onPress={() => handleMoveFolderDown(selectedFolderForAction)}
            >
              <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>Вправо →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.folderActionBtn, { borderColor: colors.accent1, backgroundColor: colors.accent1 + '18' }]}
            onPress={() => {
              setShowFolderActionModal(false);
              setEditingFolder(selectedFolderForAction);
              setEditFolderName(selectedFolderForAction.name);
              setEditFolderEmoji(selectedFolderForAction.icon || '📁');
            }}
          >
            <Text style={{ color: colors.accentText, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>✏️ Редактировать</Text>
          </TouchableOpacity>
          <View style={{ height: 10 }} />
          <TouchableOpacity
            style={[styles.folderActionBtn, { borderColor: colors.danger1, backgroundColor: colors.danger1 + '18' }]}
            onPress={() => {
              setShowFolderActionModal(false);
              setFolderToDelete(selectedFolderForAction);
              setSelectedFolderForAction(null);
            }}
          >
            <Text style={{ color: colors.danger1, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>🗑️ Удалить папку</Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
        </Modal>
      )}

      {/* МОДАЛ РЕДАКТИРОВАНИЯ ПАПКИ */}
      {editingFolder && (
        <Modal
          visible
          onClose={() => setEditingFolder(null)}
          title="Редактировать папку"
        >
          <Input
            label="Название"
            placeholder="Название папки"
            value={editFolderName}
            onChangeText={setEditFolderName}
          />
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textMain }]}>Стикер</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {EMOJI_LIST.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEditFolderEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    { borderColor: editFolderEmoji === e ? colors.accent1 : colors.borderSubtle, backgroundColor: editFolderEmoji === e ? colors.accent1 + '33' : 'transparent' }
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Button title="Сохранить" onPress={handleUpdateFolder} />
          <View style={{ height: 12 }} />
        </Modal>
      )}

      {/* МОДАЛ УДАЛЕНИЯ ПАПКИ */}
      {folderToDelete && (
        <Modal visible onClose={() => setFolderToDelete(null)} title="Удалить папку?">
          <Text style={[styles.deleteModalText, { color: colors.textMain }]}>
            Папка «{folderToDelete.icon} {folderToDelete.name}» будет удалена.{`\n`}Задачи останутся, но будут откреплены от неё.
          </Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} onPress={() => setFolderToDelete(null)}>
              <Text style={[styles.deleteModalButtonText, { color: colors.textMain }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteModalButton, { backgroundColor: colors.danger1, borderColor: colors.danger1 }]} onPress={() => handleDeleteFolder(folderToDelete)}>
              <Text style={[styles.deleteModalButtonText, { color: '#020617' }]}>Удалить</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.25)' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.12, textTransform: 'uppercase' },
  listContent: { padding: 16, paddingBottom: 100 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkboxArea: { paddingRight: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  checkmark: { fontSize: 14, fontWeight: 'bold', color: '#020617' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, minWidth: 60, alignItems: 'center' },
  priorityText: { fontSize: 9, fontWeight: '600', color: '#020617', textTransform: 'uppercase' },
  taskDate: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', elevation: 4 },
  statNumber: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.08 },
  chipsContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  foldersScrollWrapper: { flexShrink: 0, flexGrow: 0 },
  foldersScroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6, gap: 8, flexDirection: 'row', alignItems: 'center' },
  folderChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, flexShrink: 0 },
  folderChipText: { fontSize: 13, fontWeight: '600' },
  folderDropZone: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 2, flexShrink: 0, minWidth: 80, alignItems: 'center' },
  dragGhost: { position: 'absolute', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2, minWidth: 180, maxWidth: 300, elevation: 12, zIndex: 999, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 },
  dragHint: { marginHorizontal: 16, marginTop: 8, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  priorityRow: { flexDirection: 'row', gap: 6 },
  priorityBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  priorityBtnText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  stopRecurringBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1 },
  statusBadge: { marginBottom: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.08 },
  deleteModalText: { fontSize: 15, lineHeight: 22, marginBottom: 12, textAlign: 'center' },
  deleteModalWarning: { fontSize: 12, textAlign: 'center', marginBottom: 24 },
  deleteModalButtons: { flexDirection: 'row', gap: 12 },
  deleteModalButton: { flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  deleteModalButtonText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, zIndex: 100 },
  fabIcon: { fontSize: 32, fontWeight: 'bold', marginTop: -4 },
  subtasksContainer: { marginLeft: 20, marginRight: 20, marginTop: -8, marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  subtaskTitle: { flex: 1, fontSize: 14 },
  subtaskDeleteBtn: { padding: 4 },
  addSubtaskBtn: { marginTop: 8, paddingVertical: 8, alignItems: 'center' },
  addSubtaskBtnText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  swipeActionLeft: { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12, flex: 1 },
  swipeActionRight: { backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, borderRadius: 12, flex: 1 },
  swipeActionText: { fontSize: 24, color: 'white' },
  editButton: { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 10 },
  advancedToggle: { padding: 12, borderWidth: 1, borderRadius: 8, marginVertical: 8, alignItems: 'center' },
  advancedSettings: { padding: 12, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', borderRadius: 8, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
  subtaskCheckbox: { padding: 2 },
  focusBanner: { paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  emojiBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  folderActionBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
});

export default TasksScreen;

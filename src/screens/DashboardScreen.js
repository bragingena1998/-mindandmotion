import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Background from '../components/Background';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { clearFocusSession, getFocusSession, hasFocusSession } from '../components/FocusSessionModal';
import {
  isHabitDayActive,
  getHabitRecordValue,
  getNextValueAfterTap,
  isHabitDoneForValue,
} from '../utils/habitDay';
import { countTodayPlanTotal, countCompletedToday } from '../utils/taskDayStats';
import { useDataSync } from '../contexts/DataSyncContext';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
};

const formatDateRu = (date) =>
  new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const isoTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const parseHabitData = (h) => {
  let days = [];
  try {
    if (Array.isArray(h.days_of_week)) days = h.days_of_week;
    else if (typeof h.days_of_week === 'string') days = JSON.parse(h.days_of_week);
  } catch {
    days = [];
  }
  return { ...h, days_of_week: days };
};

const normPriority = (p) => {
  if (p === 1 || p === 'high') return 'high';
  if (p === 3 || p === 'low') return 'low';
  return 'medium';
};

const normalizeTask = (task) => ({
  ...task,
  priority: normPriority(task.priority),
  completed: !!(task.done || task.completed),
  doneDate: task.doneDate || task.done_date || null,
  folderId: task.folderId ?? task.folder_id ?? null,
});

const dateInRange = (dayStr, task) => {
  const s = (task.date || '').split('T')[0];
  const e = (task.deadline || task.date || '').split('T')[0];
  return s && e && dayStr >= s && dayStr <= e;
};

const getTaskStatus = (task) => {
  const today = isoToday();
  const start = task.date ? task.date.split('T')[0] : today;
  const end = task.deadline ? task.deadline.split('T')[0] : start;
  if (today >= start && today <= end) return 'today';
  if (end < today) return 'overdue';
  return 'future';
};

const formatHabitCellValue = (habit, v) => {
  if (!v || v <= 0) return '—';
  if (habit.unit === 'Дни') return '✓';
  if (habit.unit === 'Часы') return v % 1 === 0 ? `${v}` : `${Number(v).toFixed(1)}`;
  return String(v);
};

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { tick, bumpAll } = useDataSync();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitRecords, setHabitRecords] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [focusTick, setFocusTick] = useState(Date.now());

  const loadDashboard = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const [profileRes, tasksRes, habitsRes, recordsRes, birthdaysRes, foldersRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/tasks'),
        api.get(`/habits?year=${year}&month=${month}`),
        api.get(`/habits/records/${year}/${month}`),
        api.get('/birthdays'),
        api.get('/folders').catch(() => ({ data: [] })),
      ]);

      setProfile(profileRes.data || null);
      const raw = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      setTasks(raw.map(normalizeTask));
      const parsedHabits = (Array.isArray(habitsRes.data) ? habitsRes.data : []).map(parseHabitData).filter((h) => h.shouldShow !== false);
      setHabits(parsedHabits);
      setHabitRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setBirthdays(Array.isArray(birthdaysRes.data) ? birthdaysRes.data : []);
      setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tick === 0) return;
    loadDashboard();
  }, [tick, loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => setFocusTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const today = isoToday();
  const tomorrow = isoTomorrow();
  const todayDay = new Date().getDate();
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const activeHabitsToday = useMemo(() => {
    return habits.filter((h) => isHabitDayActive(h, year, month, todayDay));
  }, [habits, year, month, todayDay]);

  const getFolderLabel = useCallback(
    (folderId) => {
      if (!folderId) return null;
      const f = folders.find((x) => x.id === folderId);
      return f ? `${f.icon || '📁'} ${f.name}` : null;
    },
    [folders]
  );

  const formatTaskMeta = useCallback(
    (task) => {
      const parts = [];
      if (task.time) parts.push(task.time);
      const ds = (task.date || '').split('T')[0];
      const de = (task.deadline || '').split('T')[0];
      if (de && de !== ds) {
        const fd = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        parts.push(`до ${fd(de)}`);
      }
      if (!parts.length) parts.push('Без времени');
      return parts.join(' · ');
    },
    []
  );

  const { overdueList, todayList, tomorrowList } = useMemo(() => {
    const open = tasks.filter((t) => !t.completed);
    const overdue = open.filter((t) => getTaskStatus(t) === 'overdue').sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
    const todayL = open.filter((t) => getTaskStatus(t) === 'today').sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
    const tomorrowL = open
      .filter((t) => dateInRange(tomorrow, t) && !dateInRange(today, t))
      .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
    return { overdueList: overdue, todayList: todayL, tomorrowList: tomorrowL };
  }, [tasks, today, tomorrow]);

  const toggleTask = async (task) => {
    const wasDone = !!task.completed;
    const done = !wasDone;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: done, done } : t)));
    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        date: task.date,
        deadline: task.deadline,
        priority: normPriority(task.priority) === 'high' ? 1 : normPriority(task.priority) === 'low' ? 3 : 2,
        comment: task.comment || '',
        done,
        doneDate: done ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
        time: task.time || null,
        isRecurring: task.isRecurring ?? task.is_recurring ?? 0,
        recurrenceType: task.recurrenceType ?? task.recurrence_type ?? null,
        folderId: task.folderId ?? task.folder_id ?? null,
      });
      bumpAll();
    } catch (e) {
      console.error('toggle task error:', e);
      loadDashboard();
    }
  };

  const reloadHabitRecords = async () => {
    try {
      const res = await api.get(`/habits/records/${year}/${month}`);
      setHabitRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleHabit = async (habit) => {
    const current = getHabitRecordValue(habitRecords, habit.id, todayDay);
    const nextVal = getNextValueAfterTap(habit, current);

    setHabitRecords((prev) => {
      const filtered = prev.filter((r) => !(Number(r.habitid) === Number(habit.id) && Number(r.day) === todayDay));
      if (!nextVal || nextVal <= 0) return filtered;
      return [...filtered, { habitid: habit.id, day: todayDay, value: nextVal }];
    });

    try {
      if (!nextVal || nextVal <= 0) {
        await api.delete(`/habits/records/${habit.id}/${year}/${month}/${todayDay}`);
      } else {
        await api.post('/habits/records', {
          habit_id: habit.id,
          year,
          month,
          day: todayDay,
          value: nextVal,
        });
      }
      await reloadHabitRecords();
      bumpAll();
    } catch (e) {
      console.error('toggle habit error:', e);
      await reloadHabitRecords();
      loadDashboard();
    }
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const items = birthdays
      .map((b) => {
        const eventDate = new Date(now.getFullYear(), Number(b.month) - 1, Number(b.day));
        if (eventDate < start) eventDate.setFullYear(eventDate.getFullYear() + 1);
        const daysLeft = Math.ceil((eventDate - start) / (1000 * 60 * 60 * 24));
        return { ...b, eventDate, daysLeft };
      })
      .filter((x) => x.eventDate <= end)
      .sort((a, b) => a.eventDate - b.eventDate);

    return items;
  }, [birthdays]);

  const totalToday = countTodayPlanTotal(tasks);
  const doneToday = countCompletedToday(tasks);
  const progress = totalToday > 0 ? Math.min(100, Math.round((doneToday / totalToday) * 100)) : 0;

  const focus = hasFocusSession() ? getFocusSession() : null;
  const focusTask = focus ? tasks.find((t) => t.id === focus.taskId) : null;
  const focusSeconds = focus?.isRunning && focus?.startedAt
    ? Math.max(0, focus.timeLeft - Math.floor((focusTick - focus.startedAt) / 1000))
    : (focus?.timeLeft || 0);
  const focusMm = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
  const focusSs = String(focusSeconds % 60).padStart(2, '0');

  const allActiveDone =
    activeHabitsToday.length > 0 &&
    activeHabitsToday.every((h) => {
      const v = getHabitRecordValue(habitRecords, h.id, todayDay);
      return isHabitDoneForValue(h, v);
    });

  const renderTaskCard = (task, stripColor) => {
    const pri = normPriority(task.priority);
    const strip =
      pri === 'high' ? colors.danger1 : pri === 'medium' ? colors.accent1 : 'transparent';
    const folderLbl = getFolderLabel(task.folderId);
    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        onPress={() => toggleTask(task)}
        activeOpacity={0.85}
      >
        <View style={[styles.priorityStrip, { backgroundColor: stripColor || strip }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskTitle, { color: colors.textMain }]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={[styles.taskMeta, { color: colors.textMuted }]}>{formatTaskMeta(task)}</Text>
          {!!folderLbl && (
            <View style={[styles.folderChip, { borderColor: colors.borderSubtle }]}>
              <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{folderLbl}</Text>
            </View>
          )}
        </View>
        <View style={[styles.checkbox, { borderColor: colors.accent1, backgroundColor: task.completed ? colors.accent1 : 'transparent' }]}>
          {task.completed ? <Text style={{ color: '#020617', fontWeight: '800' }}>✓</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Background>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent1} />
        </View>
      </Background>
    );
  }

  const hasAnyTask = overdueList.length + todayList.length + tomorrowList.length > 0;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent1} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMain }]}>
              {getGreeting()}, {profile?.name || 'друг'}
            </Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatDateRu(new Date())}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>
              {(profile?.name || 'MM').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        </View>

        {!!focus && focusSeconds > 0 && (
          <View style={[styles.focusBanner, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}>
            <View style={styles.focusRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.focusTitle, { color: colors.accentText }]}>⏱ Концентрат-сессия</Text>
                <Text style={[styles.focusTask, { color: colors.textMain }]} numberOfLines={1}>
                  {focusTask?.title || 'Активная задача'}
                </Text>
                <Text style={[styles.focusTimer, { color: colors.accent1 }]}>{focusMm}:{focusSs}</Text>
              </View>
              <TouchableOpacity
                style={[styles.stopBtn, { borderColor: colors.danger1 }]}
                onPress={() => {
                  clearFocusSession();
                  setFocusTick(Date.now());
                }}
              >
                <Text style={{ color: colors.danger1, fontWeight: '700' }}>Стоп</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.progressTitle, { color: colors.textMain }]}>
            {doneToday} / {totalToday} задач
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent1 }]} />
          </View>
          <Text style={[styles.progressCaption, { color: colors.textMuted }]}>{progress}% дня выполнено</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ПРИВЫЧКИ</Text>
        {allActiveDone && (
          <Text style={{ color: colors.accentText, fontWeight: '700', marginBottom: 8 }}>🔥 Все активные на сегодня!</Text>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitsRow}>
          {activeHabitsToday.map((habit) => {
            const v = getHabitRecordValue(habitRecords, habit.id, todayDay);
            const done = isHabitDoneForValue(habit, v);
            return (
              <TouchableOpacity key={habit.id} style={styles.habitItem} onPress={() => toggleHabit(habit)}>
                <View
                  style={[
                    styles.habitCircle,
                    {
                      backgroundColor: done ? colors.accent1 : colors.surface + 'AA',
                      borderColor: done ? colors.accent1 : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={{ color: done ? '#020617' : colors.textMain, fontWeight: '700', fontSize: 16 }}>
                    {(habit.name || '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[styles.habitName, { color: colors.textMuted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {habit.name}
                </Text>
                <Text style={[styles.habitValue, { color: colors.accentText }]} numberOfLines={1}>
                  {formatHabitCellValue(habit, v)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {activeHabitsToday.length === 0 && (
          <Text style={{ color: colors.textMuted, marginBottom: 12 }}>Нет привычек на сегодня</Text>
        )}

        <View style={[styles.sectionDivider, { borderBottomColor: colors.borderSubtle }]} />

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>СОБЫТИЯ И ДР</Text>
        {upcomingEvents.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginBottom: 12 }}>Нет событий на 7 дней</Text>
        ) : (
          <View style={[styles.eventsCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, marginBottom: 16 }]}>
            {upcomingEvents.map((event) => {
              const ic =
                event.type === 'birthday' ? '🎂' : event.type === 'important' ? '📌' : '📅';
              return (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={{ color: colors.textMain }} numberOfLines={1}>
                    {ic} {event.name}
                  </Text>
                  <Text style={{ color: colors.accentText, fontWeight: '700' }}>
                    {event.daysLeft === 0 ? 'сегодня' : event.daysLeft === 1 ? 'завтра' : `через ${event.daysLeft} дн`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.sectionDivider, { borderBottomColor: colors.borderSubtle }]} />

        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 4 }]}>ЗАДАЧИ</Text>
        {!hasAnyTask ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMain }}>Нет задач на сегодня, просроченных и на завтра 🎉</Text>
          </View>
        ) : (
          <>
            {overdueList.length > 0 && (
              <>
                <Text style={[styles.subLabel, { color: colors.danger1 }]}>ПРОСРОЧЕННЫЕ</Text>
                {overdueList.map((t) => renderTaskCard(t, colors.danger1))}
              </>
            )}
            {todayList.length > 0 && (
              <>
                <Text style={[styles.subLabel, { color: colors.accent1 }]}>СЕГОДНЯ</Text>
                {todayList.map((t) => renderTaskCard(t))}
              </>
            )}
            {tomorrowList.length > 0 && (
              <>
                <Text style={[styles.subLabel, { color: '#60a5fa' }]}>ЗАВТРА</Text>
                {tomorrowList.map((t) => renderTaskCard(t))}
              </>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Tasks')} style={{ marginTop: 8 }}>
          <Text style={[styles.link, { color: colors.accentText }]}>Все задачи →</Text>
        </TouchableOpacity>
      </ScrollView>
    </Background>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greeting: { fontSize: 24, fontWeight: '700' },
  date: { marginTop: 4, fontSize: 13, textTransform: 'capitalize' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  focusBanner: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  focusTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  focusTask: { marginTop: 4, fontWeight: '600' },
  focusTimer: { marginTop: 6, fontSize: 28, fontWeight: '800' },
  stopBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  progressCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  progressTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressCaption: { marginTop: 8, fontSize: 12 },
  sectionDivider: { borderBottomWidth: 1, marginTop: 16, marginBottom: 16, opacity: 0.85 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  subLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, marginTop: 8 },
  emptyCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  taskRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  priorityStrip: { width: 4, minHeight: 44, borderRadius: 2 },
  taskTitle: { fontSize: 15, fontWeight: '600' },
  taskMeta: { fontSize: 12, marginTop: 2 },
  folderChip: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  link: { marginBottom: 14, marginTop: 4, fontWeight: '700' },
  habitsRow: { gap: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start' },
  habitItem: { width: 76, alignItems: 'center' },
  habitCircle: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  habitName: { marginTop: 6, fontSize: 10, textAlign: 'center', width: '100%' },
  habitValue: { marginTop: 2, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  eventsCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
});

export default DashboardScreen;

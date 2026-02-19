// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = (SCREEN_WIDTH - 32) / 7;
const CELL_HEIGHT = 90; // Высокая ячейка для контента

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const HOLIDAYS_2026 = {
  0: [1, 2, 3, 4, 5, 6, 7, 8], // Январь (месяц 0)
  1: [23], // Февраль
  2: [8], // Март
  4: [1, 9], // Май
  5: [12], // Июнь
  10: [4], // Ноябрь
};

const CalendarScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  
  const [tasks, setTasks] = useState([]);
  const [habitRecords, setHabitRecords] = useState([]);
  const [habitsCount, setHabitsCount] = useState(0); // Всего активных привычек
  const [birthdays, setBirthdays] = useState([]);

  // Modal states
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayForm, setBirthdayForm] = useState({ name: '', day: '', month: '' });
  
  const [selectedDay, setSelectedDay] = useState(null); // Для просмотра деталей дня

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [year, month])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Загружаем задачи за месяц
      // API tasks принимает month=0..11? Нет, обычно 1..12. Проверим сервер.
      // Server: parseInt(month) + 1. Значит ждет 0-based или 1-based?
      // В HabitsScreen мы шлем month+1 (1-12).
      const mApi = month + 1;
      
      const [tasksRes, recordsRes, habitsRes, birthdaysRes] = await Promise.all([
        api.get(`/tasks?year=${year}&month=${month}`), // month 0-based in query for tasks? Server expects month param for filtering?
        // Server logic: if (month && year) ... MONTH(date) = ?. SQL MONTH is 1-12.
        // Let's check server.js. `parseInt(month) + 1`. So if we send 0, it looks for 1. Correct.
        // Wait, server logic: `parseInt(month) + 1`. So if I send 1 (Feb), it looks for 2?
        // Let's send 0-11 index and let server handle +1 or send 1-12.
        // HabitsScreen sends `month` state initialized as `new Date().getMonth() + 1` (1-12).
        // So we should send 1-12.
        api.get(`/tasks?year=${year}&month=${mApi - 1}`), // Server adds +1 to query param? 
        // Let's re-read server.js snippet: `const { month, year } = req.query; ... params.push(parseInt(month) + 1 ...`
        // So if I send `month=0`, server searches for SQL MONTH 1 (Jan). Correct.
        // So we send index 0-11.
        
        api.get(`/habits/records/${year}/${mApi}`),
        api.get(`/habits?year=${year}&month=${mApi}`), // Чтобы знать сколько всего привычек
        api.get('/birthdays')
      ]);

      setTasks(tasksRes.data);
      setHabitRecords(recordsRes.data);
      setHabitsCount(habitsRes.data.filter(h => h.shouldShow !== false).length);
      setBirthdays(birthdaysRes.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addBirthday = async () => {
    if (!birthdayForm.name || !birthdayForm.day) return alert('Введите имя и день');
    try {
      await api.post('/birthdays', {
        name: birthdayForm.name,
        day: parseInt(birthdayForm.day),
        month: birthdayForm.month ? parseInt(birthdayForm.month) : month + 1, // Если не выбран, то текущий
        year: year
      });
      setShowBirthdayModal(false);
      setBirthdayForm({ name: '', day: '', month: '' });
      loadData();
    } catch (e) {
      alert('Ошибка добавления');
    }
  };

  const deleteBirthday = async (id) => {
    try {
      await api.delete(`/birthdays/${id}`);
      loadData();
      if (selectedDay) setSelectedDay(null); // Закрыть детали, чтобы обновить
    } catch (e) {
      alert('Ошибка удаления');
    }
  };

  const getDayData = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Tasks
    const dayTasks = tasks.filter(t => {
      // Простая проверка по дате или done_date
      if (t.done) return t.done_date && t.done_date.startsWith(dateStr);
      return t.date === dateStr;
    });
    const doneTasks = dayTasks.filter(t => t.done).length;
    const totalTasks = dayTasks.length;
    
    // Habits
    const dayRecords = habitRecords.filter(r => r.day === d && (r.value === '✓' || r.value > 0));
    const doneHabits = dayRecords.length;
    
    // Birthdays
    const dayBirthdays = birthdays.filter(b => b.day === d && b.month === (month + 1));

    // Stickers logic
    const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
    const allHabitsDone = habitsCount > 0 && doneHabits >= habitsCount; // Упрощенно
    // Или хотя бы 80%? Пусть будет "Молодец" если сделал хотя бы половину?
    // User requested: "Если еще и привычки... то еще один стикер".
    const goodHabitsProgress = habitsCount > 0 && doneHabits >= (habitsCount * 0.8);

    return { dayTasks, doneTasks, totalTasks, doneHabits, dayBirthdays, allTasksDone, goodHabitsProgress };
  };

  const changeMonth = (dir) => {
    let newM = month + dir;
    let newY = year;
    if (newM > 11) { newM = 0; newY++; }
    if (newM < 0) { newM = 11; newY--; }
    setMonth(newM);
    setYear(newY);
  };

  // Render Grid
  const renderCalendar = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayDow = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
    // Adjust to Mon=0, Sun=6
    const startOffset = firstDayDow === 0 ? 6 : firstDayDow - 1;
    
    const grid = [];
    // Empty cells
    for (let i = 0; i < startOffset; i++) {
      grid.push(<View key={`empty-${i}`} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }} />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const { doneTasks, totalTasks, doneHabits, dayBirthdays, allTasksDone, goodHabitsProgress } = getDayData(d);
      const isWeekend = (new Date(year, month, d).getDay() % 6 === 0);
      const isHoliday = HOLIDAYS_2026[month]?.includes(d);
      const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

      grid.push(
        <TouchableOpacity 
          key={d} 
          style={[
            styles.cell, 
            { 
              width: CELL_WIDTH, 
              height: CELL_HEIGHT,
              backgroundColor: isHoliday ? 'rgba(251, 191, 36, 0.1)' : (isWeekend ? 'rgba(244, 63, 94, 0.05)' : colors.surface),
              borderColor: isToday ? colors.accent1 : colors.borderSubtle,
              borderWidth: isToday ? 2 : 1
            }
          ]}
          onPress={() => setSelectedDay(d)}
        >
          <Text style={[styles.dayNum, { color: (isHoliday || isWeekend) ? colors.danger1 : colors.textMain }]}>{d}</Text>
          
          <View style={styles.indicators}>
            {/* TASKS */}
            {totalTasks > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="check-square" size={10} color={allTasksDone ? colors.accent1 : colors.textMuted} />
                <Text style={[styles.indicatorText, { color: allTasksDone ? colors.accent1 : colors.textMain }]}>
                  {doneTasks}/{totalTasks}
                </Text>
              </View>
            )}

            {/* HABITS */}
            {doneHabits > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="zap" size={10} color={goodHabitsProgress ? '#fbbf24' : colors.textMuted} />
                <Text style={[styles.indicatorText, { color: goodHabitsProgress ? '#fbbf24' : colors.textMain }]}>
                  {doneHabits}
                </Text>
              </View>
            )}

            {/* BIRTHDAYS */}
            {dayBirthdays.length > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="gift" size={10} color="#f472b6" />
              </View>
            )}
          </View>

          {/* STICKERS (Bottom absolute) */}
          <View style={styles.stickersContainer}>
            {allTasksDone && <Text style={{ fontSize: 10 }}>⭐</Text>}
            {goodHabitsProgress && <Text style={{ fontSize: 10 }}>🔥</Text>}
            {dayBirthdays.length > 0 && <Text style={{ fontSize: 10 }}>🎂</Text>}
          </View>
        </TouchableOpacity>
      );
    }

    return <View style={styles.grid}>{grid}</View>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent1} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textMain }]}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
          <Feather name="chevron-right" size={24} color={colors.accent1} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.surfaceHover }]} 
          onPress={() => { setBirthdayForm({name:'', day:'', month: month+1}); setShowBirthdayModal(true); }}
        >
          <Feather name="gift" size={20} color={colors.accent1} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.accent1, marginLeft: 4 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* WEEKDAYS */}
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.weekDayText, { width: CELL_WIDTH, color: i >= 5 ? colors.danger1 : colors.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* CALENDAR GRID */}
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {loading ? <ActivityIndicator size="large" color={colors.accent1} style={{ marginTop: 50 }} /> : renderCalendar()}
      </ScrollView>

      {/* DAY DETAILS MODAL */}
      <Modal visible={!!selectedDay} onClose={() => setSelectedDay(null)} title={`${selectedDay} ${MONTHS[month]} ${year}`}>
        {selectedDay && (() => {
          const { dayTasks, doneHabits, dayBirthdays } = getDayData(selectedDay);
          return (
            <View style={{ padding: 16 }}>
              {/* Birthdays */}
              {dayBirthdays.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.sectionTitle, { color: '#f472b6' }]}>🎂 Дни Рождения</Text>
                  {dayBirthdays.map(b => (
                    <View key={b.id} style={styles.listItem}>
                      <Text style={{ color: colors.textMain, fontSize: 16 }}>{b.name}</Text>
                      <TouchableOpacity onPress={() => deleteBirthday(b.id)}>
                        <Feather name="trash-2" size={16} color={colors.danger1} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Tasks */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.sectionTitle, { color: colors.accent1 }]}>Задачи ({dayTasks.length})</Text>
                  <TouchableOpacity onPress={() => { 
                    setSelectedDay(null);
                    navigation.navigate('Tasks', { screen: 'TasksScreen', params: { date: `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` } }); 
                    // Note: navigation structure depends on stacks. Assuming simple navigate works or nested.
                  }}>
                    <Text style={{ color: colors.accent1, textDecorationLine: 'underline' }}>Перейти</Text>
                  </TouchableOpacity>
                </View>
                {dayTasks.length === 0 ? <Text style={{ color: colors.textMuted }}>Нет задач</Text> : (
                  dayTasks.map(t => (
                    <View key={t.id} style={styles.listItem}>
                      <Feather name={t.done ? "check-square" : "square"} size={16} color={t.done ? colors.accent1 : colors.textMuted} />
                      <Text style={{ color: colors.textMain, marginLeft: 8, flex: 1 }} numberOfLines={1}>{t.title}</Text>
                    </View>
                  ))
                )}
              </View>

              {/* Habits */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>Привычки (Выполнено: {doneHabits})</Text>
                  <TouchableOpacity onPress={() => {
                    setSelectedDay(null);
                    navigation.navigate('Habits', { screen: 'HabitsScreen', params: { year, month: month+1 } });
                  }}>
                    <Text style={{ color: colors.accent1, textDecorationLine: 'underline' }}>Перейти</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textMuted }}>Всего выполнено действий: {doneHabits}</Text>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* ADD BIRTHDAY MODAL */}
      <Modal visible={showBirthdayModal} onClose={() => setShowBirthdayModal(false)} title="Добавить ДР">
        <Input label="Имя" value={birthdayForm.name} onChangeText={t => setBirthdayForm({...birthdayForm, name: t})} />
        <Input label="День (число)" value={String(birthdayForm.day)} onChangeText={t => setBirthdayForm({...birthdayForm, day: t})} keyboardType="numeric" />
        <Button title="Сохранить" onPress={addBirthday} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  monthTitle: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  arrowBtn: { padding: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8 },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  weekDayText: { textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  cell: { padding: 4, borderRadius: 8, marginBottom: 8, marginRight: 0 }, // margin handled by width calc? No, flexWrap.
  // Actually flexWrap with fixed width might leave gaps. Let's rely on exact width.
  dayNum: { fontSize: 12, fontWeight: '700' },
  indicators: { marginTop: 4, gap: 2 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  indicatorText: { fontSize: 9, fontWeight: '600' },
  stickersContainer: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }
});

export default CalendarScreen;

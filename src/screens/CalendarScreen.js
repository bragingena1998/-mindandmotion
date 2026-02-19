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
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import api from '../services/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = (SCREEN_WIDTH - 40) / 7; // Увеличили отступы
const CELL_HEIGHT = 95; // Чуть выше ячейка

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
  const [habitsCount, setHabitsCount] = useState(0);
  const [birthdays, setBirthdays] = useState([]);

  // Modal states
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayForm, setBirthdayForm] = useState({ name: '', day: '', month: '' });
  
  const [selectedDay, setSelectedDay] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [year, month])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      const mApi = month + 1;
      
      const [tasksRes, recordsRes, habitsRes, birthdaysRes] = await Promise.all([
        api.get(`/tasks?year=${year}&month=${month}`),
        api.get(`/habits/records/${year}/${mApi}`),
        api.get(`/habits?year=${year}&month=${mApi}`),
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
        month: birthdayForm.month ? parseInt(birthdayForm.month) : month + 1,
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
      if (selectedDay) setSelectedDay(null);
    } catch (e) {
      alert('Ошибка удаления');
    }
  };

  const getDayData = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const dayTasks = tasks.filter(t => {
      if (t.done) return t.done_date && t.done_date.startsWith(dateStr);
      return t.date === dateStr;
    });
    const doneTasks = dayTasks.filter(t => t.done).length;
    const totalTasks = dayTasks.length;
    
    const dayRecords = habitRecords.filter(r => r.day === d && (r.value === '✓' || r.value > 0));
    const doneHabits = dayRecords.length;
    
    const dayBirthdays = birthdays.filter(b => b.day === d && b.month === (month + 1));

    const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
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

  // SWIPE GESTURE
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 100) {
        // Swipe RIGHT → Previous Month
        changeMonth(-1);
      } else if (event.translationX < -100) {
        // Swipe LEFT → Next Month
        changeMonth(1);
      }
    });

  // Render Grid
  const renderCalendar = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayDow = new Date(year, month, 1).getDay();
    const startOffset = firstDayDow === 0 ? 6 : firstDayDow - 1;
    
    const grid = [];
    for (let i = 0; i < startOffset; i++) {
      grid.push(<View key={`empty-${i}`} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }} />);
    }

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
              backgroundColor: isHoliday ? 'rgba(251, 191, 36, 0.15)' : (isWeekend ? 'rgba(244, 63, 94, 0.08)' : colors.surface),
              borderColor: isToday ? colors.accent1 : colors.borderSubtle,
              borderWidth: isToday ? 2 : 1
            }
          ]}
          onPress={() => setSelectedDay(d)}
        >
          {/* DAY NUMBER */}
          <Text style={[styles.dayNum, { color: (isHoliday || isWeekend) ? colors.danger1 : colors.textMain }]}>{d}</Text>
          
          {/* INDICATORS */}
          <View style={styles.indicators}>
            {/* TASKS */}
            {totalTasks > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="check-square" size={11} color={allTasksDone ? colors.accent1 : colors.textMuted} />
                <Text style={[styles.indicatorText, { color: allTasksDone ? colors.accent1 : colors.textMain }]}>
                  {doneTasks}/{totalTasks}
                </Text>
              </View>
            )}

            {/* HABITS */}
            {doneHabits > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="zap" size={11} color={goodHabitsProgress ? '#fbbf24' : colors.textMuted} />
                <Text style={[styles.indicatorText, { color: goodHabitsProgress ? '#fbbf24' : colors.textMain }]}>
                  {doneHabits}
                </Text>
              </View>
            )}

            {/* BIRTHDAYS */}
            {dayBirthdays.length > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="gift" size={11} color="#f472b6" />
              </View>
            )}
          </View>

          {/* STICKERS (Bottom absolute) */}
          <View style={styles.stickersContainer}>
            {allTasksDone && <Text style={{ fontSize: 12 }}>⭐</Text>}
            {goodHabitsProgress && <Text style={{ fontSize: 12 }}>🔥</Text>}
            {dayBirthdays.length > 0 && <Text style={{ fontSize: 12 }}>🎂</Text>}
          </View>
        </TouchableOpacity>
      );
    }

    return <View style={styles.grid}>{grid}</View>;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
              <Feather name="chevron-left" size={28} color={colors.accent1} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.monthTitle, { color: colors.textMain }]}>
                {MONTHS[month]}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{year}</Text>
            </View>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
              <Feather name="chevron-right" size={28} color={colors.accent1} />
            </TouchableOpacity>
          </View>

          {/* ADD BIRTHDAY BUTTON */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity 
              style={[styles.addBirthdayBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.accent1 }]} 
              onPress={() => { setBirthdayForm({name:'', day:'', month: month+1}); setShowBirthdayModal(true); }}
            >
              <Feather name="gift" size={18} color={colors.accent1} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent1, marginLeft: 8 }}>ДОБАВИТЬ ДЕНЬ РОЖДЕНИЯ</Text>
            </TouchableOpacity>
          </View>

          {/* WEEKDAYS */}
          <View style={styles.weekHeader}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={[styles.weekDayText, { width: CELL_WIDTH, color: i >= 5 ? colors.danger1 : colors.textMuted }]}>{d}</Text>
            ))}
          </View>

          {/* CALENDAR GRID */}
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.sectionTitle, { color: colors.accent1 }]}>Задачи ({dayTasks.length})</Text>
                      <TouchableOpacity onPress={() => { 
                        setSelectedDay(null);
                        navigation.navigate('Tasks');
                      }}>
                        <Text style={{ color: colors.accent1, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }}>ПЕРЕЙТИ</Text>
                      </TouchableOpacity>
                    </View>
                    {dayTasks.length === 0 ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Нет задач</Text> : (
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>Привычки (Выполнено: {doneHabits})</Text>
                      <TouchableOpacity onPress={() => {
                        setSelectedDay(null);
                        navigation.navigate('Habits', { year, month: month+1 });
                      }}>
                        <Text style={{ color: colors.accent1, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }}>ПЕРЕЙТИ</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 14 }}>Всего выполнено действий: {doneHabits}</Text>
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
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  monthTitle: { fontSize: 20, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  arrowBtn: { padding: 8 },
  addBirthdayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5 },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8 },
  weekDayText: { textAlign: 'center', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 4 },
  cell: { padding: 6, borderRadius: 10, marginBottom: 4, position: 'relative' },
  dayNum: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  indicators: { gap: 3 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  indicatorText: { fontSize: 10, fontWeight: '700' },
  stickersContainer: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }
});

export default CalendarScreen;

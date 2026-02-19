// src/screens/HabitsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import HabitTable from '../components/HabitTable';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import DatePicker from '../components/DatePicker'; 
import ReorderHabitsModal from '../components/ReorderHabitsModal';
import MonthPickerModal from '../components/MonthPickerModal';

const formatDateISO = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

const DaysSelector = ({ selectedDays, onSelect }) => {
  const { colors } = useTheme();
  const daysMap = [
    { label: 'Пн', val: 1 },
    { label: 'Вт', val: 2 },
    { label: 'Ср', val: 3 },
    { label: 'Чт', val: 4 },
    { label: 'Пт', val: 5 },
    { label: 'Сб', val: 6 },
    { label: 'Вс', val: 0 },
  ];

  const toggleDay = (dayVal) => {
    if (selectedDays.includes(dayVal)) {
      onSelect(selectedDays.filter(d => d !== dayVal));
    } else {
      onSelect([...selectedDays, dayVal]);
    }
  };

  return (
    <View style={styles.daysSelectorContainer}>
      {daysMap.map((day) => {
        const isSelected = selectedDays.includes(day.val);
        return (
          <TouchableOpacity
            key={day.label}
            style={[
              styles.dayCircle,
              { 
                backgroundColor: isSelected ? colors.accent1 : colors.surface,
                borderColor: isSelected ? colors.accent1 : colors.borderSubtle
              }
            ]}
            onPress={() => toggleDay(day.val)}
          >
            <Text style={[
              styles.dayCircleText, 
              { color: isSelected ? '#020617' : colors.textMain }
            ]}>
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const LifeProgressBar = ({ label, value, color }) => {
  const percent = Math.min(Math.max(value, 0), 100);
  return (
    <View style={styles.barContainer}>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
        <View style={styles.barTextContainer}>
          <Text style={styles.barLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

const HabitsScreen = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [profile, setProfile] = useState(null);
  const [lifeProgress, setLifeProgress] = useState({ percent: 0, yearsLived: 0, yearsLeft: 64 });
  const [yearProgress, setYearProgress] = useState({ percent: 0, daysPassed: 0, daysLeft: 365 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [records, setRecords] = useState([]);
  
  const [showDateModal, setShowDateModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [habitForm, setHabitForm] = useState({
    name: '',
    unit: 'Дни',
    plan: '',
    targetType: 'monthly',
    startDate: null, 
    endDate: null,   
    daysOfWeek: [],
  });
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    loadHabits();
  }, [year, month]);

  useEffect(() => {
    if (habits.length > 0) {
      loadRecords();
    }
  }, [habits, year, month]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data);
      calculateLifeProgress(response.data.birthdate, response.data.gender);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  };

  const calculateLifeProgress = (birthdate, gender = 'male') => {
    if (!birthdate) return;
    const today = new Date();
    const birth = new Date(birthdate);
    const lifeExpectancy = gender === 'female' ? 78.5 : 67.0;
    const ageMs = today - birth;
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    const lifePercent = Math.min(100, Math.round((ageYears / lifeExpectancy) * 100));
    setLifeProgress({ percent: lifePercent, yearsLived: Math.floor(ageYears), yearsLeft: Math.max(0, Math.round(lifeExpectancy - ageYears)) });

    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();
    let yearStart = new Date(today.getFullYear(), birthMonth, birthDay);
    if (today < yearStart) yearStart = new Date(today.getFullYear() - 1, birthMonth, birthDay);
    const yearEnd = new Date(yearStart.getFullYear() + 1, birthMonth, birthDay - 1);
    const daysInYear = Math.round((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.round((today - yearStart) / (1000 * 60 * 60 * 24));
    setYearProgress({ percent: Math.min(100, Math.round((daysPassed / daysInYear) * 100)), daysPassed, daysLeft: daysInYear - daysPassed });
  };

  const parseHabitData = (h) => {
    // Безопасный парсинг JSON из базы
    let days = [];
    try {
        if (Array.isArray(h.days_of_week)) days = h.days_of_week;
        else if (typeof h.days_of_week === 'string') days = JSON.parse(h.days_of_week);
    } catch (e) { days = []; }
    return { ...h, days_of_week: days };
  };

  const loadHabits = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/habits?year=${year}&month=${month}`);
      const parsedHabits = response.data.map(parseHabitData).filter(h => h.shouldShow !== false);
      setHabits(parsedHabits);
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const response = await api.get(`/habits/records/${year}/${month}`);
      setRecords(response.data);
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
    }
  };

  const handleCellChange = async (habitId, year, month, day, value) => {
    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.habitid === habitId && r.day === day));
      if (value && value > 0) return [...filtered, { habitid: habitId, year, month, day, value }];
      return filtered;
    });

    try {
      if (value && value > 0) {
        await api.post('/habits/records', { habit_id: habitId, year, month, day, value });
      } else {
        await api.delete(`/habits/records/${habitId}/${year}/${month}/${day}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения записи:', error);
      loadRecords();
    }
  };

  const executeDelete = async () => {
    if (!habitToDelete) return;
    const habitId = habitToDelete.id;
    try {
      await api.delete(`/habits/${habitId}?year=${year}&month=${month}`);
      setHabits(habits.filter(h => h.id !== habitId));
      setRecords(records.filter(r => r.habitid !== habitId));
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить привычку.');
    } finally {
      setHabitToDelete(null);
    }
  };

  const confirmDeleteHabit = (habit) => {
    setHabitToDelete(habit);
  };

  const openHabitModal = (habit = null) => {
    if (habit) {
      setEditingHabitId(habit.id);
      setHabitForm({
        name: habit.name,
        unit: habit.unit,
        plan: habit.plan,
        targetType: habit.target_type || 'monthly',
        startDate: formatDateISO(habit.start_date),
        endDate: formatDateISO(habit.end_date),
        daysOfWeek: habit.days_of_week || []
      });
    } else {
      setEditingHabitId(null);
      setHabitForm({
        name: '', unit: 'Дни', plan: '', targetType: 'monthly', startDate: null, endDate: null, daysOfWeek: []
      });
    }
    setShowHabitModal(true);
  };

  const saveHabit = async () => {
     if (!habitForm.name.trim()) return alert('Введите название');
     if (!habitForm.unit) return alert('Укажите единицу измерения');
     
     const planValue = habitForm.plan === '' ? 1 : parseInt(habitForm.plan) || 1;
     
     const payload = {
       name: habitForm.name,
       unit: habitForm.unit,
       plan: planValue,
       year, month,
       target_type: habitForm.targetType,
       start_date: habitForm.startDate || null, 
       end_date: habitForm.endDate || null,     
       days_of_week: habitForm.daysOfWeek || []
     };

     try {
       let savedHabit;
       if (editingHabitId) {
         await api.put(`/habits/${editingHabitId}`, payload);
         // Оптимистичное обновление: обновляем состояние
         savedHabit = { 
             ...habits.find(h => h.id === editingHabitId),
             ...payload 
         };
         setHabits(habits.map(h => h.id === editingHabitId ? savedHabit : h));
       } else {
         const response = await api.post('/habits', payload);
         // Сервер может вернуть days_of_week как JSON-строку или массив, парсим его
         savedHabit = parseHabitData(response.data);
         setHabits([...habits, savedHabit]);
       }
       setShowHabitModal(false);
       setShowCustomUnit(false);
     } catch (e) {
       console.error(e);
       if (e.response && e.response.status === 500) {
            // Если ошибка с сервера вернулась как JSON с сообщением
           const serverMsg = e.response.data?.message || e.response.data?.sqlMessage || 'Ошибка сервера';
           alert(`Ошибка: ${serverMsg}`);
       } else {
           alert('Ошибка: ' + (e.message || 'Unknown'));
       }
     }
  };
  
  const handleReorderSave = async (newOrderHabits) => {
      setHabits(newOrderHabits);
      setShowReorderModal(false);
      try {
        await api.put('/habits/reorder', { habits: newOrderHabits.map((h, i) => ({ id: h.id, order_index: i })) });
      } catch (e) { loadHabits(); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent1}/></View>;

  const todayDate = new Date();
  const currentDay = todayDate.getDate();
  const currentMonthIdx = todayDate.getMonth() + 1;
  const currentYearVal = todayDate.getFullYear();
  
  // STATS LOGIC: Filter only ACTIVE habits for today
  const activeHabitsToday = habits.filter(h => {
     // Check date range
     const dateObj = new Date(year, month - 1, currentDay);
     if (h.start_date) {
         const s = new Date(h.start_date); s.setHours(0,0,0,0);
         if (dateObj < s) return false;
     }
     if (h.end_date) {
         const e = new Date(h.end_date); e.setHours(23,59,59,999);
         if (dateObj > e) return false;
     }
     // Check day of week
     if (h.days_of_week && h.days_of_week.length > 0) {
         if (!h.days_of_week.includes(dateObj.getDay())) return false;
     }
     return true;
  });

  const totalHabitsToday = activeHabitsToday.length;
  const completedToday = records.filter(r => r.day === currentDay && r.value > 0 && activeHabitsToday.some(h => h.id === r.habitid)).length;
  
  const dailyPercent = totalHabitsToday > 0 ? Math.round((completedToday / totalHabitsToday) * 100) : (totalHabitsToday === 0 ? 100 : 0);
  const quotes = ["Действуй.", "Просто делай.", "Шаг за шагом.", "Не сдавайся.", "Ты сможешь."];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.section}>
         <Text style={{ textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }}>
           "{quotes[Math.floor(yearProgress.daysPassed % quotes.length)]}"
         </Text>

         {year === currentYearVal && month === currentMonthIdx && (
           <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <View>
                 <Text style={[styles.statsTitle, { color: colors.textMain }]}>СЕГОДНЯ</Text>
                 <Text style={[styles.statsValue, { color: colors.textMain }]}>{completedToday} <Text style={{ fontSize: 16, color: colors.textMuted }}>/ {totalHabitsToday}</Text></Text>
               </View>
               <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.accent1 }}>{dailyPercent}%</Text>
             </View>
           </View>
         )}

         <View style={[styles.lifeCard, { backgroundColor: 'rgba(148, 163, 184, 0.05)', borderColor: colors.borderSubtle }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
               <Text style={[styles.cardTitle, { color: colors.textMain }]}>ВРЕМЯ</Text>
               <Text style={{ fontSize: 10, color: colors.textMuted }}>MEMENTO MORI</Text>
            </View>
            <View style={{ gap: 12 }}>
               <LifeProgressBar label={`ПРОЖИТО: ${profile?.gender === 'female' ? 'Ж' : 'М'} / ${lifeProgress.yearsLived} ЛЕТ`} value={lifeProgress.percent} color={colors.danger1} />
               <LifeProgressBar label={`ГОД: ОСТАЛОСЬ ${yearProgress.daysLeft} ДН.`} value={yearProgress.percent} color={colors.accent1} />
            </View>
         </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
           <TouchableOpacity onPress={() => setShowDateModal(true)}>
             <Text style={[styles.sectionTitle, { color: colors.accent1, textDecorationLine: 'underline' }]}>
               {new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase()} ▼
             </Text>
           </TouchableOpacity>
           
           <View style={{ flexDirection: 'row', gap: 8 }}>
             {habits.length > 1 && (
               <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.borderSubtle }]} onPress={() => setShowReorderModal(true)}>
                 <Text style={{ color: colors.textMuted, fontSize: 18 }}>⇅</Text>
               </TouchableOpacity>
             )}
             <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.borderSubtle }]} onPress={() => openHabitModal(null)}>
               <Text style={{ color: colors.textMain, fontSize: 22, fontWeight: 'bold' }}>+</Text>
             </TouchableOpacity>
           </View>
        </View>

        {habits.length === 0 ? (
          <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}><Text style={{ color: colors.textMuted }}>Нет привычек</Text></View>
        ) : (
          <HabitTable
            habits={habits}
            year={year}
            month={month}
            records={records}
            onCellChange={handleCellChange}
            onHabitDelete={confirmDeleteHabit} 
            onHabitEdit={openHabitModal}       
          />
        )}
      </View>

      <ReorderHabitsModal visible={showReorderModal} habits={habits} onClose={() => setShowReorderModal(false)} onSave={handleReorderSave} />
      <MonthPickerModal visible={showDateModal} selectedYear={year} selectedMonth={month} onClose={() => setShowDateModal(false)} onSelect={(y, m) => { setYear(y); setMonth(m); }} />

      <Modal visible={showHabitModal} onClose={() => { setShowHabitModal(false); setShowCustomUnit(false); }} title={editingHabitId ? "Редактировать" : "Новая привычка"}>
        <Input label="Название" placeholder="Например: Чтение" value={habitForm.name} onChangeText={t => setHabitForm({...habitForm, name: t})} />
        <View style={{ marginBottom: 16 }}>
           <Text style={[styles.formLabel, { color: colors.textMain }]}>Тип цели</Text>
           <View style={{ flexDirection: 'row', gap: 8 }}>
              {['daily', 'monthly'].map(type => (
                <TouchableOpacity key={type} onPress={() => setHabitForm({...habitForm, targetType: type})} style={[styles.unitButtonSmall, { flex: 1, backgroundColor: habitForm.targetType === type ? colors.accent1 : colors.surface }]}>
                   <Text style={{ color: habitForm.targetType === type ? '#020617' : colors.textMain, fontWeight: '600' }}>{type === 'daily' ? 'В день' : 'В месяц'}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>
        <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
           <View style={{ flex: 1 }}><DatePicker label="Начало" value={habitForm.startDate} onChangeDate={d => setHabitForm({...habitForm, startDate: d})} /></View>
           <View style={{ flex: 1 }}><DatePicker label="Конец" value={habitForm.endDate} onChangeDate={d => setHabitForm({...habitForm, endDate: d})} /></View>
        </View>
        <View style={{ marginBottom: 16 }}>
           <Text style={[styles.formLabel, { color: colors.textMain }]}>Дни недели (если пусто = все)</Text>
           <DaysSelector selectedDays={habitForm.daysOfWeek} onSelect={d => setHabitForm({...habitForm, daysOfWeek: d})} />
        </View>
        <View style={{ marginBottom: 16 }}>
           <Text style={[styles.formLabel, { color: colors.textMain }]}>Единица и План</Text>
           <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {['Дни', 'Часы', 'Кол-во'].map(u => (
                 <TouchableOpacity key={u} style={[styles.unitButtonSmall, { backgroundColor: habitForm.unit === u && !showCustomUnit ? colors.accent1 : colors.surface }]} onPress={() => { setHabitForm({...habitForm, unit: u}); setShowCustomUnit(false); }}>
                    <Text style={{ color: habitForm.unit === u && !showCustomUnit ? '#020617' : colors.textMain }}>{u}</Text>
                 </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.unitButtonSmall, { backgroundColor: showCustomUnit ? colors.accent1 : colors.surface }]} onPress={() => { setShowCustomUnit(true); setHabitForm({...habitForm, unit: ''}); }}>
                 <Text style={{ color: showCustomUnit ? '#020617' : colors.textMain }}>Другое...</Text>
              </TouchableOpacity>
           </View>
           {showCustomUnit && <Input placeholder="Своя единица" value={habitForm.unit} onChangeText={t => setHabitForm({...habitForm, unit: t})} />}
           <Input placeholder="Число (План)" value={String(habitForm.plan)} onChangeText={t => setHabitForm({...habitForm, plan: t.replace(/[^0-9]/g, '')})} keyboardType="numeric" />
        </View>
        <Button title="Сохранить" onPress={saveHabit} />
      </Modal>

      <Modal visible={!!habitToDelete} onClose={() => setHabitToDelete(null)} title="Удалить привычку?">
         <View style={{ padding: 10 }}>
            <Text style={{ color: colors.textMain, marginBottom: 20, textAlign: 'center' }}>Вы уверены, что хотите удалить "{habitToDelete?.name}"?{'\n'}Все данные будут потеряны.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
               <Button title="Отмена" variant="outline" onPress={() => setHabitToDelete(null)} style={{ flex: 1 }} />
               <Button title="Удалить" onPress={executeDelete} style={{ flex: 1, backgroundColor: colors.danger1 }} />
            </View>
         </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16, elevation: 4 },
  statsTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  statsValue: { fontSize: 28, fontWeight: '800' },
  lifeCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  barContainer: { height: 20, width: '100%' },
  barBackground: { flex: 1, backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  barFill: { height: '100%', borderRadius: 10 },
  barTextContainer: { position: 'absolute', width: '100%', alignItems: 'center' },
  barLabel: { fontSize: 9, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  placeholder: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  unitButtonSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', minWidth: 60, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  daysSelectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircleText: { fontSize: 12, fontWeight: '600' }
});

export default HabitsScreen;

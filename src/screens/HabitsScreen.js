// src/screens/HabitsScreen.js
import React, { useState, useEffect } from 'react';
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
import api from '../services/api';
import HabitTable from '../components/HabitTable';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import DatePicker from '../components/DatePicker'; // <-- ADDED
import ReorderHabitsModal from '../components/ReorderHabitsModal';
import MonthPickerModal from '../components/MonthPickerModal';

// --- НОВЫЙ КОМПОНЕНТ ПРОГРЕСС-БАРА ---
const LifeProgressBar = ({ label, value, color }) => {
  const percent = Math.min(Math.max(value, 0), 100);
  
  return (
    <View style={styles.barContainer}>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
        
        {/* Текст поверх бара, по центру */}
        <View style={styles.barTextContainer}>
          <Text style={styles.barLabel}>
            {label}: {percent.toFixed(1)}%
          </Text>
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  
  // Updated State for New Habit
  const [newHabit, setNewHabit] = useState({
    name: '',
    unit: 'Дни',
    plan: '',
    targetType: 'monthly', // 'daily' or 'monthly'
    startDate: null,
    endDate: null,
    daysOfWeek: [], // [1, 2, 3...]
  });
  
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadHabits();
  }, []);

   // 1. При смене месяца загружаем настройки привычек
  useEffect(() => {
    loadHabits();
  }, [year, month]);

  // 2. Когда привычки загрузились (или сменился месяц), загружаем галочки
  useEffect(() => {
    if (habits.length > 0) {
      loadRecords();
    }
  }, [habits, year, month]);


// Дополнительно: перезагружать при изменении records (если с сервера пришли новые)
useEffect(() => {
  console.log('📊 Records обновлены, всего:', records.length);
}, [records]);


  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data);
      // Передаем дату И пол
      calculateLifeProgress(response.data.birthdate, response.data.gender);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  };

  const calculateLifeProgress = (birthdate, gender = 'male') => {
    // Если даты нет, сбрасываем прогресс и выходим
    if (!birthdate) {
      setLifeProgress({ percent: 0, yearsLived: 0, yearsLeft: 64 });
      setYearProgress({ percent: 0, daysPassed: 0, daysLeft: 365 });
      return;
    }

    const today = new Date();
    const birth = new Date(birthdate);
    
    // --- УЧЕТ ПОЛА ---\
    const lifeExpectancy = gender === 'female' ? 78.5 : 67.0;

    const ageMs = today - birth;
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    const lifePercent = Math.min(100, Math.round((ageYears / lifeExpectancy) * 100));
    const yearsLived = Math.floor(ageYears);
    const yearsLeft = Math.max(0, Math.round(lifeExpectancy - ageYears));

    setLifeProgress({ percent: lifePercent, yearsLived, yearsLeft });

    // --- ГОД ---\
    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();
    let yearStart = new Date(today.getFullYear(), birthMonth, birthDay);
    
    if (today < yearStart) {
      yearStart = new Date(today.getFullYear() - 1, birthMonth, birthDay);
    }
    
    const yearEnd = new Date(yearStart.getFullYear() + 1, birthMonth, birthDay - 1);
    const daysInYear = Math.round((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.round((today - yearStart) / (1000 * 60 * 60 * 24));
    const daysLeft = daysInYear - daysPassed;
    const yearPercent = Math.min(100, Math.round((daysPassed / daysInYear) * 100));

    setYearProgress({ percent: yearPercent, daysPassed, daysLeft });
  };



  const loadHabits = async () => {
    try {
      setLoading(true);
      // Передаем текущий год и месяц!
      const response = await api.get(`/habits?year=${year}&month=${month}`);
      
      // Фильтруем привычки: показываем только те, у которых shouldShow = true
      const visibleHabits = response.data.filter(h => h.shouldShow !== false);
      
      setHabits(visibleHabits);
      console.log('Привычек загружено:', visibleHabits.length);
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error);
    } finally {
      setLoading(false);
    }
  };


const loadRecords = async () => {
  try {
    console.log(`Загрузка записей за ${year}-${month}`);
    const response = await api.get(`/habits/records/${year}/${month}`);
    setRecords(response.data);
    console.log('Записей загружено:', response.data.length);
  } catch (error) {
    console.error('Ошибка загрузки записей:', error);
  }
};


  const handleCellChange = async (habitId, year, month, day, value) => {
    console.log('📝 Изменение ячейки:', { habitId, year, month, day, value });

    // Обновляем локальное состояние
    setRecords((prev) => {
      const filtered = prev.filter(
        (r) => !(r.habitid === habitId && r.day === day)
      );
      if (value && value > 0) {
        return [...filtered, { habitid: habitId, year, month, day, value }];
      }
      return filtered;
    });

    // Отправляем на сервер
    try {
      if (value && value > 0) {
        await api.post('/habits/records', { habit_id: habitId, year, month, day, value });
        console.log('✅ Запись сохранена');
      } else {\n        await api.delete(`/habits/records/${habitId}/${year}/${month}/${day}`);
        console.log('🗑️ Запись удалена');
      }
    } catch (error) {
      console.error('Ошибка сохранения записи:', error);
      loadRecords();
    }
  };



  const handleHabitDelete = async (habitId) => {
    try {
      console.log('🗑️ Удаление привычки (FIXED):', habitId);
      
      // 1. Сначала удаляем записи из локального стейта и пытаемся удалить их на сервере
      // (Это костыль, если нет каскадного удаления на бэке)
      const habitRecords = records.filter(r => r.habitid === habitId);
      console.log(`Найдено ${habitRecords.length} записей для удаления`);
      
      // Удаляем записи параллельно (оптимистично)
      const deletePromises = habitRecords.map(r => 
         api.delete(`/habits/records/${habitId}/${r.year}/${r.month}/${r.day}`)
           .catch(e => console.log('Err removing record:', e.message))
      );
      await Promise.all(deletePromises);

      // 2. Теперь удаляем саму привычку
      await api.delete(`/habits/${habitId}?year=${year}&month=${month}`);
      
      setHabits(habits.filter(h => h.id !== habitId));
      setRecords(records.filter(r => r.habitid !== habitId));
      console.log('✅ Привычка удалена полностью');
    } catch (error) {
      console.error('❌ Ошибка удаления привычки:', error);
      Alert.alert('Ошибка', 'Не удалось удалить привычку. Попробуйте очистить все ячейки вручную.');
    }
  };


  
   const handleHabitUpdate = async (habitId, updates) => {
    try {
      console.log('🔄 Обновление привычки:', habitId, updates);
      await api.put(`/habits/${habitId}`, {
        name: updates.name,
        unit: updates.unit,
        plan: updates.plan,
        year,  // <--- ДОБАВЛЯЕМ ГОД
        month, // <--- ДОБАВЛЯЕМ МЕСЯЦ
      });

      // Обновляем локально
      setHabits(habits.map(h =>
        h.id === habitId
          ? { ...h, name: updates.name, unit: updates.unit, plan: updates.plan }
          : h
      ));
      console.log('✅ Привычка обновлена');
    } catch (error) {
      console.error('❌ Ошибка обновления привычки:', error);
      alert('Не удалось обновить привычку');
    }
  };


const handleReorderSave = async (newOrderHabits) => {
  try {
    // 1. Оптимистично обновляем UI
    setHabits(newOrderHabits);
    setShowReorderModal(false);

    // 2. Готовим данные для сервера
    const payload = newOrderHabits.map((habit, index) => ({
      id: habit.id,
      order_index: index
    }));

    // 3. Отправляем на сервер
    console.log('🔄 Saving new order...', payload);
    await api.put('/habits/reorder', { habits: payload });
    console.log('✅ Order saved');
  } catch (error) {
    console.error('❌ Failed to save order:', error);
    alert('Ошибка при сохранении порядка');
    loadHabits(); // Откат при ошибке
  }
};


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent1} />
      </View>
    );
  }

  // --- РАСЧЕТ СТАТИСТИКИ НА СЕГОДНЯ ---
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonthView = year === today.getFullYear() && month === (today.getMonth() + 1);

  // Сколько привычек всего
  const totalHabits = habits.length;
  
  // Сколько выполнено сегодня (ищем в records записи за текущий день с value > 0)
  const completedToday = records.filter(r => r.day === currentDay && r.value > 0).length;
  
  // Процент выполнения
  const dailyPercent = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  
  const quotes = [
    "Мы — это то, что мы делаем постоянно.",
    "Дисциплина — это решение делать то, чего очень не хочется.",
    "Путь в тысячу ли начинается с первого шага.",
    "Привычка — вторая натура.",
    "Не жди вдохновения, стань дисциплинированным."
  ];
  const quoteIndex = Math.floor(yearProgress.daysPassed % quotes.length);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
                  <View style={styles.section}>
        
        {/* 1. ЦИТАТА ДНЯ */}
        <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
          <Text style={{ 
            fontSize: 14, 
            fontStyle: 'italic', 
            color: colors.textMuted, 
            textAlign: 'center',
            lineHeight: 20
          }}>
            "{quotes[quoteIndex]}"
          </Text>
        </View>

        {/* 2. КАРТОЧКА "СЕГОДНЯ" */}
        {isCurrentMonthView && (
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.statsTitle, { color: colors.textMain }]}>СЕГОДНЯ</Text>
                <Text style={[styles.statsValue, { color: colors.textMain }]}>
                  {completedToday} <Text style={{ fontSize: 16, color: colors.textMuted }}>/ {totalHabits}</Text>
                </Text>
              </View>
              
              {/* Круговой индикатор */}
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.accent1 }}>
                  {dailyPercent}%
                </Text>
              </View>
            </View>
            
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
              {dailyPercent === 100 ? "🔥 Все привычки выполнены!" : 
               dailyPercent >= 50 ? "👍 Отличный темп!" : "⏳ Поднажми!"}
            </Text>
          </View>
        )}

        {/* 3. КАРТОЧКА "ЖИЗНЬ" */}
        <View style={[styles.lifeCard, { backgroundColor: 'rgba(148, 163, 184, 0.05)', borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
             <Text style={[styles.cardTitle, { color: colors.textMain }]}>ВРЕМЯ</Text>
             <Text style={{ fontSize: 10, color: colors.textMuted }}>MEMENTO MORI</Text>
          </View>

          <View style={styles.lifeBlock}>
            {/* ПРОЖИТО */}
            <LifeProgressBar 
              label={`ПРОЖИТО (${profile?.gender === 'female' ? 'Ж' : 'М'} / ${lifeProgress.yearsLived} ЛЕТ)`} 
              value={lifeProgress.percent} 
              color={colors.danger1} 
            />

            {/* ДО ДР */}
            <LifeProgressBar 
              label={`ГОД (${yearProgress.daysLeft} ДН. ОСТАЛОСЬ)`} 
              value={yearProgress.percent} 
              color={colors.accent1} 
            />
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
            {/* НОВАЯ КНОПКА СОРТИРОВКИ */}
            {habits.length > 1 && (
              <TouchableOpacity 
                style={[styles.addButton, { borderColor: colors.borderSubtle, width: 32, height: 32 }]} 
                onPress={() => setShowReorderModal(true)}
              >
                <Text style={{ fontSize: 16, color: colors.textMuted }}>⇅</Text>
              </TouchableOpacity>
            )}

            {/* Старая кнопка добавления */}
            <TouchableOpacity 
              style={[styles.addButton, { borderColor: colors.borderSubtle }]} 
              onPress={() => {
                  setNewHabit({ name: '', unit: 'Дни', plan: '', targetType: 'monthly', startDate: null, endDate: null, daysOfWeek: [] });
                  setEditingHabit(null);
                  setShowAddModal(true);
              }}
            >
              <Text style={[styles.addButtonText, { color: colors.textMain }]}>+</Text>
            </TouchableOpacity>
          </View>
                {/* Модалка сортировки */}
      <ReorderHabitsModal
        visible={showReorderModal}
        habits={habits}
        onClose={() => setShowReorderModal(false)}
        onSave={handleReorderSave}
      />
  {/* Модалка выбора даты */}
  <MonthPickerModal
    visible={showDateModal}
    selectedYear={year}
    selectedMonth={month}
    onClose={() => setShowDateModal(false)}
    onSelect={(newYear, newMonth) => {
      setYear(newYear);
      setMonth(newMonth);
    }}
  />

        </View>


        {habits.length === 0 ? (
          <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              Нет привычек
            </Text>
          </View>
        ) : (
          <HabitTable
            habits={habits}
            year={year}
            month={month}
            records={records}
            onCellChange={handleCellChange}
            onHabitDelete={handleHabitDelete} // Исправленная функция
            onHabitUpdate={handleHabitUpdate}
          />
        )}
      </View>

            <Modal
        visible={showAddModal}
        onClose={() => {
          setNewHabit({ name: '', unit: 'Дни', plan: '' });
          setEditingHabit(null);
          setShowAddModal(false);
          setShowCustomUnit(false);
        }}
        title={editingHabit ? "Редактировать привычку" : "Новая привычка"}
      >
        <Input
          label="Название привычки"
          placeholder="Например: Отжимания"
          value={newHabit.name}
          onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
        />

        {/* --- НОВЫЙ БЛОК: ТИП ЦЕЛИ --- */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.formLabel, { color: colors.textMain }]}>Тип цели</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
             <TouchableOpacity 
               onPress={() => setNewHabit({ ...newHabit, targetType: 'daily' })}
               style={[
                 styles.unitButtonSmall, 
                 { backgroundColor: newHabit.targetType === 'daily' ? colors.accent1 : colors.surface, flex: 1 }
               ]}
             >
                <Text style={{ color: newHabit.targetType === 'daily' ? '#020617' : colors.textMain, fontWeight: '600' }}>
                  В день
                </Text>
             </TouchableOpacity>

             <TouchableOpacity 
               onPress={() => setNewHabit({ ...newHabit, targetType: 'monthly' })}
               style={[
                 styles.unitButtonSmall, 
                 { backgroundColor: newHabit.targetType === 'monthly' ? colors.accent1 : colors.surface, flex: 1 }
               ]}
             >
                <Text style={{ color: newHabit.targetType === 'monthly' ? '#020617' : colors.textMain, fontWeight: '600' }}>
                  В месяц
                </Text>
             </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
             {newHabit.targetType === 'daily' 
               ? 'Цель рассчитывается на каждый активный день.' 
               : 'Общая цель на весь месяц.'}
          </Text>
        </View>

        {/* --- НОВЫЙ БЛОК: ДАТЫ --- */}
        <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
           <View style={{ flex: 1 }}>
              <DatePicker 
                label="Дата начала"
                value={newHabit.startDate}
                onChangeDate={(d) => setNewHabit({ ...newHabit, startDate: d })}
              />
           </View>
           <View style={{ flex: 1 }}>
              <DatePicker 
                label="Дата окончания"
                value={newHabit.endDate}
                onChangeDate={(d) => setNewHabit({ ...newHabit, endDate: d })}
              />
           </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.formLabel, { color: colors.textMain }]}>
            Единица измерения
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {['Дни', 'Часы', 'Кол-во'].map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButtonSmall,
                  {
                    backgroundColor: newHabit.unit === unit && !showCustomUnit ? colors.accent1 : colors.surface,
                    borderColor: newHabit.unit === unit && !showCustomUnit ? colors.accent1 : colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  setNewHabit({ ...newHabit, unit });
                  setShowCustomUnit(false);
                }}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    { color: newHabit.unit === unit && !showCustomUnit ? '#020617' : colors.textMain },
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}\n            <TouchableOpacity
              style={[
                styles.unitButtonSmall,
                {
                  backgroundColor: showCustomUnit ? colors.accent1 : colors.surface,
                  borderColor: showCustomUnit ? colors.accent1 : colors.borderSubtle,
                },
              ]}
              onPress={() => {
                setShowCustomUnit(true);
                setNewHabit({ ...newHabit, unit: '' });
              }}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  { color: showCustomUnit ? '#020617' : colors.textMain },
                ]}
              >
                Другое...
              </Text>
            </TouchableOpacity>
          </View>
          {showCustomUnit && (
            <Input
              placeholder="Введите свою единицу"
              value={newHabit.unit}
              onChangeText={(text) => setNewHabit({ ...newHabit, unit: text })}
              style={{ marginTop: 8 }}
            />
          )}
        </View>

        <Input
          label="План"
          placeholder="Введите число"
          value={newHabit.plan === '' ? '' : String(newHabit.plan)}
          onChangeText={(text) => {
            const num = text.replace(/[^0-9]/g, '');
            setNewHabit({ ...newHabit, plan: num === '' ? '' : parseInt(num) });
          }}
          keyboardType="numeric"
        />

        <Button
          title={editingHabit ? "Сохранить" : "Добавить"}
                    onPress={async () => {
            // 1. Валидация
            if (!newHabit.name.trim()) {
              alert('Введите название привычки');
              return;
            }

            if (!newHabit.unit || (!newHabit.unit.trim() && !showCustomUnit)) {
              alert('Выберите или введите единицу измерения');
              return;
            }

            // 2. Подготовка данных
            const planValue = newHabit.plan === '' ? 1 : parseInt(newHabit.plan) || 1;
            
            // Данные для отправки
            const habitPayload = {
              name: newHabit.name,
              unit: newHabit.unit,
              plan: planValue,
              year,   
              month,  
              // Новые поля
              target_type: newHabit.targetType,
              start_date: newHabit.startDate,
              end_date: newHabit.endDate,
              // days_of_week: newHabit.daysOfWeek // TODO: Add logic for this later
            };

            try {
              if (editingHabit) {
                // --- РЕДАКТИРОВАНИЕ ---
                console.log('🔄 Updating habit:', editingHabit.id);
                await api.put(`/habits/${editingHabit.id}`, habitPayload);
                
                // Обновляем список привычек локально
                setHabits(habits.map(h => 
                  h.id === editingHabit.id ? { ...h, ...habitPayload } : h
                ));
              } else {
                // --- СОЗДАНИЕ НОВОЙ ---
                console.log('✨ Creating new habit:', habitPayload);
                const response = await api.post('/habits', habitPayload);
                
                // Добавляем новую привычку в список локально
                setHabits([...habits, response.data]);
              }

              // 3. Очистка и закрытие
              setNewHabit({ name: '', unit: 'Дни', plan: '', targetType: 'monthly', startDate: null, endDate: null, daysOfWeek: [] });
              setEditingHabit(null);
              setShowAddModal(false);
              setShowCustomUnit(false);
              
            } catch (error) {
              console.error('❌ Ошибка сохранения привычки:', error);
              alert('Не удалось сохранить привычку');
            }
          }}

        />
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.12,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBar: {
    height: 24,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    justifyContent: 'center',\n    alignItems: 'center',
  },
  progressText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#020617',
},
  progressDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  placeholder: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#020617',
},

  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
   unitButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // --- НОВЫЕ СТИЛИ ДЛЯ БАРОВ ---
  lifeBlock: {
    paddingHorizontal: 0, // Убрали отступ, чтобы было по ширине контента
    marginTop: 10,
    gap: 12,
  },
  barContainer: {
    height: 24,
    width: '100%',
  },
  barBackground: {
    flex: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)', // Универсальный полупрозрачный
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  barTextContainer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#FFFFFF', // Белый текст всегда
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Тень для читаемости
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
// Карточка статистики (Сегодня)
  statsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    // Тень для объема
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  
  // Карточка жизни
  lifeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default HabitsScreen;

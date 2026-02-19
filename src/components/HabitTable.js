// src/components/HabitTable.js
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const HOLIDAYS_2026 = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  2: [23],
  3: [8],
  5: [1, 9],
  6: [12],
  11: [4],
};

const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const ROW_HEIGHT = 50; // Фиксированная высота строки для синхронизации

const HabitTable = ({ habits, year, month, records, onCellChange, onHabitDelete, onHabitUpdate }) => {
  const { colors } = useTheme();
  // Нам нужен только ОДИН реф для горизонтального скролла
  const horizontalScrollRef = useRef(null);
  
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [editHabitName, setEditHabitName] = useState('');
  const [editHabitPlan, setEditHabitPlan] = useState('');

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  // АВТОСКРОЛЛ на сегодняшний день
  useEffect(() => {
    if (isCurrentMonth && horizontalScrollRef.current) {
      // Скроллим так, чтобы сегодня было по центру
      // Ширина дня = 36. 
      // Центр экрана ~ width / 2.
      // Смещение = (today * 36) - (screenWidth / 2) + (half_of_day_width)
      // Упрощенно: (today - 2) * 36
      const scrollX = Math.max(0, (today - 3) * 36); 
      
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 500); // Даем время на рендер
    }
  }, [month, year, isCurrentMonth, habits.length]); // Добавил habits.length чтобы скроллить при загрузке


  const getDayOfWeek = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    return DAYS_SHORT[date.getDay()];
  };

  const isWeekend = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isHoliday = (year, month, day) => {
    if (year !== 2026) return false;
    return HOLIDAYS_2026[month]?.includes(day) || false;
  };

  const getValue = (habitId, day) => {
    if (!records) return 0;
    const record = records.find((r) => r.habitid === habitId && r.day === day);
    if (!record) return 0;
    
    if (record.value === '✓' || record.value === 'v' || record.value === '√') {
      return 1;
    }
    return parseFloat(record.value) || 0;
  };

  const getCellType = (unit) => {
    if (!unit) return 'count';
    const unitLower = unit.toLowerCase();
    if (unitLower.includes('час')) return 'time';
    if (unitLower.includes('кол-во') || unitLower.includes('раз')) return 'count';
    if (unitLower.includes('дн') || unitLower.includes('дни')) return 'check';
    return 'count';
  };

  const handleCellClick = (habitId, day) => {
    const currentValue = getValue(habitId, day);
    const habit = habits.find((h) => h.id === habitId);
    const cellType = getCellType(habit.unit);

    if (cellType === 'check') {
      const newValue = currentValue ? 0 : 1;
      onCellChange(habitId, year, month, day, newValue);
    } else if (cellType === 'count') {
      const newValue = currentValue ? currentValue + 1 : 1;
      onCellChange(habitId, year, month, day, newValue);
    } else if (cellType === 'time') {
      const newValue = currentValue ? currentValue + 1 : 1;
      onCellChange(habitId, year, month, day, newValue);
    }
  };

  const calculateStats = (habitId) => {
    if (!records) return { total: 0, percent: 0 };
    const habitRecords = records.filter((r) => r.habitid === habitId);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return { total: 0, percent: 0 };

    const cellType = getCellType(habit.unit);
    
    if (cellType === 'check') {
      const completedDays = habitRecords.filter(r => {
        const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
        return val > 0;
      }).length;
      const plan = habit.plan;
      const percent = plan > 0 ? Math.min(100, Math.round((completedDays / plan) * 100)) : 0;
      return { total: completedDays, percent };
      
    } else if (cellType === 'time') {
      const totalHours = habitRecords.reduce((sum, r) => {
        const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
        return sum + val;
      }, 0);
      const plan = habit.plan;
      const percent = plan > 0 ? Math.min(100, Math.round((totalHours / plan) * 100)) : 0;
      const displayTotal = totalHours >= 1 ? `${Math.floor(totalHours)}ч` : `${totalHours.toFixed(1)}ч`;
      return { total: displayTotal, percent };
    } else {
      const totalCount = habitRecords.reduce((sum, r) => {
        const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
        return sum + val;
      }, 0);
      const plan = habit.plan;
      const percent = plan > 0 ? Math.min(100, Math.round((totalCount / plan) * 100)) : 0;
      return { total: Math.round(totalCount), percent };
    }
  };

  const renderCell = (habit, day) => {
    const value = getValue(habit.id, day);
    const cellType = getCellType(habit.unit);
    const isToday = isCurrentMonth && day === today;
    const isHolidayDay = isHoliday(year, month, day);
    const isWeekendDay = isWeekend(year, month, day);

    let cellContent = '';
    let showValue = false;

    if (value > 0) {
      if (cellType === 'check') {
        cellContent = '✓';
        showValue = true;
      } else if (cellType === 'time') {
        cellContent = value >= 1 ? `${Math.floor(value)}ч` : `${value.toFixed(1)}ч`;
        showValue = true;
      } else {
        cellContent = Math.round(value);
        showValue = true;
      }
    }

    let gradientColors = [colors.surface, colors.surface];
    if (showValue) {
      gradientColors = [colors.accent1 + 'A0', colors.accent1 + '60', colors.accent1 + '30'];
    } else if (isToday) {
      gradientColors = [colors.accent1 + '40', colors.accent1 + '20', colors.accent1 + '05'];
    } else if (isHolidayDay) {
      gradientColors = ['rgba(251, 191, 36, 0.5)', 'rgba(245, 158, 11, 0.35)', 'rgba(217, 119, 6, 0.2)'];
    } else if (isWeekendDay) {
      gradientColors = ['rgba(251, 113, 133, 0.4)', 'rgba(244, 63, 94, 0.25)', 'rgba(225, 29, 72, 0.15)'];
    }

    return (
      <TouchableOpacity
        key={`${habit.id}-${day}`}
        onPress={() => handleCellClick(habit.id, day)}
        onLongPress={() => {
          setEditingCell({ habitId: habit.id, day, currentValue: value, cellType });
          setInputValue(value > 0 ? String(value) : '');
          setShowInputModal(true);
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.dayCell,
            { borderColor: colors.borderSubtle },
            isToday && { borderColor: colors.accent1, borderWidth: 2 }
          ]}
        >
          <Text style={[styles.cellText, { color: colors.textMain }]}>
            {cellContent}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // --- SWIPE ACTIONS ---
  const renderRightActions = (progress, dragX, habit) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={{ width: 80, flexDirection: 'row' }}>
         {/* Edit Button */}
        <TouchableOpacity
          onPress={() => {
             setEditingHabit(habit);
             setEditHabitName(habit.name);
             setEditHabitPlan(String(habit.plan));
             setShowEditModal(true);
          }}
          style={[styles.swipeActionBtn, { backgroundColor: colors.accent1 }]}
        >
          <Animated.Text style={{ color: '#020617', transform: [{ scale }] }}>✎</Animated.Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => {
              if (onHabitDelete) onHabitDelete(habit.id);
          }}
          style={[styles.swipeActionBtn, { backgroundColor: colors.danger1 }]}
        >
          <Animated.Text style={{ color: '#020617', transform: [{ scale }] }}>🗑️</Animated.Text>
        </TouchableOpacity>
      </View>
    );
  };


  const contentWidth = 45 + 45 + (daysInMonth * 36) + 45;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.tableContainer, { borderColor: colors.accentBorder }]}>
        
        {/* --- ЛЕВАЯ ФИКСИРОВАННАЯ КОЛОНКА (НАЗВАНИЯ) --- */}
        <View style={[styles.fixedColumnContainer, { borderRightColor: colors.accentBorder, backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.fixedHeaderCell, { height: ROW_HEIGHT, borderBottomColor: colors.accentBorder }]}>
             <Text style={[styles.headerText, { color: colors.accent1 }]}>ЗАДАЧА</Text>
          </View>
          
          {/* Rows */}
          {habits.map((habit, index) => (
             <Swipeable
                key={habit.id}
                renderRightActions={(p, d) => renderRightActions(p, d, habit)}
                containerStyle={{ height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }}
             >
                <View style={[styles.fixedRowCell, { height: ROW_HEIGHT, backgroundColor: colors.surface }]}>
                   <Text style={[styles.habitName, { color: colors.textMain }]} numberOfLines={2}>
                     {habit.name}
                   </Text>
                </View>
             </Swipeable>
          ))}
        </View>

        {/* --- ПРАВАЯ СКРОЛЛИРУЕМАЯ ЧАСТЬ (ДАННЫЕ) --- */}
        <ScrollView 
           horizontal 
           ref={horizontalScrollRef}
           showsHorizontalScrollIndicator={true}
           contentContainerStyle={{ flexGrow: 1 }}
        >
          <View>
             {/* Header Row */}
             <View style={[styles.row, { height: ROW_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.accentBorder }]}>
                {/* Unit */}
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
                   <Text style={[styles.headerText, { color: colors.textMain }]}>ЕД.</Text>
                </View>
                {/* Plan */}
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
                   <Text style={[styles.headerText, { color: colors.textMain }]}>ПЛАН</Text>
                </View>
                {/* Days */}
                {days.map(day => {
                    const isHolidayDay = isHoliday(year, month, day);
                    const isWeekendDay = isWeekend(year, month, day);
                    const dayOfWeek = getDayOfWeek(year, month, day);
                    const dayColor = (isHolidayDay || isWeekendDay) ? colors.danger1 : colors.textMain;
                    return (
                       <View key={day} style={[styles.dayColumn, { borderRightColor: colors.borderSubtle }]}>
                          <Text style={[styles.dayNumber, { color: dayColor }]}>{day}</Text>
                          <Text style={[styles.dayName, { color: colors.textMain }]}>{dayOfWeek}</Text>
                       </View>
                    );
                })}
                {/* Total */}
                <View style={[styles.columnCell, { borderLeftWidth: 2, borderLeftColor: colors.accentBorder }]}>
                   <Text style={[styles.headerText, { color: colors.textMain }]}>ИТОГ</Text>
                </View>
                {/* Percent */}
                <View style={[styles.columnCell, { borderLeftWidth: 2, borderLeftColor: colors.accentBorder, width: 55 }]}>
                   <Text style={[styles.headerText, { color: colors.accent1 }]}>%</Text>
                </View>
             </View>

             {/* Data Rows */}
             {habits.map((habit, index) => {
                const stats = calculateStats(habit.id);
                return (
                   <View key={habit.id} style={[styles.row, { height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }]}>
                      {/* Unit */}
                      <View style={[styles.dataCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
                         <Text style={[styles.cellText, { color: colors.textMain }]}>{habit.unit}</Text>
                      </View>
                      {/* Plan */}
                      <View style={[styles.dataCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
                         <Text style={[styles.cellText, { color: colors.textMain }]}>{habit.plan}</Text>
                      </View>
                      {/* Days */}
                      {days.map(day => renderCell(habit, day))}
                      {/* Total */}
                      <View style={[styles.dataCell, { borderLeftWidth: 2, borderLeftColor: colors.accentBorder }]}>
                         <Text style={[styles.totalText, { color: colors.textMain }]}>{stats.total}</Text>
                      </View>
                      {/* Percent */}
                      <View style={[styles.dataCell, { borderLeftWidth: 2, borderLeftColor: colors.accentBorder, width: 55 }]}>
                         <Text style={[styles.percentText, { 
                            color: stats.percent >= 80 ? colors.accent1 : stats.percent >= 50 ? colors.accent2 : colors.textMuted
                         }]}>{stats.percent}%</Text>
                      </View>
                   </View>
                );
             })}
          </View>
        </ScrollView>

      </View>

      {/* --- MODALS (Copy Paste from prev) --- */}
      <Modal
        visible={showInputModal}
        onClose={() => {
          setShowInputModal(false);
          setEditingCell(null);
          setInputValue('');
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            setTimerSeconds(0);
          }
        }}
        title="Редактировать значение"
      >
        {editingCell && (
          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: colors.textMain }]}>
              День {editingCell.day} • {habits.find(h => h.id === editingCell.habitId)?.name}
            </Text>

            {editingCell.cellType === 'time' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.timerDisplay, { color: colors.accent1 }]}>
                  {Math.floor(timerSeconds / 3600)}:{String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}
                </Text>
                <Button
                  title={timerRunning ? "⏸ Остановить" : "▶ Запустить"}
                  onPress={() => {
                    if (timerRunning) {
                      clearInterval(timerIntervalRef.current);
                      setTimerRunning(false);
                      const hours = timerSeconds / 3600;
                      setInputValue(hours.toFixed(2));
                    } else {
                      setTimerRunning(true);
                      timerIntervalRef.current = setInterval(() => {
                        setTimerSeconds(prev => prev + 1);
                      }, 1000);
                    }
                  }}
                />
              </View>
            )}

            <Input
              label="Значение"
              placeholder="Введите число"
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <Button
                title="🗑 Очистить"
                onPress={() => {
                  onCellChange(editingCell.habitId, year, month, editingCell.day, 0);
                  setShowInputModal(false);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="✓ Сохранить"
                onPress={() => {
                  const value = parseFloat(inputValue) || 0;
                  onCellChange(editingCell.habitId, year, month, editingCell.day, value);
                  setShowInputModal(false);
                  if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    setTimerRunning(false);
                    setTimerSeconds(0);
                  }
                }}
                style={styles.modalButton}
              />
            </View>
          </View>
        )}
      </Modal>
      
<Modal
  visible={showEditModal}
  onClose={() => {
    setShowEditModal(false);
    setEditingHabit(null);
    setEditHabitName('');
    setEditHabitPlan('');
    setShowCustomUnit(false);
  }}
  title="Редактировать привычку"
>
  {editingHabit && (
    <View style={styles.modalContent}>
      <Input
        label="Название"
        placeholder="Название привычки"
        value={editHabitName}
        onChangeText={setEditHabitName}
      />

      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.inputLabel, { color: colors.textMain, marginBottom: 8 }]}>
          Единица измерения
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Дни', 'Часы', 'Кол-во'].map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[
                styles.unitButtonSmall,
                {
                  backgroundColor: editingHabit.unit === unit && !showCustomUnit ? colors.accent1 : colors.surface,
                  borderColor: editingHabit.unit === unit && !showCustomUnit ? colors.accent1 : colors.borderSubtle,
                },
              ]}
              onPress={() => {
                setEditingHabit({ ...editingHabit, unit });
                setShowCustomUnit(false);
              }}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  { color: editingHabit.unit === unit && !showCustomUnit ? '#020617' : colors.textMain },
                ]}
              >
                {unit}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.unitButtonSmall,
              {
                backgroundColor: showCustomUnit ? colors.accent1 : colors.surface,
                borderColor: showCustomUnit ? colors.accent1 : colors.borderSubtle,
              },
            ]}
            onPress={() => {
              setShowCustomUnit(true);
              setEditingHabit({ ...editingHabit, unit: '' });
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
            value={editingHabit.unit}
            onChangeText={(text) => setEditingHabit({ ...editingHabit, unit: text })}
            style={{ marginTop: 8 }}
          />
        )}
      </View>

      <Input
        label="План"
        placeholder="Цель на месяц"
        value={editHabitPlan}
        onChangeText={setEditHabitPlan}
        keyboardType="numeric"
      />

      <View style={styles.modalButtons}>
       <Button
  title="🗑️ Удалить"
  onPress={() => {
    // Используем нативный confirm для веба и Alert для мобилки
    if (Platform.OS === 'web') {
      if (window.confirm(`Вы уверены что хотите удалить \"${editingHabit.name}\"?\\nВсе данные будут потеряны.`)) {
        if (onHabitDelete) {
          onHabitDelete(editingHabit.id);
          setShowEditModal(false);
          setEditingHabit(null);
          setShowCustomUnit(false);
        }
      }
    } else {
      Alert.alert(
        'Удалить привычку?',
        `Вы уверены что хотите удалить \"${editingHabit.name}\"?\\nВсе данные будут потеряны.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {\n            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              if (onHabitDelete) {
                onHabitDelete(editingHabit.id);
                setShowEditModal(false);
                setEditingHabit(null);
                setShowCustomUnit(false);
              }
            },
          },
        ]
      );
    }
  }}
  variant="outline"
  style={[styles.modalButton, { flex: 0.3 }]}
/>

        <Button
          title="✓ Сохранить"
          onPress={() => {
            if (!editHabitName.trim()) {
              Alert.alert('Ошибка', 'Введите название привычки');
              return;
            }

            if (!editingHabit.unit || editingHabit.unit.trim() === '') {
              Alert.alert('Ошибка', 'Выберите или введите единицу измерения');
              return;
            }

            const planValue = editHabitPlan === '' ? editingHabit.plan : parseInt(editHabitPlan) || 1;

            if (onHabitUpdate) {
              onHabitUpdate(editingHabit.id, {
                name: editHabitName,
                unit: editingHabit.unit,
                plan: planValue,
              });
              setShowEditModal(false);
              setEditingHabit(null);
              setShowCustomUnit(false);
            }
          }}
          style={[styles.modalButton, { flex: 0.7 }]}
        />
      </View>
    </View>
  )}
</Modal>

    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fixedColumnContainer: {
    width: 120, // Ширина фиксированной колонки
    zIndex: 10,
    elevation: 2,
    borderRightWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fixedHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 2,
  },
  fixedRowCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  habitName: {
    fontSize: 12, // Увеличил
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Right Part
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnCell: {
    width: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayColumn: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  dataCell: {
    width: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  dayCell: {
    width: 36,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  
  // Text Styles
  headerText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNumber: { fontSize: 11, fontWeight: '700' },
  dayName: { fontSize: 7, fontWeight: '500' },
  cellText: { fontSize: 11, fontWeight: '600' },
  totalText: { fontSize: 12, fontWeight: '700' },
  percentText: { fontSize: 12, fontWeight: '800' },

  // Swipe
  swipeActionBtn: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal
  modalContent: { padding: 20 },
  modalSubtitle: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  timerDisplay: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginVertical: 14 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1 },
  unitButtonSmall: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', minWidth: 80 },
  unitButtonText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  inputLabel: { fontSize: 14, fontWeight: '500' },
});

export default HabitTable;

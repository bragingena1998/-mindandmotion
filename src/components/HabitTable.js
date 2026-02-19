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
const ROW_HEIGHT = 50;

const HabitTable = ({ habits, year, month, records, onCellChange, onHabitDelete, onHabitEdit }) => {
  const { colors } = useTheme();
  const horizontalScrollRef = useRef(null);
  
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef(null);
  
  // State for toggling Total view (Average vs Sum) for specific habits
  const [averageMode, setAverageMode] = useState({}); // { habitId: boolean }

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  // Auto-scroll logic
  useEffect(() => {
    if (isCurrentMonth && horizontalScrollRef.current) {
      const scrollX = Math.max(0, (today - 3) * 36); 
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 500);
    }
  }, [month, year, isCurrentMonth, habits.length]); 

  // --- HELPERS ---

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

  // CHECK IF DAY IS ACTIVE FOR HABIT
  const isDayActive = (habit, day) => {
    const date = new Date(year, month - 1, day);
    
    // 1. Date Range Check
    if (habit.start_date) {
       const start = new Date(habit.start_date);
       // Reset time for accurate comparison
       start.setHours(0,0,0,0);
       if (date < start) return false;
    }
    if (habit.end_date) {
       const end = new Date(habit.end_date);
       end.setHours(23,59,59,999);
       if (date > end) return false;
    }

    // 2. Days of Week Check
    // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
    // Our DB/UI: 0=Sun, 1=Mon ... 6=Sat (same)
    if (habit.days_of_week && habit.days_of_week.length > 0) {
       const dayIndex = date.getDay();
       if (!habit.days_of_week.includes(dayIndex)) return false;
    }

    return true;
  };

  const getValue = (habitId, day) => {
    if (!records) return 0;
    const record = records.find((r) => r.habitid === habitId && r.day === day);
    if (!record) return 0;
    if (record.value === '✓' || record.value === 'v' || record.value === '√') return 1;
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

  // --- INTERACTION ---

  const handleCellClick = (habitId, day) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!isDayActive(habit, day)) return; // Disable click for inactive days

    const currentValue = getValue(habitId, day);
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

  // --- STATS CALCULATION ---

  const calculateStats = (habit) => {
    const habitRecords = records ? records.filter((r) => r.habitid === habit.id) : [];
    const cellType = getCellType(habit.unit);
    
    // 1. Calculate Active Days Count (for denominator)
    let activeDaysCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
       if (isDayActive(habit, d)) activeDaysCount++;
    }

    // 2. Calculate Actuals
    let currentTotal = 0;
    let daysWithData = 0;

    habitRecords.forEach(r => {
      // Only count value if day is active? Or allow "bonus"? Let's count everything for now but plan is based on active.
      const val = (r.value === '✓' || r.value === 'v') ? 1 : (parseFloat(r.value) || 0);
      if (val > 0) {
        currentTotal += val;
        daysWithData++; // For average calculation
      }
    });

    // 3. Logic Branch: Monthly vs Daily Target
    let plan = 0;
    let percent = 0;

    if (habit.target_type === 'daily') {
       // Daily Target Logic
       // Total Target = Daily Plan * Active Days
       const dailyPlan = habit.plan || 0;
       plan = dailyPlan * activeDaysCount;
       
       // Percent is based on Total Target
       percent = plan > 0 ? Math.min(100, Math.round((currentTotal / plan) * 100)) : 0;

    } else {
       // Monthly Target Logic (Default)
       plan = habit.plan || 0;
       percent = plan > 0 ? Math.min(100, Math.round((currentTotal / plan) * 100)) : 0;
    }

    // 4. Formatting Total
    let displayTotal = '';
    
    // Check if we are in "Average" mode for this habit
    if (averageMode[habit.id] && cellType !== 'check') {
       // Average logic
       const divisor = daysWithData > 0 ? daysWithData : 1;
       const avg = currentTotal / divisor;
       displayTotal = cellType === 'time' ? `${avg.toFixed(1)}ч/д` : `${avg.toFixed(1)}/д`;
    } else {
       // Sum logic
       if (cellType === 'check') {
         displayTotal = `${currentTotal}`; // Just count of checks
       } else if (cellType === 'time') {
         displayTotal = currentTotal >= 1 ? `${Math.floor(currentTotal)}ч` : `${currentTotal.toFixed(1)}ч`;
       } else {
         displayTotal = `${Math.round(currentTotal)}`;
       }
    }

    return { total: displayTotal, percent };
  };

  // --- RENDERERS ---

  const renderCell = (habit, day) => {
    const isActive = isDayActive(habit, day);
    const value = getValue(habit.id, day);
    const cellType = getCellType(habit.unit);
    const isToday = isCurrentMonth && day === today;
    const isHolidayDay = isHoliday(year, month, day);
    const isWeekendDay = isWeekend(year, month, day);

    // Style for Inactive
    if (!isActive) {
       return (
         <View key={`${habit.id}-${day}`} style={[styles.dayCell, { backgroundColor: colors.background, opacity: 0.3, borderRightWidth: 1, borderColor: colors.borderSubtle }]}>
            {/* Empty or maybe a small dash? */}
         </View>
       );
    }

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

  const renderRightActions = (progress, dragX, habit) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={{ width: 80, flexDirection: 'row' }}>
        <TouchableOpacity
          onPress={() => onHabitEdit(habit)}
          style={[styles.swipeActionBtn, { backgroundColor: colors.accent1 }]}
        >
          <Animated.Text style={{ fontSize: 20, color: '#020617', transform: [{ scale }] }}>✎</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onHabitDelete(habit)}
          style={[styles.swipeActionBtn, { backgroundColor: colors.danger1 }]}
        >
          <Animated.Text style={{ fontSize: 20, color: '#020617', transform: [{ scale }] }}>🗑️</Animated.Text>
        </TouchableOpacity>
      </View>
    );
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.tableContainer, { borderColor: colors.accentBorder }]}>
        
        {/* LEFT COLUMN (Fixed) */}
        <View style={[styles.fixedColumnContainer, { borderRightColor: colors.accentBorder, backgroundColor: colors.surface }]}>
          <View style={[styles.fixedHeaderCell, { height: ROW_HEIGHT, borderBottomColor: colors.accentBorder }]}>
             <Text style={[styles.headerText, { color: colors.accent1 }]}>ЗАДАЧА</Text>
          </View>
          {habits.map((habit, index) => (
             <Swipeable
                key={habit.id}
                renderRightActions={(p, d) => renderRightActions(p, d, habit)}
                containerStyle={{ height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }}
             >
                <View style={[styles.fixedRowCell, { height: ROW_HEIGHT, backgroundColor: colors.surface }]}>
                   <Text style={[styles.habitName, { color: colors.textMain }]} numberOfLines={2}>{habit.name}</Text>
                </View>
             </Swipeable>
          ))}
        </View>

        {/* MIDDLE (Scrollable) */}
        <ScrollView horizontal ref={horizontalScrollRef} showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }}>
          <View>
             <View style={[styles.row, { height: ROW_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.accentBorder }]}>
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={styles.headerText}>ЕД.</Text></View>
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={styles.headerText}>ПЛАН</Text></View>
                {days.map(day => {
                    const dColor = (isHoliday(year, month, day) || isWeekend(year, month, day)) ? colors.danger1 : colors.textMain;
                    return (
                       <View key={day} style={[styles.dayColumn, { borderRightColor: colors.borderSubtle }]}>
                          <Text style={[styles.dayNumber, { color: dColor }]}>{day}</Text>
                          <Text style={[styles.dayName, { color: colors.textMain }]}>{getDayOfWeek(year, month, day)}</Text>
                       </View>
                    );
                })}
             </View>
             {habits.map((habit, index) => (
                <View key={habit.id} style={[styles.row, { height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }]}>
                   <View style={[styles.dataCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.cellText, { color: colors.textMain }]}>{habit.unit}</Text></View>
                   <View style={[styles.dataCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.cellText, { color: colors.textMain }]}>{habit.plan}</Text></View>
                   {days.map(day => renderCell(habit, day))}
                </View>
             ))}
          </View>
        </ScrollView>

        {/* RIGHT COLUMN (Fixed) */}
        <View style={[styles.fixedRightColumn, { borderLeftColor: colors.accentBorder, backgroundColor: colors.surface }]}>
           <View style={[styles.fixedHeaderCell, { height: ROW_HEIGHT, borderBottomColor: colors.accentBorder }]}>
              <Text style={[styles.headerText, { color: colors.textMain }]}>ИТОГ</Text>
           </View>
           {habits.map((habit, index) => {
              const stats = calculateStats(habit);
              return (
                 <TouchableOpacity 
                   key={habit.id} 
                   style={[styles.fixedRightRow, { height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }]}
                   onPress={() => setAverageMode(p => ({ ...p, [habit.id]: !p[habit.id] }))} // Toggle AVG/SUM
                 >
                    <View style={{ width: 45, alignItems: 'center', justifyContent: 'center' }}>
                       <Text style={[styles.totalText, { color: colors.textMain, fontSize: 10 }]}>{stats.total}</Text>
                    </View>
                    <View style={{ width: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHover }}>
                       <Text style={[styles.percentText, { 
                          color: stats.percent >= 80 ? colors.accent1 : stats.percent >= 50 ? colors.accent2 : colors.textMuted,
                          fontSize: 10
                       }]}>{stats.percent}%</Text>
                    </View>
                 </TouchableOpacity>
              );
           })}
        </View>

      </View>

      {/* INPUT MODAL (Same as before) */}
      <Modal visible={showInputModal} onClose={() => { setShowInputModal(false); setEditingCell(null); setInputValue(''); }} title="Значение">
        {editingCell && (
          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: colors.textMain }]}>День {editingCell.day}</Text>
            {editingCell.cellType === 'time' && (
              <View style={{ marginBottom: 16 }}>
                 <Text style={[styles.timerDisplay, { color: colors.accent1 }]}>{Math.floor(timerSeconds/3600)}:{String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0')}:{String(timerSeconds%60).padStart(2,'0')}</Text>
                 <Button title={timerRunning ? "Стоп" : "Старт"} onPress={() => { if(timerRunning){ clearInterval(timerIntervalRef.current); setTimerRunning(false); setInputValue((timerSeconds/3600).toFixed(2)); } else { setTimerRunning(true); timerIntervalRef.current=setInterval(()=>setTimerSeconds(p=>p+1),1000); } }} />
              </View>
            )}
            <Input value={inputValue} onChangeText={setInputValue} keyboardType="numeric" placeholder="Число" />
            <View style={styles.modalButtons}>
               <Button title="Очистить" variant="outline" onPress={() => { onCellChange(editingCell.habitId, year, month, editingCell.day, 0); setShowInputModal(false); }} style={{ flex: 1 }} />
               <Button title="Ок" onPress={() => { onCellChange(editingCell.habitId, year, month, editingCell.day, parseFloat(inputValue)||0); setShowInputModal(false); }} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  tableContainer: { flexDirection: 'row', borderWidth: 2, borderRadius: 12, overflow: 'hidden', backgroundColor: 'transparent' },
  
  // Columns
  fixedColumnContainer: { width: 100, zIndex: 10, elevation: 2, borderRightWidth: 2 },
  fixedRightColumn: { flexDirection: 'column', width: 80, zIndex: 10, elevation: 2, borderLeftWidth: 2 },
  
  // Rows & Cells
  fixedHeaderCell: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderBottomWidth: 2 },
  fixedRowCell: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  fixedRightRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  columnCell: { width: 45, justifyContent: 'center', alignItems: 'center' },
  dayColumn: { width: 36, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1 },
  dataCell: { width: 45, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1 },
  dayCell: { width: 36, height: '100%', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1 },
  
  // Text
  habitName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  headerText: { fontSize: 9, fontWeight: '700' },
  dayNumber: { fontSize: 10, fontWeight: '700' },
  dayName: { fontSize: 7, fontWeight: '500' },
  cellText: { fontSize: 10, fontWeight: '600' },
  totalText: { fontWeight: '700' },
  percentText: { fontWeight: '800' },

  swipeActionBtn: { width: 40, height: '100%', justifyContent: 'center', alignItems: 'center' },
  modalContent: { padding: 20 },
  modalSubtitle: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  timerDisplay: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
});

export default HabitTable;

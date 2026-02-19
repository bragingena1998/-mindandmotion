// src/components/HabitTable.js
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Animated, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ROW_HEIGHT = 50;
const DAY_CELL_WIDTH = 40;
const FIXED_LEFT_WIDTH = 110;
const FIXED_RIGHT_WIDTH = 80;

const HOLIDAYS_2026 = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  2: [23],
  3: [8],
  5: [1, 9],
  6: [12],
  11: [4],
};

const HabitTable = ({ habits, year, month, records, onCellChange, onHabitDelete, onHabitEdit }) => {
  const { colors } = useTheme();
  const horizontalScrollRef = useRef(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [averageMode, setAverageMode] = useState({});
  const [scrollWidth, setScrollWidth] = useState(0);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();
  const isCurrentMonth = month === (new Date().getMonth() + 1) && year === new Date().getFullYear();

  // Логика автоскролла
  useEffect(() => {
    if (isCurrentMonth && horizontalScrollRef.current && scrollWidth > 0) {
      const todayCenter = (today - 1) * DAY_CELL_WIDTH + (DAY_CELL_WIDTH / 2);
      const visibleCenter = scrollWidth / 2;
      const scrollX = Math.max(0, todayCenter - visibleCenter);
      
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 500);
    }
  }, [month, year, isCurrentMonth, habits.length, scrollWidth]);

  const getDayOfWeek = (year, month, day) => {
    const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return DAYS_SHORT[new Date(year, month - 1, day).getDay()];
  };

  const isWeekend = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    const d = date.getDay();
    return d === 0 || d === 6;
  };

  const isHoliday = (year, month, day) => {
    if (year !== 2026) return false;
    return HOLIDAYS_2026[month]?.includes(day) || false;
  };

  const isDayActive = (habit, day) => {
    const date = new Date(year, month - 1, day);
    if (habit.start_date) {
       const start = new Date(habit.start_date);
       start.setHours(0,0,0,0);
       if (date < start) return false;
    }
    if (habit.end_date) {
       const end = new Date(habit.end_date);
       end.setHours(23,59,59,999);
       if (date > end) return false;
    }
    if (habit.days_of_week && habit.days_of_week.length > 0) {
       if (!habit.days_of_week.includes(date.getDay())) return false;
    }
    return true;
  };

  const getValue = (habitId, day) => {
    if (!records) return 0;
    const record = records.find((r) => r.habitid === habitId && r.day === day);
    if (!record) return 0;
    return (record.value === '✓' || record.value === 'v') ? 1 : (parseFloat(record.value) || 0);
  };

  const calculateStats = (habit) => {
    const habitRecords = records ? records.filter((r) => r.habitid === habit.id) : [];
    let currentTotal = 0;
    let daysWithData = 0;
    let activeDaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
       if (isDayActive(habit, d)) activeDaysCount++;
    }

    habitRecords.forEach(r => {
      const val = (r.value === '✓' || r.value === 'v') ? 1 : (parseFloat(r.value) || 0);
      if (val > 0) {
        currentTotal += val;
        daysWithData++;
      }
    });

    let percent = 0;
    if (habit.target_type === 'daily') {
       const totalGoal = (habit.plan || 1) * activeDaysCount;
       percent = totalGoal > 0 ? Math.min(100, Math.round((currentTotal / totalGoal) * 100)) : 0;
    } else {
       percent = (habit.plan > 0) ? Math.min(100, Math.round((currentTotal / habit.plan) * 100)) : 0;
    }

    let displayTotal = '';
    if (averageMode[habit.id]) {
       const divisor = daysWithData > 0 ? daysWithData : 1;
       displayTotal = (currentTotal / divisor).toFixed(1);
    } else {
       displayTotal = habit.unit === 'Дни' ? currentTotal : Math.round(currentTotal);
    }

    return { total: displayTotal, percent };
  };

  const renderCell = (habit, day) => {
    const active = isDayActive(habit, day);
    const value = getValue(habit.id, day);
    const isToday = isCurrentMonth && day === today;
    const isWknd = isWeekend(year, month, day);
    const isHol = isHoliday(year, month, day);

    // НЕАКТИВНЫЙ ДЕНЬ: Явный крестик и затемнение
    if (!active) {
      return (
        <View key={`${habit.id}-${day}`} style={[styles.dayCell, { backgroundColor: '#1e293b', borderRightWidth: 1, borderColor: colors.borderSubtle }]}>
          <Text style={{color: colors.textMuted, fontSize: 10, opacity: 0.3}}>✕</Text>
        </View>
      );
    }

    // Обычный день: Прозрачный фон или подсветка выходного
    let cellBg = 'transparent';
    if (isHol) cellBg = 'rgba(251, 191, 36, 0.1)'; // Holiday tint
    else if (isWknd) cellBg = 'rgba(244, 63, 94, 0.05)'; // Weekend tint

    return (
      <TouchableOpacity
        key={`${habit.id}-${day}`}
        style={[
            styles.dayCell, 
            { backgroundColor: cellBg, borderRightWidth: 1, borderColor: colors.borderSubtle },
            isToday && { borderColor: colors.accent1, borderWidth: 2 } // Today border override
        ]}
        onPress={() => onCellChange(habit.id, year, month, day, value ? 0 : (habit.unit === 'Дни' ? 1 : (habit.plan || 1)))}
        onLongPress={() => {
          setEditingCell({ habitId: habit.id, day });
          setInputValue(value ? String(value) : '');
          setShowInputModal(true);
        }}
      >
        <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 11 }}>
            {value > 0 ? (habit.unit === 'Дни' ? '✓' : value) : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.tableContainer, { borderColor: colors.accent1, borderWidth: 2 }]}>
      {/* LEFT FIXED COLUMN */}
      <View style={[styles.fixedLeft, { backgroundColor: colors.surface, borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
        <View style={[styles.headerCell, { height: ROW_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.accentBorder }]}>
            <Text style={[styles.headerText, { color: colors.accent1 }]}>ЗАДАЧА</Text>
        </View>
        {habits.map((h, i) => (
          <Swipeable key={h.id} renderRightActions={(pr, dr) => (
            <View style={{ flexDirection: 'row', width: 80 }}>
              <TouchableOpacity onPress={() => onHabitEdit(h)} style={[styles.swipeBtn, { backgroundColor: colors.accent1 }]}><Text>✎</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => onHabitDelete(h)} style={[styles.swipeBtn, { backgroundColor: colors.danger1 }]}><Text>🗑️</Text></TouchableOpacity>
            </View>
          )}>
            <View style={[styles.rowCell, { height: ROW_HEIGHT, borderTopWidth: i > 0 ? 1 : 0, borderColor: colors.borderSubtle }]}>
              <Text style={{ fontSize: 12, marginRight: 6 }}>{h.target_type === 'daily' ? '⏳' : '📅'}</Text>
              <Text style={[styles.habitName, { color: colors.textMain }]} numberOfLines={2}>{h.name}</Text>
            </View>
          </Swipeable>
        ))}
      </View>

      {/* CENTER SCROLLABLE */}
      <View 
        style={{ flex: 1 }} 
        onLayout={(e) => setScrollWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView 
            horizontal 
            ref={horizontalScrollRef} 
            showsHorizontalScrollIndicator={false}
        >
          <View>
            <View style={[styles.row, { height: ROW_HEIGHT, borderBottomWidth: 2, borderColor: colors.accentBorder }]}>
              <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.headerText, { color: colors.textMain }]}>ЕД.</Text></View>
              <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.headerText, { color: colors.textMain }]}>ПЛАН</Text></View>
              {days.map(d => {
                  const isWknd = isWeekend(year, month, d);
                  const isHol = isHoliday(year, month, d);
                  return (
                    <View key={d} style={[styles.dayHeader, { borderRightWidth: 1, borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.dayNum, { color: (isWknd || isHol) ? colors.danger1 : colors.textMain }]}>{d}</Text>
                        <Text style={[styles.dayName, { color: colors.textMuted }]}>{getDayOfWeek(year, month, d)}</Text>
                    </View>
                  );
              })}
            </View>
            {habits.map((h, index) => (
              <View key={h.id} style={[styles.row, { height: ROW_HEIGHT, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }]}>
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.cellText, { color: colors.textMain }]}>{h.unit}</Text></View>
                <View style={[styles.columnCell, { borderRightWidth: 2, borderRightColor: colors.accentBorder }]}><Text style={[styles.cellText, { color: colors.textMain }]}>{h.plan}</Text></View>
                {days.map(d => renderCell(h, d))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* RIGHT FIXED COLUMN */}
      <View style={[styles.fixedRight, { backgroundColor: colors.surface, borderLeftWidth: 2, borderLeftColor: colors.accentBorder }]}>
        <View style={[styles.headerCell, { height: ROW_HEIGHT, borderBottomWidth: 2, borderBottomColor: colors.accentBorder }]}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>ИТОГ</Text>
        </View>
        {habits.map((h, i) => {
          const s = calculateStats(h);
          return (
            <TouchableOpacity key={h.id} onPress={() => setAverageMode(p => ({...p, [h.id]: !p[h.id]}))} style={[styles.row, { height: ROW_HEIGHT, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.borderSubtle }]}>
              <View style={styles.statCell}><Text style={[styles.statText, { color: colors.textMain }]}>{s.total}</Text></View>
              <View style={[styles.statCell, { backgroundColor: colors.surfaceHover }]}><Text style={[styles.statText, { color: colors.accent1 }]}>{s.percent}%</Text></View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showInputModal} onClose={() => setShowInputModal(false)} title="Значение">
        {editingCell && (
          <View style={{ padding: 20 }}>
            <Input value={inputValue} onChangeText={setInputValue} keyboardType="numeric" autoFocus />
            <Button title="Ок" onPress={() => { onCellChange(editingCell.habitId, year, month, editingCell.day, parseFloat(inputValue)||0); setShowInputModal(false); }} />
          </View>
        )}
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  tableContainer: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: '#020617' },
  fixedLeft: { width: FIXED_LEFT_WIDTH, zIndex: 10 },
  fixedRight: { width: FIXED_RIGHT_WIDTH, zIndex: 10 },
  headerCell: { justifyContent: 'center', alignItems: 'center' },
  rowCell: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  columnCell: { width: 45, alignItems: 'center', justifyContent: 'center' },
  dayHeader: { width: DAY_CELL_WIDTH, alignItems: 'center', justifyContent: 'center' },
  dayCell: { width: DAY_CELL_WIDTH, height: '100%', alignItems: 'center', justifyContent: 'center' },
  statCell: { width: '50%', alignItems: 'center', justifyContent: 'center' },
  habitName: { fontSize: 11, fontWeight: '600', flex: 1 },
  headerText: { fontSize: 10, fontWeight: '800' },
  dayNum: { fontSize: 11, fontWeight: '700' },
  dayName: { fontSize: 8, fontWeight: '500' },
  cellText: { fontSize: 10, fontWeight: '600' },
  statText: { fontSize: 10, fontWeight: '700' },
  swipeBtn: { width: 40, height: '100%', justifyContent: 'center', alignItems: 'center' },
});

export default HabitTable;

// src/components/HabitTable.js
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const HabitTable = ({ habits, year, month, records, onCellChange }) => {
  const { colors } = useTheme();
  const scrollViewRef = useRef(null);
    const [showInputModal, setShowInputModal] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { habitId, day, currentValue, cellType }
  const [inputValue, setInputValue] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef(null);


  // ЗАЩИТА: если records ещё не загружены
  if (!records || records.length === 0) {
    console.log('⏳ Ожидание загрузки records...');
  }
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

const getValue = (habitId, day) => {
  const record = records.find((r) => r.habitid === habitId && r.day === day);
  if (!record) return 0;
  
  // Если пришла галочка "✓" с сайта — считаем её как 1
  if (record.value === '✓' || record.value === 'v' || record.value === '√') {
    return 1;
  }
  
  return parseFloat(record.value) || 0;
};



  const getCellType = (unit) => {
  const unitLower = unit.toLowerCase();
  if (unitLower.includes('час')) return 'time';
  if (unitLower.includes('кол-во') || unitLower.includes('раз')) return 'count';
  if (unitLower.includes('дн') || unitLower.includes('дни')) return 'check';
  return 'count'; // по умолчанию счётчик
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
  const habitRecords = records.filter((r) => r.habitid === habitId);
  const habit = habits.find((h) => h.id === habitId);
  const cellType = getCellType(habit.unit);
  
  console.log(`📊 Подсчёт для привычки "${habit.name}":`, {
    cellType,
    recordsCount: habitRecords.length,
    records: habitRecords,
    plan: habit.plan,
    daysInMonth
  });
  
  if (cellType === 'check') {
    // ГАЛОЧКИ: считаем количество дней с отметкой
    const completedDays = habitRecords.filter(r => {
      const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
      return val > 0;
    }).length;
    const plan = habit.plan;
    const percent = plan > 0 ? Math.min(100, Math.round((completedDays / plan) * 100)) : 0;
    
    console.log(`  ✓ Галочки: ${completedDays} дней, план ${plan}, процент ${percent}%`);
    return { total: completedDays, percent };
    
  } else if (cellType === 'time') {
  const totalHours = habitRecords.reduce((sum, r) => {
    const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
    return sum + val;
  }, 0);
  const plan = habit.plan; // ← ПЛАН НА МЕСЯЦ!
  const percent = plan > 0 ? Math.min(100, Math.round((totalHours / plan) * 100)) : 0;
  const displayTotal = totalHours >= 1 ? `${Math.floor(totalHours)}ч` : `${totalHours.toFixed(1)}ч`;
  
  console.log(`  ⏰ Часы: ${totalHours}ч, план ${plan}, процент ${percent}%`);
  return { total: displayTotal, percent };
} else {
  const totalCount = habitRecords.reduce((sum, r) => {
    const val = r.value === '✓' || r.value === 'v' || r.value === '√' ? 1 : parseFloat(r.value) || 0;
    return sum + val;
  }, 0);
  const plan = habit.plan; // ← ПЛАН НА МЕСЯЦ!
  const percent = plan > 0 ? Math.min(100, Math.round((totalCount / plan) * 100)) : 0;
  
  console.log(`  🔢 Счётчик: ${totalCount}, план ${plan}, процент ${percent}%`);
  return { total: Math.round(totalCount), percent };
}

};




  const renderCell = (habit, day) => {
  const value = getValue(habit.id, day);
  // Временный лог (потом удали)
if (habit.id === habits[0]?.id && day === 9) {
  console.log('🔍 renderCell debug:', {
    habitId: habit.id,
    habitName: habit.name,
    day,
    value,
    valueType: typeof value,
    cellType: getCellType(habit.unit),
    rawRecord: records.find(r => r.habitid === habit.id && r.day === day)
  });
}
  const cellType = getCellType(habit.unit);
  const isToday = isCurrentMonth && day === today;

  let cellContent = '';
  let showValue = false;

  if (value > 0) {  // ← ВАЖНО: проверка > 0, а не && value
    if (cellType === 'check') {
      cellContent = '✓';
      showValue = true;
    } else if (cellType === 'time') {
      if (value >= 1) {
        cellContent = `${Math.floor(value)}ч`;
      } else {
        cellContent = `${value}ч`;
      }
      showValue = true;
    } else {
      cellContent = Math.round(value);
      showValue = true;
    }
  }

  return (
        <TouchableOpacity
      key={`${habit.id}-${day}`}
      style={[
        styles.cell,
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        isToday && { backgroundColor: colors.accent2 + '30' },
        showValue && { backgroundColor: colors.accent1 + '40' },
      ]}
      onPress={() => handleCellClick(habit.id, day)}
      onLongPress={() => {
        setEditingCell({ habitId: habit.id, day, currentValue: value, cellType });
        setInputValue(value > 0 ? String(value) : '');
        setShowInputModal(true);
      }}
    >

      <Text style={[styles.cellText, { color: colors.textMain }]}>
        {cellContent}
      </Text>
    </TouchableOpacity>
  );
};




  return (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      {/* HEADER */}
      <View style={styles.tableHeader}>
        {/* Fixed Left */}
        <View style={[styles.fixedLeft, { backgroundColor: colors.surface }]}>
          <View style={styles.headerCell}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>Задача</Text>
          </View>
          <View style={styles.headerCellSmall}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>Ед.</Text>
          </View>
          <View style={styles.headerCellSmall}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>План</Text>
          </View>
        </View>

        {/* Scrollable Days */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollableDays}
        >
          {days.map((day) => (
            <View
              key={day}
              style={[
                styles.dayCell,
                { borderColor: colors.borderSubtle },
                isCurrentMonth && day === today && { backgroundColor: colors.accent2 + '30' },
              ]}
            >
              <Text style={[styles.dayText, { color: colors.textMain }]}>{day}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Fixed Right */}
        <View style={[styles.fixedRight, { backgroundColor: colors.surface }]}>
          <View style={styles.headerCellSmall}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>Итог</Text>
          </View>
          <View style={styles.headerCellSmall}>
            <Text style={[styles.headerText, { color: colors.textMain }]}>%</Text>
          </View>
        </View>
      </View>

      {/* BODY */}
      <ScrollView style={styles.tableBody}>
        {habits.map((habit) => {
          const stats = calculateStats(habit.id);
          return (
            <View key={habit.id} style={[styles.tableRow, { borderBottomColor: colors.borderSubtle }]}>
              {/* Fixed Left */}
              <View style={[styles.fixedLeft, { backgroundColor: colors.surface }]}>
                <View style={styles.bodyCell}>
                  <Text style={[styles.habitName, { color: colors.textMain }]} numberOfLines={2}>
                    {habit.name}
                  </Text>
                </View>
                <View style={styles.bodyCellSmall}>
                  <Text style={[styles.habitUnit, { color: colors.textMain }]}>{habit.unit}</Text>
                </View>
                <View style={styles.bodyCellSmall}>
                  <Text style={[styles.habitPlan, { color: colors.textMain }]}>{habit.plan}</Text>
                </View>
              </View>

              {/* Scrollable Cells */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                style={styles.scrollableDays}
              >
                {days.map((day) => renderCell(habit, day))}
              </ScrollView>

              {/* Fixed Right */}
              <View style={[styles.fixedRight, { backgroundColor: colors.surface }]}>
                <View style={styles.bodyCellSmall}>
                  <Text style={[styles.statText, { color: colors.textMain }]}>{stats.total}</Text>
                </View>
                <View style={styles.bodyCellSmall}>
                  <Text
                    style={[
                      styles.statText,
                      {
                        color:
                          stats.percent >= 80
                            ? colors.accent1
                            : stats.percent >= 50
                            ? colors.accent2
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {stats.percent}%
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
            </ScrollView>

      {/* МОДАЛКА РУЧНОГО ВВОДА */}
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
          <View>
            <Text style={{ color: colors.textMain, marginBottom: 8 }}>
              День {editingCell.day}
            </Text>

            {editingCell.cellType === 'time' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                  Таймер: {Math.floor(timerSeconds / 3600)}:{String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}
                </Text>
                <Button
                  title={timerRunning ? "Остановить таймер" : "Запустить таймер"}
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

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button
                title="Очистить"
                onPress={() => {
                  onCellChange(editingCell.habitId, year, month, editingCell.day, 0);
                  setShowInputModal(false);
                  setEditingCell(null);
                  setInputValue('');
                }}
              />
              <Button
                title="Сохранить"
                onPress={() => {
                  const value = parseFloat(inputValue) || 0;
                  onCellChange(editingCell.habitId, year, month, editingCell.day, value);
                  setShowInputModal(false);
                  setEditingCell(null);
                  setInputValue('');
                  if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    setTimerRunning(false);
                    setTimerSeconds(0);
                  }
                }}
              />
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderColor: '#555',
  },
  fixedLeft: {
    width: 200,
    flexDirection: 'row',
    borderRightWidth: 2,
    borderColor: '#555',
  },
  headerCell: {
    flex: 2,
    padding: 8,
    justifyContent: 'center',
  },
  headerCellSmall: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scrollableDays: {
    flex: 1,
    flexDirection: 'row',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fixedRight: {
    width: 100,
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderColor: '#555',
  },
  tableBody: {
    maxHeight: 500,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  bodyCell: {
    flex: 2,
    padding: 8,
    justifyContent: 'center',
  },
  bodyCellSmall: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitName: {
    fontSize: 13,
    fontWeight: '500',
  },
  habitUnit: {
    fontSize: 11,
  },
  habitPlan: {
    fontSize: 12,
    fontWeight: '600',
  },
  cell: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  }
});

export default HabitTable;

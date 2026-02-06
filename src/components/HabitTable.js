// src/components/HabitTable.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const HabitTable = ({ habits, year, month, records, onCellChange, onHabitEdit, onHabitDelete }) => {
  const { colors } = useTheme();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  // Получить значение ячейки
  const getCellValue = (habitId, day) => {
    const record = records.find(
      (r) => r.habit_id === habitId && r.day === day
    );
    return record ? record.value : null;
  };

  // Определить тип ячейки по unit
  const getCellType = (unit) => {
    const unitLower = unit.toLowerCase();
    if (unitLower.includes('час')) return 'time';
    if (unitLower.includes('кол-во') || unitLower.includes('раз')) return 'count';
    return 'check';
  };

  // Обработчик клика по ячейке
  const handleCellClick = (habit, day, currentValue) => {
    const type = getCellType(habit.unit);
    let newValue = null;

    if (type === 'check') {
      newValue = currentValue === '✓' ? null : '✓';
    } else if (type === 'count') {
      const num = parseInt(currentValue) || 0;
      newValue = String(num + 1);
    } else if (type === 'time') {
      const num = parseFloat(currentValue) || 0;
      newValue = String((num + 1).toFixed(1));
    }

    onCellChange(habit.id, year, month, day, newValue);
  };

  // Обработчик долгого нажатия (уменьшение)
  const handleCellLongPress = (habit, day, currentValue) => {
    const type = getCellType(habit.unit);
    let newValue = null;

    if (type === 'check') {
      newValue = null;
    } else if (type === 'count') {
      const num = parseInt(currentValue) || 0;
      newValue = num > 0 ? String(num - 1) : null;
    } else if (type === 'time') {
      const num = parseFloat(currentValue) || 0;
      newValue = num > 0 ? String((num - 1).toFixed(1)) : null;
    }

    onCellChange(habit.id, year, month, day, newValue);
  };

  // Подсчёт прогресса
  const calculateProgress = (habit) => {
    let sum = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const value = getCellValue(habit.id, day);
      if (value === '✓') sum += 1;
      else if (value && value !== '0') sum += parseFloat(value) || 0;
    }

    const percent = habit.plan > 0 ? Math.min(100, Math.round((sum / habit.plan) * 100)) : 0;
    return { sum: sum.toFixed(1), percent };
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* ЗАГОЛОВОК */}
          <View style={[styles.headerRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.headerCell, styles.nameColumn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>Привычка</Text>
            </View>
            <View style={[styles.headerCell, styles.unitColumn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>Ед.</Text>
            </View>
            <View style={[styles.headerCell, styles.planColumn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>План</Text>
            </View>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <View
                key={day}
                style={[
                  styles.headerCell,
                  styles.dayColumn,
                  { borderColor: colors.borderSubtle },
                  isCurrentMonth && today.getDate() === day && { backgroundColor: colors.accent1 + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    { color: isCurrentMonth && today.getDate() === day ? colors.accent1 : colors.textSecondary },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
            <View style={[styles.headerCell, styles.resultColumn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>Итог</Text>
            </View>
            <View style={[styles.headerCell, styles.percentColumn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>%</Text>
            </View>
          </View>

          {/* СТРОКИ ПРИВЫЧЕК */}
          {habits.map((habit) => {
            const progress = calculateProgress(habit);
            const cellType = getCellType(habit.unit);

            return (
              <View
                key={habit.id}
                style={[styles.habitRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              >
                {/* Название */}
                <TouchableOpacity
                  style={[styles.cell, styles.nameColumn, { borderColor: colors.borderSubtle }]}
                  onPress={() => onHabitEdit(habit)}
                >
                  <Text style={[styles.cellText, { color: colors.textMain }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                </TouchableOpacity>

                {/* Единица */}
                <View style={[styles.cell, styles.unitColumn, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.cellText, { color: colors.textMuted }]} numberOfLines={1}>
                    {habit.unit}
                  </Text>
                </View>

                {/* План */}
                <View style={[styles.cell, styles.planColumn, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.cellText, { color: colors.textMuted }]}>{habit.plan}</Text>
                </View>

                {/* Дни */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const value = getCellValue(habit.id, day);
                  const isFilled = value && value !== '0';

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.cell,
                        styles.dayColumn,
                        { borderColor: colors.borderSubtle },
                        isFilled && { backgroundColor: colors.accent1 + '10' },
                      ]}
                      onPress={() => handleCellClick(habit, day, value)}
                      onLongPress={() => handleCellLongPress(habit, day, value)}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          { color: isFilled ? colors.accent1 : colors.textMuted },
                          cellType === 'check' && { fontSize: 16 },
                        ]}
                      >
                        {value || ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Итог */}
                <View style={[styles.cell, styles.resultColumn, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.cellText, { color: colors.textMain }]}>{progress.sum}</Text>
                </View>

                {/* Процент */}
                <View style={[styles.cell, styles.percentColumn, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.cellText, { color: colors.accent1 }]}>{progress.percent}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  habitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerCell: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  cell: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    minHeight: 40,
  },
  nameColumn: {
    width: 120,
  },
  unitColumn: {
    width: 60,
  },
  planColumn: {
    width: 50,
  },
  dayColumn: {
    width: 40,
  },
  resultColumn: {
    width: 60,
  },
  percentColumn: {
    width: 60,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 13,
  },
});

export default HabitTable;


// src/components/HabitTable.js
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';



const HOLIDAYS_2026 = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  2: [23],
  3: [8],
  5: [1, 9],
  6: [12],
  11: [4],
};

const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const HabitTable = ({ habits, year, month, records, onCellChange, onHabitDelete, onHabitUpdate }) => {
  const { colors } = useTheme();
  const headerScrollRef = useRef(null);
  const rowScrollRefs = useRef({});
  const bottomScrollRef = useRef(null);
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



  if (!records || records.length === 0) {
    console.log('⏳ Ожидание загрузки records...');
  }
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  // СИНХРОНИЗАЦИЯ СКРОЛЛА
  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTo({ x: scrollX, animated: false });
    }
    
    Object.values(rowScrollRefs.current).forEach(ref => {
      if (ref) {
        ref.scrollTo({ x: scrollX, animated: false });
      }
    });

    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollTo({ x: scrollX, animated: false });
    }
  };

  // АВТОСКРОЛЛ на сегодняшний день
  const scrollToToday = () => {
    if (isCurrentMonth && headerScrollRef.current) {
      const scrollX = Math.max(0, (today - 3) * 36); // Чуть сместил (today - 3), чтобы день был не у самого края
      
      // Пробуем скроллить с небольшой задержкой для надежности
      setTimeout(() => {
        headerScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 100);
    }
  };

  // Вызываем при смене месяца или загрузке данных
  useEffect(() => {
    scrollToToday();
  }, [month, year, isCurrentMonth, today, records]); // Добавил records в зависимости


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
    const record = records.find((r) => r.habitid === habitId && r.day === day);
    if (!record) return 0;
    
    if (record.value === '✓' || record.value === 'v' || record.value === '√') {
      return 1;
    }
    
    return parseFloat(record.value) || 0;
  };

  const getCellType = (unit) => {
    // 🛡️ ЗАЩИТА: Если unit пустой или null, считаем что это 'count'
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
    const habitRecords = records.filter((r) => r.habitid === habitId);
    const habit = habits.find((h) => h.id === habitId);
    
    // 🛡️ ЗАЩИТА: Если привычка не найдена (например, удалена, но records остались), не падаем
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
        if (value >= 1) {
          cellContent = `${Math.floor(value)}ч`;
        } else {
          cellContent = `${value.toFixed(1)}ч`;
        }
        showValue = true;
      } else {
        cellContent = Math.round(value);
        showValue = true;
      }
    }

    // БОГАТЫЕ ГРАДИЕНТЫ
    let gradientColors = [colors.surface, colors.surface];
    if (showValue) {
      gradientColors = [colors.accent1 + 'A0', colors.accent1 + '60', colors.accent1 + '30'];
    } else if (isToday) {
      gradientColors = [colors.accent2 + '80', colors.accent2 + '50', colors.accent2 + '20'];
    } else if (isHolidayDay) {
      // Золотой градиент для праздников
      gradientColors = ['rgba(251, 191, 36, 0.5)', 'rgba(245, 158, 11, 0.35)', 'rgba(217, 119, 6, 0.2)'];
    } else if (isWeekendDay) {
      // Нежный розово-красный градиент для выходных
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
            isToday && { borderColor: colors.accent2, borderWidth: 2 }
          ]}
        >
          <Text style={[styles.cellText, { color: colors.textMain }]}>
            {cellContent}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };


  const handleDeleteHabit = (habit) => {
    Alert.alert(
      'Удалить привычку?',
      `Вы уверены что хотите удалить "${habit.name}"?\nВсе данные будут потеряны.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Удаление привычки:', habit.id);
            if (onHabitDelete) {
              onHabitDelete(habit.id);
            } else {
              Alert.alert('Ошибка', 'Функция удаления не подключена');
            }
          },
        },
      ]
    );
  };

  const contentWidth = 45 + 45 + (daysInMonth * 36) + 45;

  return (
    <View style={styles.container}>
      {/* ТАБЛИЦА */}
      <View style={[styles.tableWrapper, { borderColor: colors.accentBorder }]}>
        {/* HEADER */}
        <View style={[styles.tableRow, { borderBottomWidth: 2, borderBottomColor: colors.accentBorder }]}>
          {/* ФИКС: Задача */}
          <View style={[styles.fixedColumn, styles.taskColumn, { backgroundColor: colors.surface, borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}>
            <Text style={[styles.headerText, { color: colors.accent1 }]}>ЗАДАЧА</Text>
          </View>

      {/* СКРОЛЛ: Остальные столбцы */}
          <ScrollView
            ref={headerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            style={styles.scrollArea}
            onContentSizeChange={() => {
              // Когда размер контента изменился (отрисовались дни), скроллим
              if (isCurrentMonth) scrollToToday();
            }}
          >
            <View style={{ flexDirection: 'row', width: contentWidth }}>
              {/* Ед.изм */}
              <View style={[styles.columnCell, { backgroundColor: colors.surface, borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}>
                <Text style={[styles.headerText, { color: colors.textMain }]}>ЕД.</Text>
              </View>

              {/* План */}
              <View style={[styles.columnCell, { backgroundColor: colors.surface, borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}>
                <Text style={[styles.headerText, { color: colors.textMain }]}>ПЛАН</Text>
              </View>

              {/* Дни 1-31 */}
              {days.map(day => {
                const isHolidayDay = isHoliday(year, month, day);
                const isWeekendDay = isWeekend(year, month, day);
                const dayOfWeek = getDayOfWeek(year, month, day);
                const dayColor = (isHolidayDay || isWeekendDay) ? colors.danger1 : colors.textMain;
                
                return (
                  <View 
                    key={day} 
                    style={[styles.dayColumn, { backgroundColor: colors.surface, borderRightColor: colors.borderSubtle }]}
                  >
                    <Text style={[styles.dayNumber, { color: dayColor }]}>{day}</Text>
                    <Text style={[styles.dayName, { color: colors.textMain }]}>{dayOfWeek}</Text>
                  </View>
                );
              })}

              {/* Итог */}
              <View style={[styles.columnCell, { backgroundColor: colors.surface, borderRightWidth: 2, borderRightColor: colors.accentBorder, borderLeftWidth: 2, borderLeftColor: colors.accentBorder }]}>
                <Text style={[styles.headerText, { color: colors.textMain }]}>ИТОГ</Text>
              </View>
            </View>
          </ScrollView>

          {/* ФИКС: % */}
          <View style={[styles.fixedColumn, styles.percentColumn, { backgroundColor: colors.surface, borderLeftColor: colors.accentBorder, borderLeftWidth: 2 }]}>
            <Text style={[styles.headerText, { color: colors.accent1 }]}>%</Text>
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.tableBody}>
          {habits.map((habit, index) => {
            const stats = calculateStats(habit.id);

            return (
              <View 
                key={habit.id} 
                style={[
                  styles.tableRow, 
                  { borderTopColor: colors.borderSubtle, borderTopWidth: index > 0 ? 1 : 0 }
                ]}
              >
                {/* ФИКС: Название */}
               <TouchableOpacity
  style={[styles.fixedColumn, styles.taskColumn, { backgroundColor: colors.surface, borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}
  onLongPress={() => {
    setEditingHabit(habit);
    setEditHabitName(habit.name);
    setEditHabitPlan(String(habit.plan));
    setShowEditModal(true);
  }}
  delayLongPress={800}
>

                  <Text style={[styles.habitName, { color: colors.textMain }]} numberOfLines={2}>
                    {habit.name}
                  </Text>
                </TouchableOpacity>

                {/* СКРОЛЛ: Ячейки */}
                <ScrollView
                  ref={(ref) => {
                    rowScrollRefs.current[habit.id] = ref;
                  }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={handleScroll}
                  style={styles.scrollArea}
                >
                  <View style={{ flexDirection: 'row', width: contentWidth }}>
                    {/* Ед.изм */}
                    <View style={[styles.dataCell, { borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}>
                      <Text style={[styles.cellText, { color: colors.textMain }]}>{habit.unit}</Text>
                    </View>

                    {/* План */}
                    <View style={[styles.dataCell, { borderRightColor: colors.accentBorder, borderRightWidth: 2 }]}>
                      <Text style={[styles.cellText, { color: colors.textMain }]}>{habit.plan}</Text>
                    </View>

                    {/* Дни */}
                    {days.map((day) => renderCell(habit, day))}

                    {/* Итог */}
                    <View style={[styles.dataCell, { borderLeftWidth: 2, borderLeftColor: colors.accentBorder, borderRightWidth: 2, borderRightColor: colors.accentBorder }]}>
                      <Text style={[styles.totalText, { color: colors.textMain }]}>{stats.total}</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* ФИКС: % */}
                <View style={[styles.fixedColumn, styles.percentColumn, { backgroundColor: colors.surface, borderLeftColor: colors.accentBorder, borderLeftWidth: 2 }]}>
                  <Text 
                    style={[
                      styles.percentText, 
                      { 
                        color: stats.percent >= 80 ? colors.accent1 : 
                               stats.percent >= 50 ? colors.accent2 : 
                               colors.textMuted 
                      }
                    ]}
                  >
                    {stats.percent}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* СКРОЛЛБАР ВНИЗУ */}
      <View style={[styles.scrollbarWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.fixedColumn, styles.taskColumn]} />
        <ScrollView
          ref={bottomScrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={[styles.scrollArea, Platform.OS === 'web' && styles.webScrollbar]}
        >
          <View style={{ width: contentWidth, height: 20 }} />
        </ScrollView>
        <View style={[styles.fixedColumn, styles.percentColumn]} />
      </View>

      {/* МОДАЛКА */}
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
      
{/* МОДАЛКА РЕДАКТИРОВАНИЯ ПРИВЫЧКИ */}
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
  title="🗑️"
  onPress={() => {
    // Используем нативный confirm для веба и Alert для мобилки
    if (Platform.OS === 'web') {
      if (window.confirm(`Вы уверены что хотите удалить "${editingHabit.name}"?\nВсе данные будут потеряны.`)) {
        console.log('🗑️ Удаление привычки ID:', editingHabit.id);
        if (onHabitDelete) {
          onHabitDelete(editingHabit.id);
          setShowEditModal(false);
          setEditingHabit(null);
          setShowCustomUnit(false);
        } else {
          alert('Функция удаления не подключена');
        }
      }
    } else {
      Alert.alert(
        'Удалить привычку?',
        `Вы уверены что хотите удалить "${editingHabit.name}"?\nВсе данные будут потеряны.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              console.log('🗑️ Удаление привычки ID:', editingHabit.id);
              if (onHabitDelete) {
                onHabitDelete(editingHabit.id);
                setShowEditModal(false);
                setEditingHabit(null);
                setShowCustomUnit(false);
              } else {
                Alert.alert('Ошибка', 'Функция удаления не подключена');
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
          title="✓"
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

            console.log('💾 Сохранение привычки:', {
              id: editingHabit.id,
              name: editHabitName,
              unit: editingHabit.unit,
              plan: planValue,
            });

            if (onHabitUpdate) {
              onHabitUpdate(editingHabit.id, {
                name: editHabitName,
                unit: editingHabit.unit,
                plan: planValue,
              });
              setShowEditModal(false);
              setEditingHabit(null);
              setShowCustomUnit(false);
            } else {
              Alert.alert('Ошибка', 'Функция обновления не подключена');
            }
          }}
          style={[styles.modalButton, { flex: 0.7 }]}
        />
      </View>
    </View>
  )}
</Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tableWrapper: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  fixedColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    minHeight: 38,
  },
  taskColumn: {
    width: 110,
  },
  percentColumn: {
    width: 55,
  },
  scrollArea: {
    flex: 1,
  },
  webScrollbar: {
    ...(Platform.OS === 'web' && {
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
    }),
  },
  columnCell: {
    width: 45,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayColumn: {
    width: 36,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  headerText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayName: {
    fontSize: 7,
    fontWeight: '500',
    marginTop: 1,
  },
  tableBody: {
    maxHeight: 600,
  },
  habitName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  dataCell: {
    width: 45,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCell: {
    width: 36,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  cellText: {
    fontSize: 10,
    fontWeight: '600',
  },
  totalText: {
    fontSize: 11,
    fontWeight: '700',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollbarWrapper: {
    flexDirection: 'row',
    height: 24,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 14,
    letterSpacing: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
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
});

export default HabitTable;

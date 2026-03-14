// src/components/DatePicker.js
// + кнопка сброса даты

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal as RNModal, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const DatePicker = ({ label, value, onChangeDate, allowClear }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const parseDate = (val) => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [viewYear, setViewYear] = useState(() => parseDate(value).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate(value).getMonth());

  const handleOpen = () => {
    const d = parseDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(true);
  };

  const formatDisplay = (val) => {
    if (!val) return 'Не задано';
    const d = parseDate(val);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Пн = 0
  };

  const handleSelectDay = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChangeDate(dateStr);
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const selectedDay = value ? parseDate(value).getDate() : null;
  const selectedMonth = value ? parseDate(value).getMonth() : null;
  const selectedYear = value ? parseDate(value).getFullYear() : null;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>}

      <View style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleOpen}>
          <Text style={[styles.buttonText, { color: value ? colors.textMain : colors.textMuted }]}>
            {formatDisplay(value)}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {allowClear && value && (
            <TouchableOpacity onPress={() => onChangeDate(null)}>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleOpen}>
            <Text style={{ fontSize: 20 }}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RNModal visible={isOpen} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}>

            {/* Навигация по месяцам */}
            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Text style={[styles.navArrow, { color: colors.textMain }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: colors.accentText }]}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Text style={[styles.navArrow, { color: colors.textMain }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Дни недели */}
            <View style={styles.weekRow}>
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                <Text key={d} style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
              ))}
            </View>

            {/* Дни */}
            <View style={styles.daysGrid}>
              {cells.map((day, idx) => {
                const isSelected = day && day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
                const isToday = day && (() => { const t = new Date(); return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear(); })();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colors.accent1, borderRadius: 8 },
                      isToday && !isSelected && { borderWidth: 1, borderColor: colors.accent1, borderRadius: 8 },
                    ]}
                    onPress={() => day && handleSelectDay(day)}
                    disabled={!day}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: isSelected ? '#020617' : day ? colors.textMain : 'transparent' },
                      isToday && !isSelected && { color: colors.accentText, fontWeight: 'bold' },
                    ]}>
                      {day || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => setIsOpen(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textMain }]}>ОТМЕНА</Text>
            </TouchableOpacity>

          </View>
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  button: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  buttonText: { fontSize: 15, flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: {
    width: '100%', maxWidth: 360, padding: 20, borderRadius: 20, borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, fontWeight: 'bold' },
  monthLabel: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  dayCell: { width: `${100/7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, fontWeight: '500' },
  closeBtn: { paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
});

export default DatePicker;

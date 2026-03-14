// src/components/DatePicker.js
// Нативный DateTimePicker Android + кнопка сброса
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useTheme } from '../contexts/ThemeContext';

const DatePicker = ({ label, value, onChangeDate, allowClear }) => {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  const parseDate = (val) => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatDisplay = (val) => {
    if (!val) return 'Не задано';
    const d = parseDate(val);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  };

  const handleConfirm = (date) => {
    setIsVisible(false);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      onChangeDate(`${y}-${m}-${d}`);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>}

      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsVisible(true)}>
          <Text style={[styles.valueText, { color: value ? colors.textMain : colors.textMuted }]}>
            {formatDisplay(value)}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {allowClear && value && (
            <TouchableOpacity onPress={() => onChangeDate(null)}>
              <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setIsVisible(true)}>
            <Text style={{ fontSize: 20 }}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={isVisible}
        mode="date"
        date={parseDate(value)}
        onConfirm={handleConfirm}
        onCancel={() => setIsVisible(false)}
        locale="ru_RU"
        confirmTextIOS="Готово"
        cancelTextIOS="Отмена"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  valueText: { fontSize: 15 },
});

export default DatePicker;

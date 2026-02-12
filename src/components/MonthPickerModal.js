// src/components/MonthPickerModal.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MonthPickerModal = ({ visible, onClose, selectedYear, selectedMonth, onSelect }) => {
  const { colors } = useTheme();
  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(selectedMonth); // 1-12

  const handleSave = () => {
    onSelect(year, month);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          
          <Text style={[styles.title, { color: colors.textMain }]}>Выберите период</Text>

          {/* Год */}
          <View style={styles.yearRow}>
            <TouchableOpacity onPress={() => setYear(year - 1)} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.accent1 }]}>◀</Text>
            </TouchableOpacity>
            
            <Text style={[styles.yearText, { color: colors.textMain }]}>{year}</Text>
            
            <TouchableOpacity onPress={() => setYear(year + 1)} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.accent1 }]}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Месяцы */}
          <View style={styles.monthsGrid}>
            {MONTHS.map((m, index) => {
              const monthNum = index + 1;
              const isSelected = monthNum === month;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.monthButton,
                    isSelected && { backgroundColor: colors.accent1 },
                    !isSelected && { borderColor: colors.borderSubtle, borderWidth: 1 }
                  ]}
                  onPress={() => setMonth(monthNum)}
                >
                  <Text style={[
                    styles.monthText,
                    { color: isSelected ? '#020617' : colors.textMain }
                  ]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Кнопки */}
          <View style={styles.footer}>
            <Button title="Отмена" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
            <Button title="Выбрать" onPress={handleSave} style={{ flex: 1, marginLeft: 8 }} />
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
  },
});

export default MonthPickerModal;

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import Button from './Button';

const DatePickerModal = ({ visible, onClose, onSelect, initialDate }) => {
  const { colors } = useTheme();
  
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date();
  };

  // Инициализация состояния только при открытии
  const d = parseDate(initialDate);
  const [selDay, setSelDay] = useState(d.getDate());
  const [selMonth, setSelMonth] = useState(d.getMonth() + 1);
  const [selYear, setSelYear] = useState(d.getFullYear());

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { num: 1, name: 'Янв' }, { num: 2, name: 'Фев' }, { num: 3, name: 'Мар' }, 
    { num: 4, name: 'Апр' }, { num: 5, name: 'Май' }, { num: 6, name: 'Июн' },
    { num: 7, name: 'Июл' }, { num: 8, name: 'Авг' }, { num: 9, name: 'Сен' }, 
    { num: 10, name: 'Окт' }, { num: 11, name: 'Ноя' }, { num: 12, name: 'Дек' }
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => currentYear - i);

  const handleSave = () => {
    const dayStr = String(selDay).padStart(2, '0');
    const monthStr = String(selMonth).padStart(2, '0');
    const dateStr = `${selYear}-${monthStr}-${dayStr}`;
    onSelect(dateStr);
    onClose();
  };

  const renderItem = (item, isSelected, onPress, label) => (
    <TouchableOpacity 
      style={[
        styles.item, 
        isSelected && { backgroundColor: colors.accent1 + '20', borderColor: colors.accent1 }
      ]} 
      onPress={onPress}
    >
      <Text style={[styles.itemText, { color: isSelected ? colors.accent1 : colors.textMuted }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} onClose={onClose} title="ДАТА РОЖДЕНИЯ">
      <View style={styles.pickerContainer}>
        {/* DAY */}
        <View style={styles.column}>
          <Text style={[styles.columnLabel, { color: colors.textMuted }]}>ДЕНЬ</Text>
          <FlatList
            data={days}
            keyExtractor={i => `d-${i}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            renderItem={({ item }) => renderItem(item, item === selDay, () => setSelDay(item), item)}
          />
        </View>

        {/* MONTH */}
        <View style={styles.column}>
          <Text style={[styles.columnLabel, { color: colors.textMuted }]}>МЕСЯЦ</Text>
          <FlatList
            data={months}
            keyExtractor={item => `m-${item.num}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            renderItem={({ item }) => renderItem(item, item.num === selMonth, () => setSelMonth(item.num), item.name)}
          />
        </View>

        {/* YEAR */}
        <View style={styles.column}>
          <Text style={[styles.columnLabel, { color: colors.textMuted }]}>ГОД</Text>
          <FlatList
            data={years}
            keyExtractor={i => `y-${i}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            renderItem={({ item }) => renderItem(item, item === selYear, () => setSelYear(item), item)}
          />
        </View>
      </View>
      
      <Button title="Сохранить" onPress={handleSave} style={{ marginTop: 20 }} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    flexDirection: 'row',
    height: 250,
    // Убрал gap: 8, так как он крашит старые версии React Native
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 8
  },
  column: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    marginHorizontal: 2 // Замена gap
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.7
  },
  item: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4
  },
  itemText: {
    fontSize: 16, // Чуть уменьшил шрифт для надежности
    fontWeight: '600',
  }
});

export default DatePickerModal;

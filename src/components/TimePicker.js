// src/components/TimePicker.js
// Бесконечная прокрутка (infinite loop) для часов и минут
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal as RNModal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ITEM_HEIGHT = 44;
const LOOP_MULTIPLIER = 200; // достаточно большой цикл для бесконечного ощущения

const InfiniteWheelPicker = ({ data, selectedValue, onValueChange }) => {
  const { colors } = useTheme();
  const listRef = useRef(null);
  const count = data.length;
  const loopedData = Array.from({ length: count * LOOP_MULTIPLIER }, (_, i) => data[i % count]);
  const centerBlock = Math.floor(LOOP_MULTIPLIER / 2);
  const initialIndex = data.indexOf(selectedValue);
  const initialOffset = (centerBlock * count + initialIndex) * ITEM_HEIGHT;

  useEffect(() => {
    if (listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
      }, 50);
    }
  }, []);

  const handleScrollEnd = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const realIndex = ((index % count) + count) % count;
    if (data[realIndex] !== selectedValue) {
      onValueChange(data[realIndex]);
    }
    // Тихо переходим в середину чтобы не кончились данные
    const safeOffset = (centerBlock * count + realIndex) * ITEM_HEIGHT;
    if (Math.abs(y - safeOffset) > count * ITEM_HEIGHT * 2) {
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: safeOffset, animated: false });
      }, 50);
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * 5, width: 80, overflow: 'hidden' }}>
      <View style={{
        position: 'absolute',
        top: ITEM_HEIGHT * 2,
        height: ITEM_HEIGHT,
        width: '100%',
        backgroundColor: colors.borderSubtle,
        borderRadius: 8,
        opacity: 0.4,
      }} />
      <FlatList
        ref={listRef}
        showsVerticalScrollIndicator={false}
        data={loopedData}
        keyExtractor={(_, index) => index.toString()}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item }) => {
          const isSelected = item === selectedValue;
          return (
            <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                fontSize: isSelected ? 22 : 18,
                color: isSelected ? colors.textMain : colors.textMuted,
                fontWeight: isSelected ? 'bold' : 'normal'
              }}>
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

const TimePicker = ({ label, value, onChangeTime }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const defaultHours = value ? value.split(':')[0] : '12';
  const defaultMinutes = value ? value.split(':')[1] : '00';

  const [tempHours, setTempHours] = useState(defaultHours);
  const [tempMinutes, setTempMinutes] = useState(defaultMinutes);

  const hoursData = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesData = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleOpen = () => {
    setTempHours(value ? value.split(':')[0] : '12');
    setTempMinutes(value ? value.split(':')[1] : '00');
    setIsOpen(true);
  };

  const handleSave = () => {
    onChangeTime(`${tempHours}:${tempMinutes}`);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        onPress={handleOpen}
      >
        <Text style={[styles.buttonText, { color: value ? colors.textMain : colors.textMuted }]}>
          {value ? value : 'Без времени'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {value && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); onChangeTime(null); }}>
              <Text style={styles.iconClear}>❌</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.icon}>🕒</Text>
        </View>
      </TouchableOpacity>

      <RNModal visible={isOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>

            <Text style={[styles.modalTitle, { color: colors.accentText }]}>ВЫБЕРИТЕ ВРЕМЯ</Text>

            <View style={styles.pickerContainer}>
              <InfiniteWheelPicker
                data={hoursData}
                selectedValue={tempHours}
                onValueChange={setTempHours}
              />
              <Text style={[styles.colon, { color: colors.textMain }]}>:</Text>
              <InfiniteWheelPicker
                data={minutesData}
                selectedValue={tempMinutes}
                onValueChange={setTempMinutes}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent1 }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>СОХРАНИТЬ</Text>
            </TouchableOpacity>

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
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, letterSpacing: 0.06 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  buttonText: { fontSize: 15 },
  icon: { fontSize: 20 },
  iconClear: { fontSize: 16, marginTop: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: {
    width: 300, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10
  },
  modalTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 1, marginBottom: 20 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 10 },
  saveBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#020617', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  closeBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 }
});

export default TimePicker;

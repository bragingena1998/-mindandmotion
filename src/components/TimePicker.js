// src/components/TimePicker.js
// Бесконечное колесо с правильным центрированием выделения
// Выделен центральный (3-й из 5) элемент по snap

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal as RNModal,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;  // всегда нечётное коло
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2); // = 2, т.е. 3-й сверху
const LOOP_COUNT = 100; // повторений массива в каждую сторону = бесконечность

const InfiniteWheel = ({ data, value, onChange }) => {
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const count = data.length;
  // Строим большой циклический массив
  const looped = Array.from({ length: count * LOOP_COUNT * 2 }, (_, i) => data[i % count]);
  const totalCount = looped.length;
  // Начальная позиция: половина массива + текущее значение, минус CENTER_INDEX
  const midStart = Math.floor(totalCount / 2) - Math.floor(totalCount / 2) % count;
  const valueIndex = data.indexOf(value);
  const initialScrollIndex = midStart + valueIndex - CENTER_INDEX;

  const isScrolling = useRef(false);

  const getInitialOffset = () => ({ x: 0, y: initialScrollIndex * ITEM_HEIGHT });

  const onScrollEnd = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    // Индекс верхнего видимого элемента
    const topIndex = Math.round(y / ITEM_HEIGHT);
    // Центральный = topIndex + CENTER_INDEX
    const centerAbsIndex = topIndex + CENTER_INDEX;
    const realIndex = ((centerAbsIndex % count) + count) % count;
    onChange(data[realIndex]);

    // Тихо возвращаемся в середину если дошли до края
    const safeTop = midStart + realIndex - CENTER_INDEX;
    const dist = Math.abs(topIndex - safeTop);
    if (dist > count * 5) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: safeTop * ITEM_HEIGHT, animated: false });
      }, 80);
    }
  }, [data, count, onChange, midStart]);

  return (
    <View style={{ width: 72, height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' }}>
      {/* Полосы - подсветка центрального элемента */}
      <View pointerEvents="none" style={{
        position: 'absolute',
        top: CENTER_INDEX * ITEM_HEIGHT,
        height: ITEM_HEIGHT,
        left: 0, right: 0,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.accent1,
        opacity: 0.5,
        zIndex: 10,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={getInitialOffset()}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEventThrottle={16}
      >
        {looped.map((item, idx) => {
          const topIndex = initialScrollIndex; // при рендеринге неизвестно; выделяем по value
          const isSelected = item === value;
          return (
            <View key={idx} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                fontSize: isSelected ? 24 : 18,
                fontWeight: isSelected ? '800' : '400',
                color: isSelected ? colors.textMain : colors.textMuted,
              }}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};


const TimePicker = ({ label, value, onChangeTime }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [tempHours, setTempHours] = useState('12');
  const [tempMinutes, setTempMinutes] = useState('00');

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
      {label && <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>}

      <View style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleOpen}>
          <Text style={[styles.buttonText, { color: value ? colors.textMain : colors.textMuted }]}>
            {value || 'Без времени'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {value && (
            <TouchableOpacity onPress={() => onChangeTime(null)}>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleOpen}>
            <Text style={{ fontSize: 20 }}>🕒</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RNModal visible={isOpen} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>

            <Text style={[styles.title, { color: colors.accentText }]}>ВЫБЕРИТЕ ВРЕМЯ</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>центральная строка = выбранное</Text>

            <View style={styles.pickerRow}>
              <InfiniteWheel data={hoursData} value={tempHours} onChange={setTempHours} />
              <Text style={[styles.colon, { color: colors.textMain }]}>:</Text>
              <InfiniteWheel data={minutesData} value={tempMinutes} onChange={setTempMinutes} />
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent1 }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>СОХРАНИТЬ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={() => setIsOpen(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textMain }]}>ОТМЕНА</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  buttonText: { fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: 300, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  hint: { fontSize: 11, marginBottom: 16, opacity: 0.7 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  colon: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 8 },
  saveBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#020617', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  cancelBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
});

export default TimePicker;

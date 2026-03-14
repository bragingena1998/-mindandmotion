// src/components/TimePicker.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Modal as RNModal,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ITEM_HEIGHT = 52;
const VISIBLE = 5;
const CENTER = Math.floor(VISIBLE / 2); // 2
const MULT = 40;

const InfiniteWheel = ({ data, value, onChange }) => {
  const { colors } = useTheme();
  const listRef = useRef(null);
  const count = data.length;
  const total = count * MULT;
  const midBlock = Math.floor(MULT / 2);
  const valIdx = Math.max(0, data.indexOf(value));

  // индекс элемента, который должен быть в центре
  // offset = startIdx * ITEM_HEIGHT (т.е. это индекс верхнего видимого)
  const startIdx = midBlock * count + valIdx - CENTER;

  const scrollToSafe = useCallback((realIdx, animated = false) => {
    const safeTop = midBlock * count + realIdx - CENTER;
    listRef.current?.scrollToOffset({ offset: safeTop * ITEM_HEIGHT, animated });
  }, [midBlock, count]);

  const onLayout = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: startIdx * ITEM_HEIGHT, animated: false });
    });
  }, [startIdx]);

  const onScrollEnd = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const topIdx = Math.round(y / ITEM_HEIGHT);
    const centerAbsIdx = topIdx + CENTER;
    const realIdx = ((centerAbsIdx % count) + count) % count;
    onChange(data[realIdx]);
    // возврат к безопасной середине если подошли близко к краю
    const safeTop = midBlock * count + realIdx - CENTER;
    if (Math.abs(topIdx - safeTop) > count * 3) {
      setTimeout(() => scrollToSafe(realIdx), 50);
    }
  }, [count, data, onChange, midBlock, CENTER, scrollToSafe]);

  const looped = Array.from({ length: total }, (_, i) => ({ key: String(i), val: data[i % count] }));

  const renderItem = useCallback(({ item }) => {
    const isSelected = item.val === value;
    return (
      <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{
          fontSize: isSelected ? 28 : 20,
          fontWeight: isSelected ? '800' : '400',
          color: isSelected ? colors.textMain : colors.textMuted,
        }}>{item.val}</Text>
      </View>
    );
  }, [value, colors]);

  return (
    <View style={{ width: 80, height: ITEM_HEIGHT * VISIBLE, overflow: 'hidden' }}>
      {/* Подсветка центральной строки */}
      <View pointerEvents="none" style={{
        position: 'absolute',
        top: CENTER * ITEM_HEIGHT,
        height: ITEM_HEIGHT,
        left: 4, right: 4,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: colors.accent1,
        opacity: 0.7,
        zIndex: 10,
      }} />
      <FlatList
        ref={listRef}
        data={looped}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        // НЕ используем initialScrollIndex — только onLayout
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        onLayout={onLayout}
        windowSize={7}
        maxToRenderPerBatch={15}
        removeClippedSubviews
        scrollEventThrottle={16}
      />
    </View>
  );
};

const TimePicker = ({ label, value, onChangeTime }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [tempH, setTempH] = useState('12');
  const [tempM, setTempM] = useState('00');

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const open = () => {
    setTempH(value ? value.split(':')[0] : '12');
    setTempM(value ? value.split(':')[1] : '00');
    setIsOpen(true);
  };

  const save = () => { onChangeTime(`${tempH}:${tempM}`); setIsOpen(false); };

  return (
    <View style={styles.wrap}>
      {label && <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>}
      <View style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={open}>
          <Text style={[styles.btnText, { color: value ? colors.textMain : colors.textMuted }]}>
            {value || 'Без времени'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {value && (
            <TouchableOpacity onPress={() => onChangeTime(null)}>
              <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={open}>
            <Text style={{ fontSize: 20 }}>🕒</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RNModal visible={isOpen} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.accentText }]}>ВЫБЕРИТЕ ВРЕМЯ</Text>
            <View style={styles.row}>
              <InfiniteWheel data={hours} value={tempH} onChange={setTempH} />
              <Text style={[styles.colon, { color: colors.textMain }]}>:</Text>
              <InfiniteWheel data={minutes} value={tempM} onChange={setTempM} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent1 }]} onPress={save}>
              <Text style={styles.saveTxt}>СОХРАНИТЬ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={() => setIsOpen(false)}>
              <Text style={[styles.cancelTxt, { color: colors.textMain }]}>ОТМЕНА</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 300, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', elevation: 10 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 1, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  colon: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 12 },
  saveBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 12 },
  saveTxt: { color: '#020617', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  cancelBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
});

export default TimePicker;

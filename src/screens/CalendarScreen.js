// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  FlatList,
  Modal as RNModal,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import api from '../services/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING_H = 16;
const CELL_WIDTH = (SCREEN_WIDTH - PADDING_H * 2) / 7;
const CELL_HEIGHT = 90;

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];
const MONTHS_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const HOLIDAYS_2026 = {
  0:[1,2,3,4,5,6,7,8],1:[23],2:[8],4:[1,9],5:[12],10:[4],
};

const EVENT_TYPES = [
  { key: 'birthday',  label: 'День рождения', icon: '🎂' },
  { key: 'important', label: 'Важная дата',   icon: '📌' },
  { key: 'event',     label: 'Событие',        icon: '⭐' },
];

// ─── InfiniteWheel (drum picker) ──────────────────────────────────────────────
const ITEM_H = 48;
const VIS    = 5;
const CTR    = Math.floor(VIS / 2);
const MULT   = 40;

const InfiniteWheel = ({ data, value, onChange, width = 72 }) => {
  const { colors } = useTheme();
  const listRef  = useRef(null);
  const count    = data.length;
  const total    = count * MULT;
  const midBlock = Math.floor(MULT / 2);
  const valIdx   = Math.max(0, data.indexOf(value));
  const startIdx = midBlock * count + valIdx - CTR;

  const scrollToSafe = useCallback((rIdx, animated = false) => {
    listRef.current?.scrollToOffset({ offset: (midBlock * count + rIdx - CTR) * ITEM_H, animated });
  }, [midBlock, count]);

  const onLayout = useCallback(() => {
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: startIdx * ITEM_H, animated: false })
    );
  }, [startIdx]);

  const onScrollEnd = useCallback(e => {
    const topIdx       = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const centerAbsIdx = topIdx + CTR;
    const rIdx         = ((centerAbsIdx % count) + count) % count;
    onChange(data[rIdx]);
    if (Math.abs(topIdx - (midBlock * count + rIdx - CTR)) > count * 3)
      setTimeout(() => scrollToSafe(rIdx), 50);
  }, [count, data, onChange, midBlock, scrollToSafe]);

  const looped = Array.from({ length: total }, (_, i) => ({ key: String(i), val: data[i % count] }));

  const renderItem = useCallback(({ item }) => {
    const sel = item.val === value;
    return (
      <View style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: sel ? 26 : 18, fontWeight: sel ? '800' : '400',
          color: sel ? colors.textMain : colors.textMuted }}>
          {item.val}
        </Text>
      </View>
    );
  }, [value, colors]);

  return (
    <View style={{ width, height: ITEM_H * VIS, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: CTR * ITEM_H, height: ITEM_H,
        left: 4, right: 4, borderTopWidth: 1.5, borderBottomWidth: 1.5,
        borderColor: colors.accent1, opacity: 0.7, zIndex: 10,
      }} />
      <FlatList
        ref={listRef} data={looped}
        keyExtractor={i => i.key} renderItem={renderItem}
        getItemLayout={(_, idx) => ({ length: ITEM_H, offset: ITEM_H * idx, index: idx })}
        snapToInterval={ITEM_H} snapToAlignment="start"
        decelerationRate="fast" disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd} onScrollEndDrag={onScrollEnd}
        onLayout={onLayout}
        windowSize={7} maxToRenderPerBatch={15} removeClippedSubviews scrollEventThrottle={16}
      />
    </View>
  );
};

// ─── DateDrumPicker modal ──────────────────────────────────────────────────────
const DateDrumPicker = ({ visible, value, onChange, onClose }) => {
  const { colors } = useTheme();
  const days   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const curY   = new Date().getFullYear();
  const years  = ['—', ...Array.from({ length: 100 }, (_, i) => String(curY - i))];

  const [d, setD] = useState(value?.day   || '01');
  const [m, setM] = useState(value?.month || '01');
  const [y, setY] = useState(value?.year  || '—');

  useEffect(() => {
    if (visible) {
      setD(value?.day   || '01');
      setM(value?.month || '01');
      setY(value?.year  || '—');
    }
  }, [visible]);

  const save = () => {
    onChange({ day: d, month: m, year: y === '—' ? null : y });
    onClose();
  };

  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ width: 340, backgroundColor: colors.surface, borderRadius: 20,
          borderWidth: 1, borderColor: colors.borderSubtle, padding: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.textMain, fontSize: 16, fontWeight: '800',
            letterSpacing: 1, marginBottom: 20, textTransform: 'uppercase' }}>Выберите дату</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <InfiniteWheel data={days}   value={d} onChange={setD} width={72} />
            <Text style={{ color: colors.textMuted, fontSize: 22, fontWeight: '700' }}>.</Text>
            <InfiniteWheel data={months} value={m} onChange={setM} width={72} />
            <Text style={{ color: colors.textMuted, fontSize: 22, fontWeight: '700' }}>.</Text>
            <InfiniteWheel data={years}  value={y} onChange={setY} width={90} />
          </View>
          <TouchableOpacity onPress={save} style={[styles.drumSaveBtn, { backgroundColor: colors.accent1 }]}>
            <Text style={{ color: '#020617', fontWeight: '800', fontSize: 14, letterSpacing: 1 }}>СОХРАНИТЬ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.drumCancelBtn, { borderColor: colors.borderSubtle }]}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 14 }}>ОТМЕНА</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const CalendarScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [viewMode, setViewMode]   = useState('month');
  const [loading,  setLoading]    = useState(true);
  const [year,     setYear]       = useState(new Date().getFullYear());
  const [month,    setMonth]      = useState(new Date().getMonth());
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));

  const [tasks,        setTasks]        = useState([]);
  const [habitRecords, setHabitRecords] = useState([]);
  const [habitsCount,  setHabitsCount]  = useState(0);
  const [events,       setEvents]       = useState([]);

  const [selectedDay, setSelectedDay]   = useState(null);
  const dayPanelAnim                    = useRef(new Animated.Value(0)).current;

  const EMPTY_FORM = { name: '', type: 'birthday', day: '01', month: '01', year: null, notify_before: '1' };
  const [showEventModal, setShowEventModal] = useState(false);
  const [editEvent,      setEditEvent]      = useState(null);
  const [eventForm,      setEventForm]      = useState(EMPTY_FORM);
  const [showDrumPicker, setShowDrumPicker] = useState(false);

  // ── helpers ──
  function getWeekStart(date) {
    const d = new Date(date);
    const dow = d.getDay();
    const diff = (dow === 0 ? -6 : 1 - dow);
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function dateStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // ── load data ──
  useFocusEffect(
    useCallback(() => { loadData(); }, [year, month])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      // FIX: передаём month+1 (сервер ожидает 1-based)
      const mApi = month + 1;
      const [tasksRes, recordsRes, habitsRes, eventsRes] = await Promise.all([
        api.get(`/tasks?year=${year}&month=${mApi}`),
        api.get(`/habits/records/${year}/${mApi}`),
        api.get(`/habits?year=${year}&month=${mApi}`),
        api.get('/birthdays'),
      ]);
      setTasks(tasksRes.data);
      setHabitRecords(recordsRes.data);
      setHabitsCount(habitsRes.data.filter(h => h.shouldShow !== false).length);
      setEvents(eventsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── day data ──
  const getDayData = (d, m = month, y = year) => {
    const ds = dateStr(y, m, d);
    // задачи: невыполненные по date, выполненные по done_date
    const dayTasks = tasks.filter(t => {
      if (t.done) return t.done_date && t.done_date.startsWith(ds);
      return t.date === ds;
    });
    const doneTasks  = dayTasks.filter(t => t.done).length;
    const totalTasks = dayTasks.length;
    // привычки: записи за этот день
    const dayRecords = habitRecords.filter(r => r.day === d && (r.value === '✓' || r.value > 0));
    const doneHabits = dayRecords.length;
    const dayEvents  = events.filter(e => e.day === d && e.month === (m + 1));
    const allDone    = totalTasks > 0 && doneTasks === totalTasks;
    // FIX: привычки хорошо выполнены если >= 80% от habitsCount
    const goodHabits = habitsCount > 0 && doneHabits >= habitsCount * 0.8;
    return { dayTasks, doneTasks, totalTasks, doneHabits, dayEvents, allDone, goodHabits };
  };

  // ── navigation ──
  const changeMonth = dir => {
    let nm = month + dir, ny = year;
    if (nm > 11) { nm = 0; ny++; }
    if (nm < 0)  { nm = 11; ny--; }
    setMonth(nm); setYear(ny);
  };

  const changeWeek = dir => {
    const next = addDays(weekStart, dir * 7);
    setWeekStart(next);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };

  const swipeGesture = Gesture.Pan().runOnJS(true).onEnd(e => {
    if (viewMode === 'month') {
      if (e.translationX >  50) changeMonth(-1);
      if (e.translationX < -50) changeMonth(1);
    } else {
      if (e.translationX >  50) changeWeek(-1);
      if (e.translationX < -50) changeWeek(1);
    }
  });

  // ── select day ──
  const selectDay = (d, m_ = month, y_ = year) => {
    const same = selectedDay?.d === d && selectedDay?.m === m_ && selectedDay?.y === y_;
    if (same) {
      Animated.timing(dayPanelAnim, { toValue: 0, duration: 220, useNativeDriver: false })
        .start(() => setSelectedDay(null));
    } else {
      setSelectedDay({ d, m: m_, y: y_ });
      Animated.timing(dayPanelAnim, { toValue: 1, duration: 260, useNativeDriver: false }).start();
    }
  };

  // ── event CRUD ──
  const openNewEvent = (prefillDay = null, prefillMonth = null) => {
    const d = prefillDay   ? String(prefillDay).padStart(2, '0')   : String(new Date().getDate()).padStart(2, '0');
    const m = prefillMonth ? String(prefillMonth).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    setEditEvent(null);
    setEventForm({ ...EMPTY_FORM, day: d, month: m });
    setShowEventModal(true);
  };

  const openEditEvent = ev => {
    setEditEvent(ev);
    setEventForm({
      name:          ev.name,
      type:          ev.type || 'birthday',
      day:           String(ev.day).padStart(2, '0'),
      month:         String(ev.month).padStart(2, '0'),
      year:          ev.year ? String(ev.year) : null,
      notify_before: String(ev.notify_before ?? 1),
    });
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.name.trim()) return;
    const payload = {
      name:          eventForm.name.trim(),
      type:          eventForm.type,
      day:           parseInt(eventForm.day),
      month:         parseInt(eventForm.month),
      year:          eventForm.year ? parseInt(eventForm.year) : null,
      notify_before: parseInt(eventForm.notify_before) || 1,
    };
    try {
      if (editEvent) {
        await api.put(`/birthdays/${editEvent.id}`, payload);
      } else {
        await api.post('/birthdays', payload);
      }
      setShowEventModal(false);
      loadData();
    } catch (e) { console.error(e); }
  };

  const deleteEvent = async id => {
    try {
      await api.delete(`/birthdays/${id}`);
      loadData();
      if (selectedDay) {
        Animated.timing(dayPanelAnim, { toValue: 0, duration: 180, useNativeDriver: false })
          .start(() => setSelectedDay(null));
      }
    } catch (e) { console.error(e); }
  };

  // ─── RENDER: Month cell ───────────────────────────────────────────────────────
  const renderCell = (d, m_ = month, y_ = year) => {
    const { doneTasks, totalTasks, doneHabits, dayEvents, allDone, goodHabits } = getDayData(d, m_, y_);
    const today     = new Date();
    const isToday   = d === today.getDate() && m_ === today.getMonth() && y_ === today.getFullYear();
    const dow       = new Date(y_, m_, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = HOLIDAYS_2026[m_]?.includes(d);
    const isSel     = selectedDay?.d === d && selectedDay?.m === m_ && selectedDay?.y === y_;

    const bgColor = isHoliday
      ? 'rgba(251,191,36,0.15)'
      : isWeekend
        ? 'rgba(244,63,94,0.08)'
        : colors.surface;

    return (
      <View key={`${y_}-${m_}-${d}`} style={{ width: CELL_WIDTH, height: CELL_HEIGHT, padding: 2 }}>
        <TouchableOpacity
          style={[styles.cellInner, {
            backgroundColor: isSel ? colors.accent1 + '22' : bgColor,
            borderColor: isSel ? colors.accent1 : isToday ? colors.accent1 : colors.borderSubtle,
            borderWidth: (isSel || isToday) ? 2 : 1,
          }]}
          onPress={() => selectDay(d, m_, y_)}
        >
          <Text style={[styles.dayNum, { color: (isHoliday || isWeekend) ? colors.danger1 : colors.textMain }]}>{d}</Text>
          <View style={styles.indicators}>
            {totalTasks > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="check-square" size={9} color={allDone ? colors.accent1 : colors.textMuted} />
                {/* FIX: показываем вып./всего задач */}
                <Text style={[styles.indicatorText, { color: allDone ? colors.accent1 : colors.textMain }]}>{doneTasks}/{totalTasks}</Text>
              </View>
            )}
            {/* FIX: показываем вып./habitsCount (всего запланировано) вместо только вып. */}
            {habitsCount > 0 && (
              <View style={styles.indicatorRow}>
                <Feather name="zap" size={9} color={goodHabits ? '#fbbf24' : colors.textMuted} />
                <Text style={[styles.indicatorText, { color: goodHabits ? '#fbbf24' : colors.textMain }]}>{doneHabits}/{habitsCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.stickersContainer}>
            {allDone     && <Text style={{ fontSize: 9 }}>⭐</Text>}
            {goodHabits  && <Text style={{ fontSize: 9 }}>🔥</Text>}
            {dayEvents.some(e => e.type === 'birthday')  && <Text style={{ fontSize: 9 }}>🎂</Text>}
            {dayEvents.some(e => e.type === 'important') && <Text style={{ fontSize: 9 }}>📌</Text>}
            {dayEvents.some(e => e.type === 'event')     && <Text style={{ fontSize: 9 }}>⭐</Text>}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── RENDER: Month grid ───────────────────────────────────────────────────────
  const renderMonthGrid = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow    = new Date(year, month, 1).getDay();
    const offset      = firstDow === 0 ? 6 : firstDow - 1;
    const cells = [];
    for (let i = 0; i < offset; i++)
      cells.push(<View key={`e${i}`} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }} />);
    for (let d = 1; d <= daysInMonth; d++)
      cells.push(renderCell(d));
    return <View style={styles.grid}>{cells}</View>;
  };

  // ─── RENDER: Week strip (7 day chips) ────────────────────────────────────────
  const renderWeekStrip = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <View style={[styles.weekStrip, { borderColor: colors.borderSubtle }]}>
        {days.map((date, i) => {
          const d   = date.getDate();
          const m_  = date.getMonth();
          const y_  = date.getFullYear();
          const { totalTasks, doneHabits, dayEvents, allDone, goodHabits } = getDayData(d, m_, y_);
          const today   = new Date();
          const isToday = d === today.getDate() && m_ === today.getMonth() && y_ === today.getFullYear();
          const isSel   = selectedDay?.d === d && selectedDay?.m === m_ && selectedDay?.y === y_;
          const dow     = date.getDay();
          const isWE    = dow === 0 || dow === 6;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => selectDay(d, m_, y_)}
              style={[
                styles.weekChip,
                {
                  backgroundColor: isSel
                    ? colors.accent1
                    : isToday
                      ? colors.accent1 + '33'
                      : colors.surface,
                  borderColor: isSel ? colors.accent1 : colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.weekChipLabel, { color: isSel ? '#020617' : isWE ? colors.danger1 : colors.textMuted }]}>
                {WEEKDAYS[i]}
              </Text>
              <Text style={[styles.weekChipDay, { color: isSel ? '#020617' : isWE ? colors.danger1 : colors.textMain }]}>
                {d}
              </Text>
              <View style={styles.weekDots}>
                {totalTasks > 0 && (
                  <View style={[styles.dot, { backgroundColor: allDone ? colors.accent1 : colors.textMuted }]} />
                )}
                {habitsCount > 0 && doneHabits > 0 && (
                  <View style={[styles.dot, { backgroundColor: goodHabits ? '#fbbf24' : colors.textMuted }]} />
                )}
                {dayEvents.length > 0 && (
                  <View style={[styles.dot, { backgroundColor: '#f472b6' }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ─── RENDER: Day Panel ────────────────────────────────────────────────────────
  // FIX: renderDayPanel теперь используется и в месячном виде, и в недельном
  const renderDayPanel = () => {
    if (!selectedDay) return null;
    const { d, m: m_, y: y_ } = selectedDay;
    const { dayTasks, doneHabits, dayEvents } = getDayData(d, m_, y_);
    const label = `${d} ${MONTHS_GEN[m_]} ${y_}`;
    const ds    = dateStr(y_, m_, d);

    const panelHeight = dayPanelAnim.interpolate({
      inputRange: [0, 1], outputRange: [0, 340],
    });
    const opacity = dayPanelAnim.interpolate({
      inputRange: [0, 0.3, 1], outputRange: [0, 0, 1],
    });

    return (
      <Animated.View style={[
        styles.dayPanel,
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle, height: panelHeight, opacity },
      ]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          {/* Header */}
          <View style={styles.dayPanelHeader}>
            <Text style={[styles.dayPanelTitle, { color: colors.accent1 }]}>{label}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => openNewEvent(d, m_ + 1)} style={[styles.addEventBtn, { borderColor: colors.accent1 }]}>
                <Feather name="plus" size={14} color={colors.accent1} />
                <Text style={{ color: colors.accent1, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>СОБЫТИЕ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectDay(d, m_, y_)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Events */}
          {dayEvents.length > 0 && (
            <View style={styles.panelSection}>
              <Text style={[styles.panelSectionTitle, { color: '#f472b6' }]}>События дня</Text>
              {dayEvents.map(ev => {
                const t = EVENT_TYPES.find(t => t.key === ev.type) || EVENT_TYPES[0];
                return (
                  <View key={ev.id} style={[styles.panelItem, { backgroundColor: colors.background }]}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{t.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontWeight: '700' }}>{ev.name}</Text>
                      {ev.year && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{ev.year} г.</Text>}
                    </View>
                    <TouchableOpacity onPress={() => openEditEvent(ev)} style={{ padding: 6 }}>
                      <Feather name="edit-2" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteEvent(ev.id)} style={{ padding: 6 }}>
                      <Feather name="trash-2" size={14} color={colors.danger1} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tasks */}
          <View style={styles.panelSection}>
            <View style={styles.panelSectionRow}>
              <Text style={[styles.panelSectionTitle, { color: colors.accent1 }]}>
                Задачи {dayTasks.length > 0 ? `(${dayTasks.filter(t => t.done).length}/${dayTasks.length})` : ''}
              </Text>
              <TouchableOpacity onPress={() => {
                setSelectedDay(null);
                navigation.navigate('Tasks', { screen: 'TasksScreen', params: { date: ds } });
              }}>
                <Text style={{ color: colors.accent1, fontSize: 11, fontWeight: '700' }}>ПЕРЕЙТИ →</Text>
              </TouchableOpacity>
            </View>
            {dayTasks.length === 0
              ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>Нет задач</Text>
              : dayTasks.map(t => (
                  <View key={t.id} style={[styles.panelItem, { backgroundColor: colors.background }]}>
                    <Feather
                      name={t.done ? 'check-square' : 'square'}
                      size={15}
                      color={t.done ? colors.accent1 : colors.textMuted}
                    />
                    <Text style={[
                      { color: colors.textMain, marginLeft: 8, flex: 1, fontSize: 13 },
                      t.done && { textDecorationLine: 'line-through', color: colors.textMuted },
                    ]} numberOfLines={2}>{t.title}</Text>
                    {t.time && <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t.time}</Text>}
                  </View>
                ))
            }
          </View>

          {/* Habits */}
          <View style={styles.panelSection}>
            <View style={styles.panelSectionRow}>
              {/* FIX: показываем вып./habitsCount */}
              <Text style={[styles.panelSectionTitle, { color: '#fbbf24' }]}>
                Привычки {habitsCount > 0 ? `(${doneHabits}/${habitsCount})` : ''}
              </Text>
              <TouchableOpacity onPress={() => {
                setSelectedDay(null);
                navigation.navigate('Habits', { year: y_, month: m_ + 1 });
              }}>
                <Text style={{ color: colors.accent1, fontSize: 11, fontWeight: '700' }}>ПЕРЕЙТИ →</Text>
              </TouchableOpacity>
            </View>
            {habitsCount === 0
              ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>Нет привычек</Text>
              : <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {doneHabits} из {habitsCount} выполнено
                </Text>
            }
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  // ─── RENDER: Event Modal ──────────────────────────────────────────────────────
  const renderEventModal = () => (
    <Modal
      visible={showEventModal}
      onClose={() => setShowEventModal(false)}
      title={editEvent ? 'Редактировать событие' : 'Новое событие'}
    >
      <View style={{ padding: 16 }}>
        <Text style={[styles.formLabel, { color: colors.textMuted }]}>ТИП</Text>
        <View style={styles.typeRow}>
          {EVENT_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setEventForm(f => ({ ...f, type: t.key }))}
              style={[
                styles.typeChip,
                {
                  backgroundColor: eventForm.type === t.key ? colors.accent1 : colors.surface,
                  borderColor: eventForm.type === t.key ? colors.accent1 : colors.borderSubtle,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{t.icon}</Text>
              <Text style={[
                styles.typeChipLabel,
                { color: eventForm.type === t.key ? '#020617' : colors.textMuted },
              ]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Название"
          value={eventForm.name}
          onChangeText={v => setEventForm(f => ({ ...f, name: v }))}
          placeholder="Введите название..."
        />

        <Text style={[styles.formLabel, { color: colors.textMuted }]}>ДАТА</Text>
        <TouchableOpacity
          onPress={() => setShowDrumPicker(true)}
          style={[styles.dateTrigger, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        >
          <Feather name="calendar" size={16} color={colors.accent1} />
          <Text style={{ color: colors.textMain, marginLeft: 10, fontSize: 15 }}>
            {eventForm.day}.{eventForm.month}{eventForm.year ? `.${eventForm.year}` : ''}
          </Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <DateDrumPicker
          visible={showDrumPicker}
          value={{ day: eventForm.day, month: eventForm.month, year: eventForm.year || '—' }}
          onChange={v => setEventForm(f => ({ ...f, day: v.day, month: v.month, year: v.year }))}
          onClose={() => setShowDrumPicker(false)}
        />

        <Input
          label="Уведомить за (дней)"
          value={eventForm.notify_before}
          onChangeText={v => setEventForm(f => ({ ...f, notify_before: v }))}
          keyboardType="numeric"
          containerStyle={{ marginBottom: 8 }}
        />

        <Button title={editEvent ? 'Сохранить' : 'Добавить'} onPress={saveEvent} style={{ marginTop: 12 }} />
        {editEvent && (
          <Button
            title="Удалить событие"
            variant="danger"
            noBorder
            onPress={() => { setShowEventModal(false); deleteEvent(editEvent.id); }}
            style={{ marginTop: 8 }}
          />
        )}
      </View>
    </Modal>
  );

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────────
  const weekLabel = (() => {
    const end = addDays(weekStart, 6);
    return `${weekStart.getDate()} ${MONTHS_GEN[weekStart.getMonth()]} — ${end.getDate()} ${MONTHS_GEN[end.getMonth()]}`;
  })();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>

          {/* ── HEADER ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => viewMode === 'month' ? changeMonth(-1) : changeWeek(-1)} style={styles.arrowBtn}>
              <Feather name="chevron-left" size={28} color={colors.accent1} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              if (viewMode === 'month') {
                setWeekStart(getWeekStart(new Date()));
                setMonth(new Date().getMonth());
                setYear(new Date().getFullYear());
              } else {
                setMonth(new Date().getMonth());
                setYear(new Date().getFullYear());
              }
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.monthTitle, { color: colors.textMain }]}>
                  {viewMode === 'month' ? MONTHS[month] : weekLabel}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{year}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => viewMode === 'month' ? changeMonth(1) : changeWeek(1)} style={styles.arrowBtn}>
              <Feather name="chevron-right" size={28} color={colors.accent1} />
            </TouchableOpacity>
          </View>

          {/* ── VIEW TOGGLE + ADD EVENT ── */}
          <View style={[styles.toolRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.toggleWrap, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                onPress={() => setViewMode('month')}
                style={[styles.toggleBtn, viewMode === 'month' && { backgroundColor: colors.accent1 }]}
              >
                <Feather name="grid" size={14} color={viewMode === 'month' ? '#020617' : colors.textMuted} />
                <Text style={[styles.toggleLabel, { color: viewMode === 'month' ? '#020617' : colors.textMuted }]}>Месяц</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setViewMode('week'); setWeekStart(getWeekStart(new Date())); }}
                style={[styles.toggleBtn, viewMode === 'week' && { backgroundColor: colors.accent1 }]}
              >
                <Feather name="list" size={14} color={viewMode === 'week' ? '#020617' : colors.textMuted} />
                <Text style={[styles.toggleLabel, { color: viewMode === 'week' ? '#020617' : colors.textMuted }]}>Неделя</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => openNewEvent()}
              style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}
            >
              <Feather name="plus" size={15} color={colors.accent1} />
              <Text style={{ color: colors.accent1, fontSize: 11, fontWeight: '800', marginLeft: 4 }}>СОБЫТИЕ</Text>
            </TouchableOpacity>
          </View>

          {/* ── WEEKDAY HEADER (only month mode) ── */}
          {viewMode === 'month' && (
            <View style={styles.weekHeader}>
              {WEEKDAYS.map((d, i) => (
                <Text key={i} style={[styles.weekDayText, { width: CELL_WIDTH, color: i >= 5 ? colors.danger1 : colors.textMuted }]}>{d}</Text>
              ))}
            </View>
          )}

          {/* ── CONTENT ── */}
          {loading
            ? <ActivityIndicator size="large" color={colors.accent1} style={{ marginTop: 50 }} />
            : viewMode === 'month'
              ? (
                // FIX: добавляем renderDayPanel в месячный вид
                <View style={{ flex: 1 }}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                    {renderMonthGrid()}
                  </ScrollView>
                  {renderDayPanel()}
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  {renderWeekStrip()}
                  {renderDayPanel()}
                  {!selectedDay && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.4 }}>
                      <Feather name="calendar" size={48} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 14 }}>Выберите день</Text>
                    </View>
                  )}
                </View>
              )
          }

          {renderEventModal()}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: PADDING_H, paddingTop: 16, paddingBottom: 8 },
  monthTitle:      { fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  arrowBtn:        { padding: 8 },
  toolRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: PADDING_H, paddingBottom: 10, borderBottomWidth: 1 },
  toggleWrap:      { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', padding: 3, gap: 3 },
  toggleBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5,
                     paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  toggleLabel:     { fontSize: 13, fontWeight: '700' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
                     borderRadius: 10, borderWidth: 1 },
  weekHeader:      { flexDirection: 'row', paddingHorizontal: PADDING_H, marginTop: 10, marginBottom: 6 },
  weekDayText:     { textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PADDING_H },
  cellInner:       { flex: 1, borderRadius: 8, padding: 4, position: 'relative' },
  dayNum:          { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  indicators:      { gap: 2 },
  indicatorRow:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  indicatorText:   { fontSize: 9, fontWeight: '700' },
  stickersContainer: { position: 'absolute', bottom: 3, right: 3, flexDirection: 'row', gap: 1 },
  weekStrip:       { flexDirection: 'row', justifyContent: 'space-around',
                     paddingHorizontal: PADDING_H, paddingVertical: 12,
                     borderBottomWidth: 1 },
  weekChip:        { alignItems: 'center', justifyContent: 'center',
                     width: (SCREEN_WIDTH - PADDING_H * 2) / 7 - 4,
                     paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  weekChipLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  weekChipDay:     { fontSize: 18, fontWeight: '800' },
  weekDots:        { flexDirection: 'row', gap: 3, marginTop: 4, height: 6, alignItems: 'center' },
  dot:             { width: 5, height: 5, borderRadius: 3 },
  dayPanel:        { overflow: 'hidden', borderTopWidth: 1, marginTop: 4 },
  dayPanelHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayPanelTitle:   { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  addEventBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  panelSection:    { marginBottom: 16 },
  panelSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  panelSectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  panelItem:       { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 6 },
  formLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  typeRow:         { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeChipLabel:   { fontSize: 12, fontWeight: '700' },
  dateTrigger:     { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  drumSaveBtn:     { width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 10 },
  drumCancelBtn:   { width: '100%', paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
});

export default CalendarScreen;

// src/components/FocusSessionModal.js
// Таймер «Концентрат»: пресеты, ручной ввод, стоп+сохранить, фоновый таймер (скрыть)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  Vibration,
  AppState,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const PRESETS = [
  { label: '15 мин', seconds: 15 * 60 },
  { label: '25 мин', seconds: 25 * 60 },
  { label: '45 мин', seconds: 45 * 60 },
  { label: '60 мин', seconds: 60 * 60 },
];

const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Глобальный синглтон состояния таймера — сохраняется при скрытии модалки
let _globalTimer = null;

const FocusSessionModal = ({ visible, task, onClose, onComplete, onMinimize }) => {
  const { colors } = useTheme();

  const [selectedPreset, setSelectedPreset] = useState(1);
  const [timeLeft, setTimeLeft] = useState(PRESETS[1].seconds);
  const [totalTime, setTotalTime] = useState(PRESETS[1].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Ручной ввод минут
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef(null);

  // Восстановление состояния при открытии (если таймер бежал в фоне)
  useEffect(() => {
    if (visible) {
      if (_globalTimer && _globalTimer.taskId === task?.id) {
        // Восстанавливаем из глобального состояния
        const elapsed = _globalTimer.isRunning
          ? Math.floor((Date.now() - _globalTimer.startedAt) / 1000)
          : 0;
        const restored = Math.max(0, _globalTimer.timeLeft - elapsed);
        setTimeLeft(restored);
        setTotalTime(_globalTimer.totalTime);
        setIsRunning(_globalTimer.isRunning && restored > 0);
        setIsFinished(restored === 0);
        setSelectedPreset(_globalTimer.selectedPreset);
      } else {
        // Новая сессия
        setIsRunning(false);
        setIsFinished(false);
        setSelectedPreset(1);
        setManualMode(false);
        setManualInput('');
        const t = PRESETS[1].seconds;
        setTimeLeft(t);
        setTotalTime(t);
        _globalTimer = null;
      }
    }
  }, [visible]);

  // Сохраняем в глобал при каждом изменении
  useEffect(() => {
    if (task && (isRunning || timeLeft > 0)) {
      _globalTimer = {
        taskId: task.id,
        timeLeft,
        totalTime,
        isRunning,
        selectedPreset,
        startedAt: isRunning ? Date.now() : null,
      };
    }
  }, [timeLeft, isRunning]);

  // Обработка сворачивания приложения
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        backgroundTimeRef.current = Date.now();
      }
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (isRunning && backgroundTimeRef.current) {
          const elapsed = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          setTimeLeft(prev => {
            const next = Math.max(0, prev - elapsed);
            if (next === 0) {
              setIsRunning(false);
              setIsFinished(true);
              Vibration.vibrate([500, 300, 500]);
            }
            return next;
          });
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isRunning]);

  // Тик таймера
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsFinished(true);
            Vibration.vibrate([500, 300, 500]);
            _globalTimer = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleSelectPreset = (index) => {
    if (isRunning) return;
    setManualMode(false);
    setManualInput('');
    setSelectedPreset(index);
    const t = PRESETS[index].seconds;
    setTimeLeft(t);
    setTotalTime(t);
    setIsFinished(false);
  };

  const handleApplyManual = () => {
    const mins = parseInt(manualInput, 10);
    if (!mins || mins <= 0 || mins > 240) return;
    const t = mins * 60;
    setTimeLeft(t);
    setTotalTime(t);
    setIsFinished(false);
    setSelectedPreset(-1); // убираем выделение пресетов
    setManualMode(false);
  };

  const handleStartPause = () => {
    if (isFinished) return;
    setIsRunning(prev => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    const t = selectedPreset >= 0 ? PRESETS[selectedPreset].seconds : totalTime;
    setTimeLeft(t);
    setTotalTime(t);
    _globalTimer = null;
  };

  // Стоп и сохранить — фиксируем сессию досрочно
  const handleStopAndSave = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    _globalTimer = null;
    onComplete(); // засчитываем +1 фокус-сессию
  };

  // Скрыть модалку, таймер продолжает тикать
  const handleMinimize = () => {
    if (_globalTimer) {
      _globalTimer.startedAt = isRunning ? Date.now() : null;
    }
    if (onMinimize) {
      onMinimize();
    } else {
      onClose(); // fallback если onMinimize не передан
    }
  };

  const progress = totalTime > 0 ? 1 - timeLeft / totalTime : 0;

  return (
    <RNModal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>

          {/* Верхняя строка: заголовок + скрыть */}
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: colors.accentText }]}>🎯 КОНЦЕНТРАТ</Text>
            <TouchableOpacity onPress={handleMinimize} style={[styles.minimizeBtn, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.minimizeBtnText, { color: colors.textMuted }]}>— Скрыть</Text>
            </TouchableOpacity>
          </View>

          {task && (
            <Text style={[styles.taskName, { color: colors.textMuted }]} numberOfLines={2}>
              {task.title}
            </Text>
          )}

          {/* Пресеты */}
          <View style={styles.presets}>
            {PRESETS.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: selectedPreset === i ? colors.accent1 : colors.background,
                    borderColor: selectedPreset === i ? colors.accent1 : colors.borderSubtle,
                  }
                ]}
                onPress={() => handleSelectPreset(i)}
              >
                <Text style={[styles.presetText, { color: selectedPreset === i ? '#020617' : colors.textMuted }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Кнопка ручного ввода */}
            <TouchableOpacity
              style={[
                styles.presetBtn,
                {
                  backgroundColor: manualMode ? colors.accent1 : colors.background,
                  borderColor: manualMode ? colors.accent1 : colors.borderSubtle,
                }
              ]}
              onPress={() => { if (!isRunning) setManualMode(!manualMode); }}
            >
              <Text style={[styles.presetText, { color: manualMode ? '#020617' : colors.textMuted }]}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Ввод вручную */}
          {manualMode && !isRunning && (
            <View style={styles.manualRow}>
              <TextInput
                style={[styles.manualInput, { borderColor: colors.borderSubtle, color: colors.textMain, backgroundColor: colors.background }]}
                keyboardType="number-pad"
                placeholder="мин"
                placeholderTextColor={colors.textMuted}
                value={manualInput}
                onChangeText={setManualInput}
                maxLength={3}
              />
              <TouchableOpacity
                style={[styles.manualApplyBtn, { backgroundColor: colors.accent1 }]}
                onPress={handleApplyManual}
              >
                <Text style={{ color: '#020617', fontWeight: '700', fontSize: 13 }}>ОК</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Большой таймер */}
          <View style={[styles.timerCircle, { borderColor: isFinished ? colors.ok1 : isRunning ? colors.accent1 : colors.borderSubtle }]}>
            <Text style={[styles.timerText, { color: isFinished ? colors.ok1 : colors.textMain }]}>
              {isFinished ? '✓' : formatTime(timeLeft)}
            </Text>
            {!isFinished && (
              <Text style={[styles.timerSubText, { color: colors.textMuted }]}>
                {isRunning ? 'В ПРОЦЕССЕ' : 'ГОТОВ'}
              </Text>
            )}
            {isFinished && (
              <Text style={[styles.timerSubText, { color: colors.ok1 }]}>ГОТОВО!</Text>
            )}
          </View>

          {/* Прогресс-бар */}
          <View style={[styles.progressBar, { backgroundColor: colors.borderSubtle }]}>
            <View style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: isFinished ? colors.ok1 : colors.accent1 }
            ]} />
          </View>

          {/* Кнопки управления */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}
              onPress={handleReset}
            >
              <Text style={[styles.controlBtnText, { color: colors.textMuted }]}>↺</Text>
            </TouchableOpacity>

            {!isFinished ? (
              <TouchableOpacity
                style={[styles.controlBtn, styles.mainBtn, { backgroundColor: isRunning ? colors.danger1 : colors.accent1 }]}
                onPress={handleStartPause}
              >
                <Text style={[styles.controlBtnText, { color: '#020617' }]}>
                  {isRunning ? '⏸ ПАУЗА' : '▶ СТАРТ'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlBtn, styles.mainBtn, { backgroundColor: colors.ok1 }]}
                onPress={onComplete}
              >
                <Text style={[styles.controlBtnText, { color: '#020617' }]}>✓ ЗАЧЕСТЬ</Text>
              </TouchableOpacity>
            )}

            {/* Стоп и сохранить — только если таймер запущен или был запущен */}
            {isRunning && (
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.ok1, borderColor: colors.ok1 }]}
                onPress={handleStopAndSave}
              >
                <Text style={[styles.controlBtnText, { color: '#020617' }]}>⏹ +1</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Закрыть без зачёта */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>Закрыть без зачёта</Text>
          </TouchableOpacity>

        </View>
      </View>
    </RNModal>
  );
};

// Утилита: есть ли активная фоновая сессия
export const hasFocusSession = () => !!_globalTimer;
export const getFocusSession = () => _globalTimer;
export const clearFocusSession = () => { _globalTimer = null; };

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  minimizeBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  minimizeBtnText: { fontSize: 12, fontWeight: '600' },
  taskName: { fontSize: 13, marginBottom: 20, textAlign: 'center', maxWidth: '90%' },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: '600' },
  manualRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  manualInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, width: 80, textAlign: 'center' },
  manualApplyBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  timerCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  timerText: { fontSize: 48, fontWeight: '800', letterSpacing: 2 },
  timerSubText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, marginBottom: 24, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 16 },
  controlBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 2, borderWidth: 0 },
  controlBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  closeBtn: { paddingVertical: 8 },
  closeBtnText: { fontSize: 13 },
});

export default FocusSessionModal;

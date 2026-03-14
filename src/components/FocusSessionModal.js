// src/components/FocusSessionModal.js
// Модалка таймера Концентрат-сессии (25 мин по умолчанию)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  Vibration,
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

const FocusSessionModal = ({ visible, task, onClose, onComplete }) => {
  const { colors } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState(1); // 25 мин по умолчанию
  const [timeLeft, setTimeLeft] = useState(PRESETS[1].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef(null);

  // При смене пресета сбрасываем таймер
  const handleSelectPreset = (index) => {
    if (isRunning) return; // нельзя менять во время работы
    setSelectedPreset(index);
    setTimeLeft(PRESETS[index].seconds);
    setIsFinished(false);
  };

  // Запуск/пауза
  const handleStartPause = () => {
    if (isFinished) return;
    setIsRunning(prev => !prev);
  };

  // Сброс
  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(PRESETS[selectedPreset].seconds);
  };

  // Таймер
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsFinished(true);
            Vibration.vibrate([500, 300, 500]); // ощутимый сигнал
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

  // Сброс при открытии
  useEffect(() => {
    if (visible) {
      setIsRunning(false);
      setIsFinished(false);
      setSelectedPreset(1);
      setTimeLeft(PRESETS[1].seconds);
    }
  }, [visible]);

  const progress = 1 - timeLeft / PRESETS[selectedPreset].seconds;

  return (
    <RNModal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
          
          {/* Заголовок */}
          <Text style={[styles.title, { color: colors.accentText }]}>🎯 КОНЦЕНТРАТ</Text>
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
          </View>

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
              <Text style={[styles.controlBtnText, { color: colors.textMuted }]}>↺ СБРОС</Text>
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  taskName: { fontSize: 13, marginBottom: 20, textAlign: 'center', maxWidth: '90%' },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: '600' },
  timerCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  timerText: { fontSize: 48, fontWeight: '800', letterSpacing: 2 },
  timerSubText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, marginBottom: 24, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  controlBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 2, borderWidth: 0 },
  controlBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  closeBtn: { paddingVertical: 8 },
  closeBtnText: { fontSize: 13 },
});

export default FocusSessionModal;

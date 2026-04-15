// ========================================
// Плавающий баннер-таймер для привычек с unit='Часы'
// ========================================

import { useState, useEffect, useRef } from 'react';
import type { Habit } from '../api/habits';

interface HabitTimerBannerProps {
  habit: Habit;
  day: number;
  existingMinutes: number;
  onSave: (totalMinutes: number) => void;
  onClose: () => void;
}

export default function HabitTimerBanner({
  habit,
  day,
  existingMinutes,
  onSave,
  onClose,
}: HabitTimerBannerProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Computed values ─────────────────────────────────────────────────────
  const totalSeconds = existingMinutes * 60 + elapsedSeconds;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const displayHours = Math.floor(totalSeconds / 3600);
  const displayMins = Math.floor((totalSeconds % 3600) / 60);
  const displaySecs = totalSeconds % 60;
  const formattedTime = `${String(displayHours).padStart(2, '0')}:${String(displayMins).padStart(2, '0')}:${String(displaySecs).padStart(2, '0')}`;

  // ── Timer logic ──────────────────────────────────────────────────────────
  const startTimer = () => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  const resetTimer = () => {
    pauseTimer();
    setElapsedSeconds(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-start on open
  useEffect(() => {
    startTimer();
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay — клик сворачивает, не закрывает */}
      {!isMinimized && (
        <div
          className="timer-overlay"
          onClick={() => setIsMinimized(true)}
        />
      )}

      <div className={`habit-timer-banner ${isMinimized ? 'minimized' : 'expanded'}`}>
        {isMinimized ? (
          // === СВЁРНУТЫЙ ВИД ===
          <button
            className="timer-pill"
            onClick={() => setIsMinimized(false)}
          >
            <span className="timer-pill-icon">⏱</span>
            <span className="timer-pill-time">{formattedTime}</span>
            <span className="timer-pill-status">{isRunning ? '▶' : '⏸'}</span>
          </button>
        ) : (
          // === РАЗВЁРНУТЫЙ ВИД ===
          <div className="timer-content" onClick={e => e.stopPropagation()}>
            {/* Шапка */}
            <div className="timer-header">
              <span className="timer-habit-name">⏱ {habit.name}</span>
              <button
                className="timer-minimize-btn"
                onClick={() => setIsMinimized(true)}
                title="Свернуть"
              >╱</button>
            </div>

            {/* Цифры */}
            <div className="timer-display">
              <span className="timer-digits">{formattedTime}</span>
              {existingMinutes > 0 && (
                <span className="timer-existing">
                  + уже накоплено: {Math.floor(existingMinutes / 60)}ч {existingMinutes % 60}м
                </span>
              )}
            </div>

            {/* Прогресс к плану */}
            {habit.plan > 0 && (
              <div className="timer-progress">
                <div className="timer-progress-bar">
                  <div
                    className="timer-progress-fill"
                    style={{ width: `${Math.min(100, (totalMinutes / (habit.plan * 60)) * 100)}%` }}
                  />
                </div>
                <span className="timer-progress-label">
                  {Math.floor(totalMinutes / 60)}ч {totalMinutes % 60}м / {habit.plan}ч план
                </span>
              </div>
            )}

            {/* Кнопки */}
            <div className="timer-actions">
              <button className="timer-btn timer-btn-reset" onClick={resetTimer} title="Сбросить">
                ⏹
              </button>
              <button
                className={`timer-btn timer-btn-toggle ${isRunning ? 'running' : ''}`}
                onClick={isRunning ? pauseTimer : startTimer}
              >
                {isRunning ? '⏸ Пауза' : '▶ Старт'}
              </button>
              <button
                className="timer-btn timer-btn-save"
                onClick={() => { pauseTimer(); onSave(totalMinutes); }}
                title="Сохранить и закрыть"
              >
                💾 Сохранить
              </button>
            </div>
            <button className="timer-close-btn" onClick={() => { pauseTimer(); onClose(); }}>
              ✕ Закрыть без сохранения
            </button>
          </div>
        )}
      </div>
    </>
  );
}

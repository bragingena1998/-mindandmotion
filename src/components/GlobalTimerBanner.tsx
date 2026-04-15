// ========================================
// Глобальный баннер-таймер
// Живёт в Layout.tsx — не размонтируется при смене страниц
// ========================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBanner } from '../context/BannerContext';
import type { HabitTimerBannerData, FocusSessionBannerData } from '../context/BannerContext';

const TIME_OPTIONS = [5, 15, 25, 45, 60];

export default function GlobalTimerBanner() {
  const { banner, closeBanner } = useBanner();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus session states
  const [selectedPlannedMinutes, setSelectedPlannedMinutes] = useState(() =>
    banner?.type === 'focus-session' ? (banner as FocusSessionBannerData).plannedMinutes : 25
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Сброс при смене баннера
  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsMinimized(false);
    setTimeLeft(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (banner?.type === 'focus-session') {
      setSelectedPlannedMinutes((banner as FocusSessionBannerData).plannedMinutes || 25);
    }
  }, [banner?.type, (banner as HabitTimerBannerData | null)?.habit?.id, (banner as HabitTimerBannerData | null)?.day]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!banner) return null;

  const isFocusSession = banner.type === 'focus-session';
  const isHabitTimer = banner.type === 'habit-timer';

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      if (isFocusSession) {
        setTimeLeft(prev => {
          if (prev === null) {
            const initial = selectedPlannedMinutes * 60;
            return initial > 0 ? initial - 1 : 0;
          }
          if (prev <= 1) {
            // Timer completed
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setIsRunning(false);
            // Save on completion
            banner.onSave(selectedPlannedMinutes);
            closeBanner();
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsedSeconds(s => s + 1);
      }
    }, 1000);
  }, [isFocusSession, selectedPlannedMinutes, banner, closeBanner]);

  const pauseTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
  };

  const resetTimer = () => {
    pauseTimer();
    setElapsedSeconds(0);
    setTimeLeft(null);
  };

  // Вычисление времени
  const getBaseSeconds = () => {
    if (isHabitTimer) return (banner as HabitTimerBannerData).existingMinutes * 60;
    return 0;
  };

  // For habit timer
  const totalSeconds = getBaseSeconds() + elapsedSeconds;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // For focus session
  const focusTimeLeft = timeLeft ?? selectedPlannedMinutes * 60;
  const focusMins = Math.floor(focusTimeLeft / 60);
  const focusSecs = focusTimeLeft % 60;
  const focusFormattedTime = `${String(focusMins).padStart(2, '0')}:${String(focusSecs).padStart(2, '0')}`;

  const getName = () => {
    if (isHabitTimer) return (banner as HabitTimerBannerData).habit.name;
    return (banner as FocusSessionBannerData).taskName;
  };

  const getIcon = () => (isHabitTimer ? '⏱' : '🎯');

  const getPlan = () => {
    if (isHabitTimer) {
      const b = banner as HabitTimerBannerData;
      return b.habit.plan > 0 ? b.habit.plan * 60 : 0;
    }
    return selectedPlannedMinutes;
  };

  const getProgressPct = () => {
    if (isHabitTimer) {
      const plan = getPlan();
      return plan > 0 ? Math.min(100, (totalSeconds / 60 / plan) * 100) : 0;
    }
    // Focus session: progress as time elapsed
    const total = selectedPlannedMinutes * 60;
    const elapsed = total - focusTimeLeft;
    return total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  };

  const getTotalMinutes = () => {
    if (isHabitTimer) return Math.floor(totalSeconds / 60);
    // For focus session, save the elapsed minutes
    const total = selectedPlannedMinutes * 60;
    const elapsed = total - focusTimeLeft;
    return Math.floor(elapsed / 60) || 1; // At least 1 minute if any time passed
  };

  const handleSave = () => {
    pauseTimer();
    const minutes = getTotalMinutes();
    banner.onSave(minutes);
    closeBanner();
  };

  const handleClose = () => {
    pauseTimer();
    banner.onClose();
    closeBanner();
  };

  const planMinutes = getPlan();
  const progressPct = getProgressPct();
  const displayTime = isFocusSession ? focusFormattedTime : formattedTime;

  return (
    <>
      {!isMinimized && (
        <div className="timer-overlay" onClick={() => setIsMinimized(true)} />
      )}
      <div className={`habit-timer-banner ${isMinimized ? 'minimized' : 'expanded'}`}>
        {isMinimized ? (
          <div className="timer-pill">
            <span className="timer-pill-icon">{getIcon()}</span>
            <span className="timer-pill-time" onClick={() => setIsMinimized(false)}>{displayTime}</span>
            <button
              className="timer-pill-toggle"
              onClick={(e) => { e.stopPropagation(); isRunning ? pauseTimer() : startTimer(); }}
            >
              {isRunning ? '⏸' : '▶'}
            </button>
          </div>
        ) : (
          <div className="timer-content" onClick={e => e.stopPropagation()}>
            <div className="timer-header">
              <span className="timer-habit-name">{getIcon()} {getName()}</span>
              <button className="timer-minimize-btn" onClick={() => setIsMinimized(true)}>╱</button>
            </div>

            <div className="timer-display">
              <span className="timer-digits">{displayTime}</span>
              {isHabitTimer && (banner as HabitTimerBannerData).existingMinutes > 0 && (
                <span className="timer-existing">
                  + накоплено: {Math.floor((banner as HabitTimerBannerData).existingMinutes / 60)}ч {(banner as HabitTimerBannerData).existingMinutes % 60}м
                </span>
              )}
              {isFocusSession && (
                <span className="timer-existing">
                  Фокус-сессия {selectedPlannedMinutes} мин
                </span>
              )}
            </div>

            {isFocusSession && !isRunning && timeLeft === null && (
              <div className="timer-time-chips">
                {TIME_OPTIONS.map(mins => (
                  <button
                    key={mins}
                    className={`timer-chip ${selectedPlannedMinutes === mins ? 'active' : ''}`}
                    onClick={() => setSelectedPlannedMinutes(mins)}
                  >
                    {mins} мин
                  </button>
                ))}
              </div>
            )}

            {planMinutes > 0 && (
              <div className="timer-progress">
                <div className="timer-progress-bar">
                  <div className="timer-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="timer-progress-label">
                  {isHabitTimer
                    ? `${Math.floor(getTotalMinutes() / 60)}ч ${getTotalMinutes() % 60}м / ${Math.floor(planMinutes / 60)}ч план`
                    : `${Math.floor((planMinutes * 60 - focusTimeLeft) / 60)}м прошло / ${planMinutes}м план`}
                </span>
              </div>
            )}

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
              <button className="timer-btn timer-btn-save" onClick={handleSave}>
                💾 Сохранить
              </button>
            </div>
            <button className="timer-close-btn" onClick={handleClose}>
              ✕ Закрыть без сохранения
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ========================================
// Глобальный баннер-таймер
// Живёт в Layout.tsx — не размонтируется при смене страниц
// ========================================

import { useState, useEffect, useRef } from 'react';
import { useBanner } from '../context/BannerContext';
import type { HabitTimerBannerData, FocusSessionBannerData } from '../context/BannerContext';

export default function GlobalTimerBanner() {
  const { banner, closeBanner } = useBanner();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Сброс при смене баннера
  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsMinimized(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [banner?.type, (banner as HabitTimerBannerData | null)?.habit?.id, (banner as HabitTimerBannerData | null)?.day]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!banner) return null;

  const startTimer = () => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
  };

  const resetTimer = () => { pauseTimer(); setElapsedSeconds(0); };

  // Вычисление времени
  const getBaseSeconds = () => {
    if (banner.type === 'habit-timer') return (banner as HabitTimerBannerData).existingMinutes * 60;
    return 0;
  };

  const totalSeconds = getBaseSeconds() + elapsedSeconds;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const formattedTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const totalMinutes = Math.floor(totalSeconds / 60);

  const getName = () => {
    if (banner.type === 'habit-timer') return (banner as HabitTimerBannerData).habit.name;
    return (banner as FocusSessionBannerData).taskName;
  };

  const getIcon = () => banner.type === 'habit-timer' ? '⏱' : '🎯';

  const getPlan = () => {
    if (banner.type === 'habit-timer') {
      const b = banner as HabitTimerBannerData;
      return b.habit.plan > 0 ? b.habit.plan * 60 : 0; // в минутах
    }
    return (banner as FocusSessionBannerData).plannedMinutes;
  };

  const handleSave = () => {
    pauseTimer();
    banner.onSave(totalMinutes);
    closeBanner();
  };

  const handleClose = () => {
    pauseTimer();
    banner.onClose();
    closeBanner();
  };

  const planMinutes = getPlan();
  const progressPct = planMinutes > 0 ? Math.min(100, (totalMinutes / planMinutes) * 100) : 0;

  return (
    <>
      {!isMinimized && (
        <div className="timer-overlay" onClick={() => setIsMinimized(true)} />
      )}
      <div className={`habit-timer-banner ${isMinimized ? 'minimized' : 'expanded'}`}>
        {isMinimized ? (
          <div className="timer-pill">
            <span className="timer-pill-icon">{getIcon()}</span>
            <span className="timer-pill-time" onClick={() => setIsMinimized(false)}>{formattedTime}</span>
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
              <span className="timer-digits">{formattedTime}</span>
              {banner.type === 'habit-timer' && (banner as HabitTimerBannerData).existingMinutes > 0 && (
                <span className="timer-existing">
                  + накоплено: {Math.floor((banner as HabitTimerBannerData).existingMinutes/60)}ч {(banner as HabitTimerBannerData).existingMinutes%60}м
                </span>
              )}
            </div>

            {planMinutes > 0 && (
              <div className="timer-progress">
                <div className="timer-progress-bar">
                  <div className="timer-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="timer-progress-label">
                  {Math.floor(totalMinutes/60)}ч {totalMinutes%60}м / {Math.floor(planMinutes/60)}ч план
                </span>
              </div>
            )}

            <div className="timer-actions">
              <button className="timer-btn timer-btn-reset" onClick={resetTimer} title="Сбросить">⏹</button>
              <button
                className={`timer-btn timer-btn-toggle ${isRunning ? 'running' : ''}`}
                onClick={isRunning ? pauseTimer : startTimer}
              >
                {isRunning ? '⏸ Пауза' : '▶ Старт'}
              </button>
              <button className="timer-btn timer-btn-save" onClick={handleSave}>💾 Сохранить</button>
            </div>
            <button className="timer-close-btn" onClick={handleClose}>✕ Закрыть без сохранения</button>
          </div>
        )}
      </div>
    </>
  );
}

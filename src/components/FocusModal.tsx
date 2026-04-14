import { useState, useEffect, useRef, useCallback } from 'react';
import { Minus } from 'lucide-react';
import type { Task } from '../api/tasks';
import '../styles/tasks.css';

interface FocusModalProps {
  task: Task;
  onClose: () => void;
  onSave: (minutes: number) => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

const TIME_OPTIONS = [5, 15, 25, 45, 60];

// Web Audio API beep
function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Fallback: ignore audio errors
  }
}

export default function FocusModal({ task, onClose, onSave, onMinimize, isMinimized, onTimeUpdate }: FocusModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const totalTime = selectedMinutes * 60;

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          // Notify parent of time update
          onTimeUpdate?.(prev > 0 ? prev - 1 : 0);
          if (prev <= 1) {
            // Timer completed
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsCompleted(true);
            playBeep();
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('⏰ Таймер завершён!', {
                body: `Фокус-сессия "${task.title}" завершена`,
                icon: '/favicon.ico'
              });
            } else {
              // Fallback — alert if no notifications
              setTimeout(() => alert(`⏰ Таймер завершён!\nЗадача: ${task.title}`), 100);
            }
            onSave(selectedMinutes);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, selectedMinutes, onSave]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    // Request notification permission on start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Calculate elapsed time and save partial session
    const elapsedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (elapsedMinutes > 0) {
      onSave(elapsedMinutes);
    }
    onClose();
  };

  const handleTimeSelect = (minutes: number) => {
    if (!isRunning) {
      setSelectedMinutes(minutes);
      setTimeLeft(minutes * 60);
    }
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Return null if minimized (after all hooks!)
  if (isMinimized) return null;

  return (
    <div className="focus-modal-overlay" onClick={onMinimize ?? onClose}>
      <div className="focus-modal" onClick={(e) => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="focus-progress">
          <div 
            className="focus-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <h2 className="focus-title">
          🎯 ФОКУС: <span>{task.title}</span>
        </h2>

        {/* Timer */}
        <div className={`focus-timer ${isCompleted ? 'completed' : ''}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Time chips */}
        {!isRunning && (
          <div className="focus-time-chips">
            {TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                className={`focus-chip ${selectedMinutes === minutes ? 'active' : ''}`}
                onClick={() => handleTimeSelect(minutes)}
              >
                {minutes} мин
              </button>
            ))}
            <div className="focus-custom-input">
              <input
                type="number"
                placeholder="мин"
                min={1} max={180}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                disabled={isRunning}
                style={{ width: 60, textAlign: 'center' }}
              />
              <button
                onClick={() => {
                  const m = parseInt(customMinutes);
                  if (m > 0 && m <= 180) handleTimeSelect(m);
                }}
                disabled={isRunning}
              >
                Ок
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="focus-controls">
          {!isRunning ? (
            <button className="focus-btn focus-btn-start" onClick={handleStart}>
              ▶ СТАРТ
            </button>
          ) : isPaused ? (
            <button className="focus-btn focus-btn-resume" onClick={handleResume}>
              ▶ ПРОДОЛЖИТЬ
            </button>
          ) : (
            <button className="focus-btn focus-btn-pause" onClick={handlePause}>
              ⏸ ПАУЗА
            </button>
          )}
          
          <button className="focus-btn focus-btn-stop" onClick={handleStop}>
            ⏹ СТОП
          </button>
        </div>

        {/* Minimize button */}
        {onMinimize && (
          <button className="focus-minimize" onClick={onMinimize} title="Свернуть">
            <Minus size={16} />
          </button>
        )}

        {/* Close button */}
        <button className="focus-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

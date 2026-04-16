// ========================================
// Таблица привычек — главный компонент сетки
// ========================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { Pencil, Archive, Trash2 } from 'lucide-react';
import type { Habit, HabitRecord } from '../api/habits';
import {
  isHabitDayActive,
  getNextValueAfterTap,
  calculateHabitStats,
  getCellValue,
  getDaysInMonth,
  isWeekend,
} from '../utils/habitUtils';
import { useBanner } from '../context/BannerContext';
import HoursEditModal from './HoursEditModal';
import '../styles/habits.css';

interface HabitTableProps {
  habits: Habit[];
  records: HabitRecord[];
  year: number;
  month: number;
  onCellChange: (habitId: number, day: number, newValue: number) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: number) => void;
  onArchiveHabit: (habitId: number) => void;
  onReorderHabits?: (orderedIds: number[]) => void;
}

export default function HabitTable({
  habits,
  records,
  year,
  month,
  onCellChange,
  onEditHabit,
  onDeleteHabit,
  onArchiveHabit,
  onReorderHabits,
}: HabitTableProps) {
  // ── Mobile detection ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Long press for mobile actions ───────────────────────────────────────────
  const [activeActionRow, setActiveActionRow] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameLongPress = (habitId: number) => {
    longPressTimer.current = setTimeout(() => {
      setActiveActionRow(prev => {
        const newValue = prev === habitId ? null : habitId;
        // Vibration feedback when showing actions
        if (newValue !== null && navigator.vibrate) {
          navigator.vibrate(30);
        }
        return newValue;
      });
    }, 500);
  };

  const handleNamePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // ── Global click handler to close actions when clicking outside ───────────
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // If click is outside any .habit-name-cell.actions-visible
      const activeCell = document.querySelector('.habit-name-cell.actions-visible');
      if (activeCell && !activeCell.contains(target)) {
        setActiveActionRow(null);
      }
    };

    if (activeActionRow !== null) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('touchstart', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeActionRow]);

  // ── Long press for day cells (timer for hours habits) ─────────────────────
  const cellLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCellTouchStart = (habit: Habit, day: number) => {
    cellLongPressTimer.current = setTimeout(() => {
      if (isHabitDayActive(habit, year, month, day, today.getFullYear(), today.getMonth() + 1)) {
        const currentValue = getCellValue(records, habit.id, year, month, day);
        if (habit.unit === 'Часы') {
          // Долгий тап на Часы → HoursEditModal (не таймер)
          setHoursEditModal({
            habitId: habit.id,
            habitName: habit.name,
            day,
            currentValue,
          });
        }
      }
    }, 500);
  };

  const handleCellContextMenu = (e: React.MouseEvent, habit: Habit, day: number) => {
    if (habit.unit !== 'Часы') return;
    e.preventDefault();
    const currentValue = getCellValue(records, habit.id, year, month, day);
    setHoursEditModal({
      habitId: habit.id,
      habitName: habit.name,
      day,
      currentValue,
    });
  };

  const handleCellTouchEnd = () => {
    if (cellLongPressTimer.current) {
      clearTimeout(cellLongPressTimer.current);
      cellLongPressTimer.current = null;
    }
  };

  // ── Global banner ────────────────────────────────────────────────────────
  const { showBanner } = useBanner();

  // ── Hours edit modal ───────────────────────────────────────────────────────
  const [hoursEditModal, setHoursEditModal] = useState<{
    habitId: number;
    habitName: string;
    day: number;
    currentValue: number;
  } | null>(null);

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const draggedIdRef = useRef<number | null>(null);

  // ── Today detection ─────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = today.getDate();

  // ── Days calculation ────────────────────────────────────────────────────
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // ── Scroll to today on mount ────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (isCurrentMonth && scrollRef.current && !hasScrolled.current) {
      const cellWidth = isMobile ? 32 : 36;
      const scrollX = (todayDay - 1) * cellWidth - 100;
      scrollRef.current.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
      hasScrolled.current = true;
    }
  }, [isCurrentMonth, todayDay, isMobile]);

  // Горизонтальный скролл колесиком мыши (только ПК)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Если есть горизонтальная прокрутка колесиком — игнорируй
      if (e.deltaX !== 0) return;
      // Если Shift зажат — браузер сам скроллит горизонтально
      if (e.shiftKey) return;

      // Конвертируем вертикальный скролл в горизонтальный
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2.5, behavior: 'auto' });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCellClick = (habit: Habit, day: number) => {
    if (!isHabitDayActive(habit, year, month, day, today.getFullYear(), today.getMonth() + 1)) return;

    // Для привычек с unit='Часы' — клик добавляет +1ч (долгий тап открывает таймер)
    if (habit.unit === 'Часы') {
      const currentValue = getCellValue(records, habit.id, year, month, day);
      // На мобиле — клик добавляет +1 (долгий тап обработан отдельно)
      // На десктопе — клик добавляет +1
      const nextValue = currentValue > 0 ? currentValue + 1 : 1;
      setTimeout(() => onCellChange(habit.id, day, nextValue), 0);
      return;
    }

    const currentValue = getCellValue(records, habit.id, year, month, day);
    const nextValue = getNextValueAfterTap(habit, currentValue);

    // Освобождаем поток перед async операцией
    setTimeout(() => onCellChange(habit.id, day, nextValue), 0);
  };

  const handleNameClick = (e: React.MouseEvent, habit: Habit) => {
    // На десктопе — сразу редактирование
    if (!isMobile) {
      onEditHabit(habit);
      return;
    }
    // На мобиле — если actions не видны, просто скрываем другие
    if (activeActionRow !== habit.id) {
      setActiveActionRow(null);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────
  const getDayOfWeekShort = (day: number): string => {
    const date = new Date(year, month - 1, day);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[date.getDay()];
  };

  const formatCellValue = (habit: Habit, value: number): string => {
    if (value <= 0) return '';
    if (habit.unit === 'Дни') return '✓';
    if (habit.unit === 'Часы') {
      return value % 1 === 0 ? String(value) : value.toFixed(1);
    }
    return String(value);
  };

  const isDayToday = (day: number) => isCurrentMonth && day === todayDay;

  // ── Render ──────────────────────────────────────────────────────────────
  if (habits.length === 0) {
    return (
      <div className="habits-empty">
        <span>Нет привычек</span>
      </div>
    );
  }

  return (
    <div className={`habit-table-wrapper ${isMobile ? 'mobile' : ''}`}>
      <div className="habit-table">
        {/* ── LEFT COLUMN (sticky) ── */}
        <div className="habit-col-left">
          <div className="habit-header-cell habit-header-name">
            <span>Привычка</span>
          </div>
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`habit-row-cell habit-name-cell ${activeActionRow === habit.id ? 'actions-visible' : ''} ${dragOverId === habit.id ? 'drag-over' : ''}`}
              onClick={(e) => handleNameClick(e, habit)}
              onTouchStart={() => handleNameLongPress(habit.id)}
              onTouchEnd={handleNamePressEnd}
              onMouseLeave={() => { if (isMobile) setActiveActionRow(null); }}
              draggable={!!onReorderHabits && !isMobile}
              onDragStart={() => { draggedIdRef.current = habit.id; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(habit.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={() => {
                if (!draggedIdRef.current || draggedIdRef.current === habit.id || !onReorderHabits) return;
                const ids = habits.map(h => h.id);
                const from = ids.indexOf(draggedIdRef.current);
                const to = ids.indexOf(habit.id);
                const reordered = [...ids];
                reordered.splice(from, 1);
                reordered.splice(to, 0, draggedIdRef.current);
                onReorderHabits(reordered);
                draggedIdRef.current = null;
                setDragOverId(null);
              }}
              style={{ cursor: onReorderHabits && !isMobile ? 'grab' : undefined }}
            >
              <div className="habit-name-content">
                <span className="habit-target-icon">
                  {habit.targetType === 'daily' ? '⏳' : '📅'}
                </span>
                <span className="habit-name-text" title={habit.name}>
                  {habit.name}
                </span>
              </div>
              <div className="habit-actions" onClick={(e) => e.stopPropagation()}>
                {/* Таймер — первым, только для Часы */}
                {!isMobile && habit.unit === 'Часы' && (
                  <button
                    className="habit-btn habit-btn-timer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetDay = isCurrentMonth ? todayDay : 1;
                      const existingValue = getCellValue(records, habit.id, year, month, targetDay);
                      showBanner({
                        type: 'habit-timer',
                        habit: { id: habit.id, name: habit.name, plan: habit.plan, unit: habit.unit },
                        day: targetDay,
                        existingMinutes: existingValue,
                        onSave: (totalMinutes) => { onCellChange(habit.id, targetDay, totalMinutes); },
                        onClose: () => {},
                      });
                    }}
                    title="Запустить таймер на сегодня"
                  >
                    ⏱
                  </button>
                )}
                <button
                  className="habit-btn habit-btn-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditHabit(habit);
                  }}
                  title="Редактировать"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="habit-btn habit-btn-archive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveHabit(habit.id);
                  }}
                  title="Архивировать"
                >
                  <Archive size={14} />
                </button>
                <button
                  className="habit-btn habit-btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHabit(habit.id);
                  }}
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── CENTER SCROLLABLE (days) ── */}
        <div className="habit-col-center" ref={scrollRef}>
          <div className="habit-days-header">
            <div className="habit-header-cell habit-header-unit">Ед.</div>
            <div className="habit-header-cell habit-header-plan">План</div>
            {days.map((day) => {
              const weekend = isWeekend(year, month, day);
              const isToday = isDayToday(day);
              return (
                <div
                  key={day}
                  className={`habit-day-header ${weekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                >
                  <span className="habit-day-number">{day}</span>
                  <span className="habit-day-weekday">{getDayOfWeekShort(day)}</span>
                </div>
              );
            })}
          </div>

          {habits.map((habit) => (
            <div key={habit.id} className="habit-days-row">
              <div className="habit-row-cell habit-cell-unit">{habit.unit}</div>
              <div className="habit-row-cell habit-cell-plan">{habit.plan}</div>
              {days.map((day) => {
                const active = isHabitDayActive(habit, year, month, day, today.getFullYear(), today.getMonth() + 1);
                const value = getCellValue(records, habit.id, year, month, day);
                const weekend = isWeekend(year, month, day);
                const isToday = isDayToday(day);
                const displayValue = formatCellValue(habit, value);

                if (!active) {
                  return (
                    <div
                      key={day}
                      className={`habit-day-cell inactive ${weekend ? 'weekend' : ''}`}
                    >
                      <span className="habit-cell-inactive-mark">✕</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={day}
                    className={`habit-day-cell ${weekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${value > 0 ? 'filled' : ''}`}
                    onClick={() => handleCellClick(habit, day)}
                    onTouchStart={() => handleCellTouchStart(habit, day)}
                    onTouchEnd={handleCellTouchEnd}
                    onTouchMove={handleCellTouchEnd}
                    onContextMenu={(e) => handleCellContextMenu(e, habit, day)}
                    title={active ? `Клик для изменения${value > 0 ? ` (${value})` : ''}` : 'Неактивный день'}
                  >
                    <span className="habit-cell-value">{displayValue}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

      </div>

      {hoursEditModal && (
        <HoursEditModal
          habitName={hoursEditModal.habitName}
          day={hoursEditModal.day}
          currentValue={hoursEditModal.currentValue}
          onSave={(val) => {
            onCellChange(hoursEditModal.habitId, hoursEditModal.day, val);
            setHoursEditModal(null);
          }}
          onClose={() => setHoursEditModal(null)}
        />
      )}
    </div>
  );
}

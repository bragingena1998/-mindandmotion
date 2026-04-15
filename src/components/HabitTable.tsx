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
  optimisticUpdateRecords,
} from '../utils/habitUtils';
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

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCellClick = (habit: Habit, day: number) => {
    if (!isHabitDayActive(habit, year, month, day)) return;

    const currentValue = getCellValue(records, habit.id, year, month, day);
    const nextValue = getNextValueAfterTap(habit, currentValue);
    onCellChange(habit.id, day, nextValue);
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
            <div key={habit.id} className="habit-row-cell habit-name-cell">
              <div className="habit-name-content">
                <span className="habit-target-icon">
                  {habit.targetType === 'daily' ? '⏳' : '📅'}
                </span>
                <span className="habit-name-text" title={habit.name}>
                  {habit.name}
                </span>
              </div>
              <div className="habit-actions">
                <button
                  className="habit-btn habit-btn-edit"
                  onClick={() => onEditHabit(habit)}
                  title="Редактировать"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="habit-btn habit-btn-archive"
                  onClick={() => onArchiveHabit(habit.id)}
                  title="Архивировать"
                >
                  <Archive size={14} />
                </button>
                <button
                  className="habit-btn habit-btn-delete"
                  onClick={() => onDeleteHabit(habit.id)}
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
                const active = isHabitDayActive(habit, year, month, day);
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
                    title={active ? `Клик для изменения${value > 0 ? ` (${value})` : ''}` : 'Неактивный день'}
                  >
                    <span className="habit-cell-value">{displayValue}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── RIGHT COLUMN (sticky) ── */}
        <div className="habit-col-right">
          <div className="habit-header-stats">
            <span>Итог</span>
            <span>%</span>
          </div>
          {habits.map((habit) => {
            const stats = calculateHabitStats(habit, records, year, month);
            return (
              <div key={habit.id} className="habit-stats-row">
                <span className="habit-stat-total">{stats.total}</span>
                <span className="habit-stat-percent">{stats.percent}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

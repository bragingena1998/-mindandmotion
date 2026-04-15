// ========================================
// Страница "Привычки" — таблица отслеживания привычек
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Habit,
  HabitRecord,
  fetchHabits,
  fetchHabitRecords,
  createHabitRecord,
  deleteHabitRecord,
  deleteHabit,
  archiveHabit,
} from '../api/habits';
import HabitTable from '../components/HabitTable';
import HabitModal from '../components/HabitModal';
import HabitTrendChart from '../components/HabitTrendChart';
import { optimisticUpdateRecords, getCellValue, isHabitDayActive, calculateHabitStats } from '../utils/habitUtils';
import '../styles/habits.css';

// Названия месяцев по-русски
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function Habits() {
  // ── State ────────────────────────────────────────────────────────────────
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<HabitRecord[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ── Mobile detection ────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────
  const loadHabits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [habitsData, recordsData] = await Promise.all([
        fetchHabits(year, month),
        fetchHabitRecords(year, month),
      ]);
      setHabits(habitsData);
      setRecords(recordsData);
    } catch (err) {
      setError('Ошибка загрузки привычек');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // ── Today's stats ───────────────────────────────────────────────────────
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = today.getDate();

  const todayStats = isCurrentMonth
    ? {
        completed: habits.filter(h => {
          const value = getCellValue(records, h.id, year, month, todayDay);
          return value > 0;
        }).length,
        total: habits.length,
      }
    : null;

  // ── Progress bars data ────────────────────────────────────────────────
  // Возраст streak для каждой привычки (дней подряд до сегодня)
  const getStreakDays = (habit: Habit): number => {
    const d = today.getDate();
    let streak = 0;
    for (let i = d; i >= 1; i--) {
      if (!isHabitDayActive(habit, year, month, i)) continue;
      const val = getCellValue(records, habit.id, year, month, i);
      if (val > 0) streak++;
      else break;
    }
    return streak;
  };

  const habitsWithStats = habits.map(h => {
    const { percent, total } = calculateHabitStats(h, records, year, month);
    return { ...h, percent, total, streak: getStreakDays(h) };
  });

  // ── Trend chart data ────────────────────────────────────────────────────
  const getTrendData = () => {
    const isCurrentMo = today.getFullYear() === year && today.getMonth() + 1 === month;
    const lastDay = isCurrentMo ? today.getDate() : new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      // Привычки которые АКТИВНЫ в этот день
      const activeHabits = habits.filter(h => isHabitDayActive(h, year, month, day));
      if (activeHabits.length === 0) return { day, pct: 0, hasPlan: false };
      const completed = activeHabits.filter(h => getCellValue(records, h.id, year, month, day) > 0).length;
      return {
        day,
        pct: Math.round((completed / activeHabits.length) * 100),
        hasPlan: true,
      };
    });
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  // Оптимистичное обновление ячейки
  const handleCellChange = async (habitId: number, day: number, newValue: number) => {
    // 1. Сразу обновляем локальный state
    setRecords(prev => optimisticUpdateRecords(prev, habitId, year, month, day, newValue));

    try {
      if (newValue > 0) {
        await createHabitRecord(habitId, year, month, day, newValue);
      } else {
        await deleteHabitRecord(habitId, year, month, day);
      }
      // НЕ делаем loadHabits() — оптимистика достаточна
    } catch (err) {
      // Откат при ошибке
      await loadHabits();
      console.error('Ошибка обновления ячейки:', err);
    }
  };

  const handleAddHabit = () => {
    setEditingHabit(null);
    setShowHabitModal(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setShowHabitModal(true);
  };

  const handleDeleteHabit = async (habitId: number) => {
    if (!confirm('Удалить привычку?')) return;
    await deleteHabit(habitId, year, month);
    await loadHabits();
  };

  const handleArchiveHabit = async (habitId: number) => {
    if (!confirm('Архивировать привычку на этот месяц?')) return;
    await archiveHabit(habitId, year, month);
    await loadHabits();
  };

  // TODO: реальная модалка
  const handleModalSave = async () => {
    setShowHabitModal(false);
    await loadHabits();
  };

  // ── Month navigation ────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="habits-page">
      {/* Header */}
      <div className="habits-header">
        <h1 className="habits-title">Привычки</h1>
        <button className="habits-add-btn" onClick={handleAddHabit}>
          <Plus size={18} />
          <span>Добавить</span>
        </button>
      </div>

      {/* Month Navigator */}
      <div className="month-navigator">
        <button className="month-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <span className="month-label">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button className="month-nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Today's Stats */}
      {todayStats && (
        <div className="habits-stats-today">
          <span className="stats-label">Сегодня:</span>
          <span className="stats-value">
            {todayStats.completed} из {todayStats.total}
          </span>
          <span className="stats-suffix">
            {todayStats.total === 1 ? 'привычки' : 'привычек'} выполнено
          </span>
          {todayStats.total > 0 && (
            <span className="stats-percent">
              {Math.round((todayStats.completed / todayStats.total) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bars */}
      {!loading && !error && habits.length > 0 && (
        <div className="habits-progress-bars">
          {habitsWithStats.map(h => (
            <div key={h.id} className="habit-bar-row">
              <div className="habit-bar-meta">
                <span className="habit-bar-name">{h.name}</span>
                <div className="habit-bar-badges">
                  {h.streak > 0 && (
                    <span className="habit-streak-badge">🔥 {h.streak}д</span>
                  )}
                  <span className="habit-bar-pct">{h.percent}%</span>
                </div>
              </div>
              <div className="habit-bar-track">
                <div
                  className="habit-bar-fill"
                  style={{ width: `${h.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content States */}
      {loading && (
        <div className="habits-loading">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}

      {error && (
        <div className="habits-error">
          <span>{error}</span>
          <button onClick={loadHabits}>Повторить</button>
        </div>
      )}

      {!loading && !error && habits.length === 0 && (
        <div className="habits-empty-state">
          <span>Нет привычек</span>
          <span className="habits-empty-hint">Добавьте первую!</span>
          <button className="habits-add-btn" onClick={handleAddHabit}>
            <Plus size={18} />
            <span>Добавить привычку</span>
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && habits.length > 0 && (
        <HabitTable
          habits={habits}
          records={records}
          year={year}
          month={month}
          onCellChange={handleCellChange}
          onEditHabit={handleEditHabit}
          onDeleteHabit={handleDeleteHabit}
          onArchiveHabit={handleArchiveHabit}
        />
      )}

      {/* Trend Chart */}
      {!loading && !error && habits.length > 0 && (
        <HabitTrendChart
          data={getTrendData()}
          month={month}
          year={year}
        />
      )}

      {/* Modal */}
      {showHabitModal && (
        <HabitModal
          habit={editingHabit}
          year={year}
          month={month}
          isMobile={isMobile}
          onClose={() => setShowHabitModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

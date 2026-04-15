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
import { optimisticUpdateRecords, getCellValue } from '../utils/habitUtils';
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

      {/* Modal Placeholder */}
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

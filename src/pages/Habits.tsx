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
  reorderHabitsByIds,
} from '../api/habits';
import HabitTable from '../components/HabitTable';
import HabitModal from '../components/HabitModal';
import HabitTrendChart from '../components/HabitTrendChart';
import ConfirmModal from '../components/ConfirmModal';
import DeleteModal from '../components/DeleteModal';
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
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [archivingHabit, setArchivingHabit] = useState<Habit | null>(null);
  const [barMode, setBarMode] = useState<'percent' | 'amount'>('percent');

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

  // ── Progress bars data ────────────────────────────────────────────────
  // Возраст streak для каждой привычки (дней подряд до сегодня)
  const getStreakDays = (habit: Habit): number => {
    const d = today.getDate();
    let streak = 0;
    for (let i = d; i >= 1; i--) {
      if (!isHabitDayActive(habit, year, month, i, today.getFullYear(), today.getMonth() + 1)) continue;
      const val = getCellValue(records, habit.id, year, month, i);
      if (val > 0) streak++;
      else break;
    }
    return streak;
  };

  const habitsWithStats = habits.map(h => {
    const { percent, total, activeDays } = calculateHabitStats(h, records, year, month);
    const streak = getStreakDays(h);
    const completedToday = isCurrentMonth
      ? getCellValue(records, h.id, year, month, todayDay) > 0
      : false;
    const activeToday = isCurrentMonth
      ? isHabitDayActive(h, year, month, todayDay, today.getFullYear(), today.getMonth() + 1)
      : false;

    // Метка для режима "кол-во" — зависит от unit и targetType
    let amountLabel = '';
    const plan = h.plan || 1;

    if (h.unit === 'Дни') {
      // Дни: "9 дн / 15 дн" (из активных дней)
      const doneCount = records.filter(
        r => r.habitId === h.id && r.year === year && r.month === month && r.value > 0
      ).length;
      amountLabel = h.targetType === 'daily'
        ? `${doneCount} / ${activeDays} дн`
        : `${doneCount} дн`;
    } else if (h.unit === 'Часы') {
      // Часы: "27.6 ч / 70 ч"
      const planTotal = h.targetType === 'daily' ? plan * activeDays : plan;
      amountLabel = `${total % 1 === 0 ? total : total.toFixed(1)} / ${planTotal} ч`;
    } else {
      // Кол-во и прочие: "250 / 1550 шт" или "250 / 50"
      const planTotal = h.targetType === 'daily' ? plan * activeDays : plan;
      const unitSuffix = h.unit && h.unit !== 'Кол-во' ? ` ${h.unit}` : '';
      amountLabel = `${total} / ${planTotal}${unitSuffix}`;
    }

    return { ...h, percent, total, activeDays, streak, completedToday, activeToday, amountLabel };
  });

  // Сводка за сегодня
  const todaySummary = isCurrentMonth ? {
    completed: habitsWithStats.filter(h => h.completedToday).length,
    total: habitsWithStats.filter(h => h.activeToday).length,
  } : null;

  // ── Trend chart data ────────────────────────────────────────────────────
  const getTrendData = () => {
    const isCurrentMo = today.getFullYear() === year && today.getMonth() + 1 === month;
    const lastDay = isCurrentMo ? today.getDate() : new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      // Привычки которые АКТИВНЫ в этот день
      const activeHabits = habits.filter(h => isHabitDayActive(h, year, month, day, today.getFullYear(), today.getMonth() + 1));
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
      console.error('Failed to save cell change:', err);
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

  const handleDeleteHabit = (habitId: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) setDeletingHabit(habit);
  };
  const handleArchiveHabit = (habitId: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) setArchivingHabit(habit);
  };
  const handleReorderHabits = async (orderedIds: number[]) => {
    // Оптимистично обновляем локальный порядок
    setHabits(prev => orderedIds.map(id => prev.find(h => h.id === id)!).filter(Boolean));
    // Сохраняем на сервер
    try {
      await reorderHabitsByIds(orderedIds);
    } catch {
      await loadHabits(); // откат
    }
  };
  const confirmDeleteHabit = async () => {
    if (!deletingHabit) return;
    await deleteHabit(deletingHabit.id, year, month);
    setDeletingHabit(null);
    await loadHabits();
  };
  const confirmArchiveHabit = async () => {
    if (!archivingHabit) return;
    await archiveHabit(archivingHabit.id, year, month);
    setArchivingHabit(null);
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
      {/* Month Navigator — compact with add button */}
      <div className="month-navigator compact">
        <button className="month-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="month-label">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button className="month-nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={16} />
        </button>
        <div className="month-nav-spacer" />
        <button className="habits-add-btn-compact" onClick={handleAddHabit}>
          <Plus size={14} />
          <span>Добавить</span>
        </button>
      </div>

      {/* Today Card */}
      {!loading && !error && habits.length > 0 && (
        <div className="habits-today-card">

          {/* Заголовок: X/Y и % */}
          {todaySummary && (
            <div className="htc-header">
              <div className="htc-header-left">
                <div className="htc-count">
                  <span className="htc-count-done">{todaySummary.completed}</span>
                  <span className="htc-count-sep">/</span>
                  <span className="htc-count-total">{todaySummary.total}</span>
                </div>
                <span className="htc-label">сегодня</span>
              </div>
              <div className="htc-header-right">
                <span
                  className="htc-pct clickable"
                  onClick={() => setBarMode(m => m === 'percent' ? 'amount' : 'percent')}
                  title="Нажми чтобы переключить % / кол-во"
                >
                  {todaySummary.total > 0
                    ? Math.round((todaySummary.completed / todaySummary.total) * 100)
                    : 0}%
                  <span className="htc-pct-hint">
                    {barMode === 'percent' ? '↕ 123' : '↕ %'}
                  </span>
                </span>
                <span className="htc-motivation">
                  {(() => {
                    const p = todaySummary.total > 0
                      ? Math.round((todaySummary.completed / todaySummary.total) * 100) : 0;
                    if (p === 100) return '🏆 ИДЕАЛЬНО!';
                    if (p >= 80)  return '💪 МОЩНЫЙ ТЕМП!';
                    if (p >= 50)  return '⚡ НА ХОДУ!';
                    if (p > 0)    return '🚀 НАЧАЛО!';
                    return '☕ НАЧИНАЕМ!';
                  })()}
                </span>
              </div>
            </div>
          )}


          {/* Бары привычек */}
          <div className="htc-bars">
            {habitsWithStats.map(h => (
              <div
                key={h.id}
                className={[
                  'htc-bar-item',
                  h.completedToday ? 'done' : '',
                  h.activeToday ? 'active-today' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="htc-bar-top">
                  <span className="htc-bar-icon">
                    {h.targetType === 'daily' ? '⏳' : '📅'}
                  </span>
                  <span className="htc-bar-name">{h.name}</span>
                  <div className="htc-bar-right">
                    {h.streak >= 2 && (
                      <span className="htc-streak">🔥 {h.streak}</span>
                    )}
                    <span className="htc-bar-value">
                      {barMode === 'percent'
                        ? `${h.percent}%`
                        : h.amountLabel
                      }
                    </span>
                  </div>
                </div>
                <div className="htc-bar-track">
                  <div
                    className="htc-bar-fill"
                    style={{ width: `${h.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

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
          onReorderHabits={handleReorderHabits}
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

      {/* Модалка удаления привычки */}
      {deletingHabit && (
        <DeleteModal
          itemName={deletingHabit.name}
          onConfirm={async () => {
            await deleteHabit(deletingHabit.id, year, month);
            await loadHabits();
            setDeletingHabit(null);
          }}
          onCancel={() => setDeletingHabit(null)}
        />
      )}

      {/* Модалка архивации привычки */}
      {archivingHabit && (
        <ConfirmModal
          title="Архивировать привычку?"
          message={`«${archivingHabit.name}» будет скрыта из активных для этого месяца`}
          confirmLabel="Архивировать"
          cancelLabel="Отмена"
          icon="📦"
          onConfirm={confirmArchiveHabit}
          onCancel={() => setArchivingHabit(null)}
        />
      )}
    </div>
  );
}

/**
 * Логика «активен ли день для привычки» — как в HabitTable.isDayActive
 */
export function isHabitDayActive(habit, year, month, day) {
  const date = new Date(year, month - 1, day);
  if (habit.start_date) {
    const start = new Date(habit.start_date);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (habit.end_date) {
    const end = new Date(habit.end_date);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  let days = habit.days_of_week;
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch {
      days = [];
    }
  }
  if (Array.isArray(days) && days.length > 0) {
    if (!days.includes(date.getDay())) return false;
  }
  return true;
}

export function getHabitRecordValue(records, habitId, day) {
  if (!records || !Array.isArray(records)) return 0;
  const record = records.find((r) => Number(r.habitid) === Number(habitId) && Number(r.day) === Number(day));
  if (!record) return 0;
  const v = record.value;
  if (v === '✓' || v === 'v') return 1;
  return parseFloat(v) || 0;
}

/**
 * Одно нажатие по ячейке дня — как HabitTable.handleCellTap
 */
export function getNextValueAfterTap(habit, currentValue) {
  if (habit.unit === 'Дни') {
    return currentValue ? 0 : 1;
  }
  if (habit.unit === 'Часы') {
    return (currentValue || 0) + 1;
  }
  if (habit.target_type === 'daily') {
    const plan = habit.plan || 1;
    return currentValue >= plan ? 0 : plan;
  }
  return (currentValue || 0) + 1;
}

export function isHabitDoneForValue(habit, value) {
  if (!value || value <= 0) return false;
  if (habit.unit === 'Дни') return true;
  if (habit.target_type === 'daily') {
    const plan = habit.plan || 1;
    return value >= plan;
  }
  return true;
}

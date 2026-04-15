// ========================================
// Утилиты для работы с привычками (чистые функции)
// ========================================

import { Habit, HabitRecord } from '../api/habits';

/**
 * Проверяет, активен ли данный день для привычки
 * (учитывает start_date, end_date, daysOfWeek)
 */
export function isHabitDayActive(
  habit: Habit,
  year: number,
  month: number,
  day: number
): boolean {
  const date = new Date(year, month - 1, day);

  // Проверка start_date
  if (habit.startDate) {
    const start = new Date(habit.startDate);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }

  // Проверка end_date
  if (habit.endDate) {
    const end = new Date(habit.endDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }

  // Проверка daysOfWeek
  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
    const dayOfWeek = date.getDay(); // 0=Вс, 1=Пн, ...
    if (!habit.daysOfWeek.includes(dayOfWeek)) return false;
  }

  return true;
}

/**
 * Возвращает следующее значение после тапа по ячейке
 * (логика зависит от unit и targetType)
 */
export function getNextValueAfterTap(habit: Habit, currentValue: number): number {
  // 'Дни' — toggle 0/1
  if (habit.unit === 'Дни') {
    return currentValue > 0 ? 0 : 1;
  }

  // 'Часы' — инкремент +1
  if (habit.unit === 'Часы') {
    return currentValue + 1;
  }

  // Остальные unit
  if (habit.targetType === 'daily') {
    // Дневная цель — toggle 0/plan
    const plan = habit.plan || 1;
    return currentValue >= plan ? 0 : plan;
  } else {
    // Период/месяц — инкремент +1
    return currentValue + 1;
  }
}

/**
 * Считает статистику привычки за месяц
 * @returns { total, percent, activeDays }
 */
export function calculateHabitStats(
  habit: Habit,
  records: HabitRecord[],
  year: number,
  month: number
): { total: number; percent: number; activeDays: number } {
  const daysInMonth = getDaysInMonth(year, month);

  // Считаем активные дни
  let activeDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isHabitDayActive(habit, year, month, d)) {
      activeDays++;
    }
  }

  // Суммируем value из records для этой привычки
  const total = records
    .filter(r => r.habitId === habit.id && r.year === year && r.month === month)
    .reduce((sum, r) => sum + r.value, 0);

  // Считаем процент
  let percent = 0;
  const plan = habit.plan || 1;

  if (habit.targetType === 'daily') {
    const totalGoal = plan * activeDays;
    percent = totalGoal > 0 ? Math.min(100, Math.round((total / totalGoal) * 100)) : 0;
  } else {
    // period / monthly
    percent = plan > 0 ? Math.min(100, Math.round((total / plan) * 100)) : 0;
  }

  return { total, percent, activeDays };
}

/**
 * Получает текущее значение ячейки из массива records
 */
export function getCellValue(
  records: HabitRecord[],
  habitId: number,
  year: number,
  month: number,
  day: number
): number {
  const record = records.find(
    r => r.habitId === habitId && r.year === year && r.month === month && r.day === day
  );
  return record?.value ?? 0;
}

/**
 * Возвращает количество дней в месяце
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Проверяет, является ли день выходным (суббота или воскресенье)
 */
export function isWeekend(year: number, month: number, day: number): boolean {
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Иммутабельное обновление массива records (оптимистичное)
 * - newValue > 0: добавить/заменить запись
 * - newValue === 0: удалить запись
 */
export function optimisticUpdateRecords(
  records: HabitRecord[],
  habitId: number,
  year: number,
  month: number,
  day: number,
  newValue: number
): HabitRecord[] {
  // Фильтруем существующую запись (если есть)
  const filtered = records.filter(
    r => !(r.habitId === habitId && r.year === year && r.month === month && r.day === day)
  );

  // Если новое значение > 0 — добавляем запись
  if (newValue > 0) {
    return [...filtered, { habitId, year, month, day, value: newValue }];
  }

  // Если 0 — просто возвращаем отфильтрованный массив (удаление)
  return filtered;
}

/** Статистика «день» по тем же правилам, что диапазон дата–дедлайн */

export const isoDate = (d) => (d || '').toString().split('T')[0];

/**
 * Невыполненные задачи в плане на сегодня (сегодня ∈ [start, end] ИЛИ просрочены).
 */
export function countUnfinishedPlanForToday(tasks) {
  const today = new Date().toISOString().split('T')[0];
  let n = 0;
  for (const t of tasks) {
    if (t.done || t.completed) continue;
    const start = isoDate(t.date);
    if (!start) continue;
    const end = isoDate(t.deadline || t.date);
    const inRange = today >= start && today <= end;
    const overdue = end < today;
    if (inRange || overdue) n += 1;
  }
  return n;
}

/**
 * Задачи в плане на сегодня (только задачи со статусом 'today' и 'overdue').
 */
export function countTodayPlanTotal(tasks) {
  const today = new Date().toISOString().split('T')[0];
  let n = 0;
  for (const t of tasks) {
    if (t.done || t.completed) continue;
    const start = isoDate(t.date);
    if (!start) continue;
    const end = isoDate(t.deadline || t.date);
    const inRange = today >= start && today <= end;
    const overdue = end < today;
    // Считаем только задачи, которые сегодня активны (inRange) или просрочены (overdue)
    if (inRange || overdue) n += 1;
  }
  return n;
}

/**
 * Выполнено сегодня (по doneDate).
 */
export function countCompletedToday(tasks) {
  const today = new Date().toISOString().split('T')[0];
  let n = 0;
  for (const t of tasks) {
    if (!t.done && !t.completed) continue;
    const dd = isoDate(t.doneDate || t.done_date);
    if (dd === today) n += 1;
  }
  return n;
}

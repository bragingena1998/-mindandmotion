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
 * Знаменатель X/Y для «дня»:
 * — если сегодня попадает в [date … deadline]: считаем **все** такие задачи (и выполненные тоже),
 *   чтобы после галочки не было 1/2 вместо 1/3;
 * — просрочка (end < сегодня): считаем **только невыполненные**, иначе в Y попадают старые
 *   уже закрытые задачи и цифра раздувается (типа 5/23).
 */
export function countTodayPlanTotal(tasks) {
  const today = new Date().toISOString().split('T')[0];
  let n = 0;
  for (const t of tasks) {
    const start = isoDate(t.date);
    if (!start) continue;
    const end = isoDate(t.deadline || t.date);
    const inRange = today >= start && today <= end;
    const overdue = end < today;
    const done = !!(t.done || t.completed);
    if (inRange) {
      n += 1;
    } else if (overdue && !done) {
      n += 1;
    }
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

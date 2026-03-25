/** Статистика «день» по тем же правилам, что диапазон дата–дедлайн */

export const isoDate = (d) => (d || '').toString().split('T')[0];

const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

/**
 * Невыполненные задачи в плане на сегодня (сегодня ∈ [start, end] ИЛИ просрочены).
 */
export function countUnfinishedPlanForToday(tasks) {
  const today = getLocalToday();
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
 * Всего задач на сегодня (план): сегодня ∈ [start, end] ИЛИ просрочена (незавершённая).
 * Выполненные задачи прошлых дней НЕ считаются.
 */
export function countTodayPlanTotal(tasks) {
  const today = getLocalToday();
  let n = 0;
  for (const t of tasks) {
    const start = isoDate(t.date);
    if (!start) continue;
    const end = isoDate(t.deadline || t.date);
    const inRange = today >= start && today <= end;
    // Просроченная считается только если НЕ выполнена
    const overdue = end < today && !(t.done || t.completed);
    if (inRange || overdue) n += 1;
  }
  return n;
}

/**
 * Выполнено сегодня (по doneDate).
 */
export function countCompletedToday(tasks) {
  const today = getLocalToday();
  let n = 0;
  for (const t of tasks) {
    if (!t.done && !t.completed) continue;
    const dd = isoDate(t.doneDate || t.done_date);
    if (dd === today) n += 1;
  }
  return n;
}

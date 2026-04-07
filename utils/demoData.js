const pool = require('../db');

const dayMs = 24 * 60 * 60 * 1000;
const toDate = (date) => date.toISOString().split('T')[0];

const getDemoTasks = () => {
  const today = new Date();
  const yesterday = new Date(Date.now() - dayMs);
  const tomorrow = new Date(Date.now() + dayMs);
  const inThreeDays = new Date(Date.now() + dayMs * 3);

  return [
    {
      title: 'Пить воду в течение дня',
      date: toDate(today),
      time: '09:00',
      priority: 2,
      comment: 'Цель: 8 стаканов за день',
      done: 0,
      deadline: toDate(today),
      done_date: null,
    },
    {
      title: '20 минут чтения книги',
      date: toDate(today),
      time: '21:00',
      priority: 2,
      comment: 'Подойдет любая книга из списка',
      done: 0,
      deadline: null,
      done_date: null,
    },
    {
      title: 'Тренировка: отжимания',
      date: toDate(yesterday),
      time: '19:00',
      priority: 1,
      comment: '3 подхода по 10 повторений',
      done: 0,
      deadline: toDate(yesterday),
      done_date: null,
    },
    {
      title: 'Разобрать задачи по проекту',
      date: toDate(tomorrow),
      time: '11:30',
      priority: 1,
      comment: 'Собрать приоритеты и сроки',
      done: 0,
      deadline: toDate(inThreeDays),
      done_date: null,
    },
    {
      title: 'Прогулка 3 км',
      date: toDate(today),
      time: '07:30',
      priority: 3,
      comment: 'Спокойный темп, без спешки',
      done: 1,
      deadline: null,
      done_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
    {
      title: 'Проверить почту и календарь',
      date: toDate(tomorrow),
      time: '08:30',
      priority: 3,
      comment: 'План на день и новые события',
      done: 0,
      deadline: null,
      done_date: null,
    },
  ];
};

const demoHabits = [
  { name: 'Пить воду', unit: 'Кол-во', plan: 8, target_type: 'daily' },
  { name: 'Отжимания', unit: 'Кол-во', plan: 30, target_type: 'daily' },
  { name: 'Чтение книги', unit: 'Часы', plan: 1, target_type: 'daily' },
  { name: 'Ведение проекта', unit: 'Часы', plan: 8, target_type: 'period' },
  { name: 'Прогулка', unit: 'Дни', plan: 1, target_type: 'daily' },
  { name: 'Тренировки за неделю', unit: 'Дни', plan: 4, target_type: 'period' },
];

const demoEvents = [
  { name: 'День рождения мамы', type: 'birthday', day: 15, month: 4, year: 1975, notify_before: 3 },
  { name: 'День рождения друга', type: 'birthday', day: 22, month: 5, year: 1990, notify_before: 2 },
  { name: 'Встреча по личному проекту', type: 'event', day: 12, month: 9, year: null, notify_before: 1 },
  { name: 'Годовщина работы', type: 'important', day: 1, month: 3, year: 2020, notify_before: 7 },
  { name: 'Отпуск', type: 'event', day: 10, month: 7, year: 2026, notify_before: 14 },
];

const DEMO_TASK_TITLES = getDemoTasks().map(t => t.title);
const DEMO_HABIT_NAMES = demoHabits.map(h => h.name);
const DEMO_EVENT_NAMES = demoEvents.map(e => e.name);

async function createHabitRecords(userId, habits) {
  const today = new Date();

  for (const habit of habits) {
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(today.getTime() - i * dayMs);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();

      const progressRatio = 0.35 + (i % 4) * 0.15;
      const rawValue = habit.plan * progressRatio;
      const value = Math.max(1, Math.round(rawValue));

      await pool.query(
        `INSERT INTO habit_records (user_id, habit_id, year, month, day, value)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
        [userId, habit.id, year, month, day, value]
      );
    }
  }
}

async function createDemoData(userId) {
  try {
    const [[taskCount]] = await pool.query('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', [userId]);
    const [[habitCount]] = await pool.query('SELECT COUNT(*) as count FROM habits WHERE user_id = ?', [userId]);
    const [[eventCount]] = await pool.query('SELECT COUNT(*) as count FROM birthdays WHERE user_id = ?', [userId]);

    if (taskCount.count > 0 || habitCount.count > 0 || eventCount.count > 0) {
      console.log('ℹ️ Демо-данные пропущены, у пользователя уже есть контент:', userId);
      return false;
    }

    for (const task of getDemoTasks()) {
      await pool.query(
        `INSERT INTO tasks (user_id, title, date, time, priority, comment, done, done_date, deadline, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, task.title, task.date, task.time, task.priority, task.comment, task.done, task.done_date, task.deadline]
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const startDateStr = toDate(startDate);

    const createdHabits = [];
    for (let i = 0; i < demoHabits.length; i += 1) {
      const habit = demoHabits[i];
      const [result] = await pool.query(
        `INSERT INTO habits (
          user_id, name, unit, plan, start_year, start_month, target_type, start_date, end_date, days_of_week, order_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          habit.name,
          habit.unit,
          habit.plan,
          startYear,
          startMonth,
          habit.target_type,
          startDateStr,
          null,
          JSON.stringify([]),
          i,
        ]
      );
      createdHabits.push({ ...habit, id: result.insertId });
    }

    await createHabitRecords(userId, createdHabits);

    for (const event of demoEvents) {
      await pool.query(
        `INSERT INTO birthdays (user_id, name, day, month, year, type, notify_before)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, event.name, event.day, event.month, event.year, event.type, event.notify_before]
      );
    }

    console.log('✅ Демо-данные успешно созданы для пользователя:', userId);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при создании демо-данных:', error);
    return false;
  }
}

async function deleteDemoData(userId) {
  try {
    const taskWhere = DEMO_TASK_TITLES.map(() => 'title = ?').join(' OR ');
    const habitWhere = DEMO_HABIT_NAMES.map(() => 'name = ?').join(' OR ');
    const eventWhere = DEMO_EVENT_NAMES.map(() => 'name = ?').join(' OR ');

    const [taskRes] = await pool.query(
      `DELETE FROM tasks WHERE user_id = ? AND (${taskWhere})`,
      [userId, ...DEMO_TASK_TITLES]
    );

    const [habitRes] = await pool.query(
      `DELETE FROM habits WHERE user_id = ? AND (${habitWhere})`,
      [userId, ...DEMO_HABIT_NAMES]
    );

    const [eventRes] = await pool.query(
      `DELETE FROM birthdays WHERE user_id = ? AND (${eventWhere})`,
      [userId, ...DEMO_EVENT_NAMES]
    );

    return {
      tasks: taskRes.affectedRows || 0,
      habits: habitRes.affectedRows || 0,
      events: eventRes.affectedRows || 0,
    };
  } catch (error) {
    console.error('❌ Ошибка удаления демо-данных:', error);
    throw error;
  }
}

module.exports = { createDemoData, deleteDemoData };

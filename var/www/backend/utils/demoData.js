// utils/demoData.js
// Генерация демо-данных для нового пользователя

const pool = require('../db');

// Демо-задачи
const demoTasks = [
  {
    title: 'Позвонить в банк',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    priority: 'high',
    comment: 'Уточнить условия по кредитной карте',
    done: false,
    deadline: new Date().toISOString().split('T')[0],
    isRecurring: 0,
    recurrenceType: null
  },
  {
    title: 'Купить продукты',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    priority: 'medium',
    comment: 'Молоко, хлеб, яйца, сыр, овощи',
    done: false,
    deadline: null,
    isRecurring: 0,
    recurrenceType: null
  },
  {
    title: 'Встреча с командой',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    priority: 'high',
    comment: 'Обсудить новый проект',
    done: false,
    deadline: new Date().toISOString().split('T')[0],
    isRecurring: 0,
    recurrenceType: null
  },
  {
    title: 'Прочитать статью про React Native',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // завтра
    time: '20:00',
    priority: 'low',
    comment: 'Новая статья о производительности',
    done: false,
    deadline: null,
    isRecurring: 0,
    recurrenceType: null
  },
  {
    title: 'Спортивная тренировка',
    date: new Date().toISOString().split('T')[0],
    time: '07:00',
    priority: 'medium',
    comment: 'Кардио + силовые упражнения',
    done: true,
    doneDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    deadline: null,
    isRecurring: 1,
    recurrenceType: 'daily'
  },
  {
    title: 'Уборка квартиры',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // вчера
    time: '16:00',
    priority: 'low',
    comment: 'Пылесос, вымыть полы',
    done: false,
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isRecurring: 0,
    recurrenceType: null
  }
];

// Демо-привычки
const demoHabits = [
  {
    title: 'Медитация',
    color: '#6366f1',
    icon: '🧘',
    frequency: 'daily',
    targetCount: 1,
    bestStreak: 7,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  },
  {
    title: 'Чтение книг',
    color: '#10b981',
    icon: '📚',
    frequency: 'daily',
    targetCount: 1,
    bestStreak: 14,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  },
  {
    title: 'Прогулка',
    color: '#f59e0b',
    icon: '🚶',
    frequency: 'daily',
    targetCount: 1,
    bestStreak: 3,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  },
  {
    title: 'Пить воду',
    color: '#06b6d4',
    icon: '💧',
    frequency: 'daily',
    targetCount: 8,
    bestStreak: 21,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  },
  {
    title: 'Витамины',
    color: '#ec4899',
    icon: '💊',
    frequency: 'daily',
    targetCount: 1,
    bestStreak: 5,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  },
  {
    title: 'Спорт',
    color: '#ef4444',
    icon: '🏃',
    frequency: 'weekly',
    targetCount: 3,
    bestStreak: 2,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  }
];

// Демо-события и ДР
const demoBirthdays = [
  {
    name: 'День рождения мамы',
    type: 'birthday',
    day: 15,
    month: 4,
    year: 1975,
    notify_before: 3
  },
  {
    name: 'День рождения друга',
    type: 'birthday',
    day: 22,
    month: 5,
    year: 1990,
    notify_before: 2
  },
  {
    name: 'День программиста',
    type: 'event',
    day: 12,
    month: 9,
    year: null,
    notify_before: 1
  },
  {
    name: 'Годовщина работы',
    type: 'important',
    day: 1,
    month: 3,
    year: 2020,
    notify_before: 7
  },
  {
    name: 'Поездка на море',
    type: 'event',
    day: 10,
    month: 7,
    year: 2026,
    notify_before: 14
  }
];

// Генерация записей привычек за последние 30 дней
async function generateHabitRecords(userId, habits) {
  const records = [];
  const today = new Date();
  
  for (const habit of habits) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Генерируем записи в зависимости от частоты
      let shouldAddRecord = false;
      
      if (habit.frequency === 'daily') {
        shouldAddRecord = Math.random() > 0.2; // 80% вероятность
      } else if (habit.frequency === 'weekly') {
        shouldAddRecord = Math.random() > 0.6; // 40% вероятность
      }
      
      if (shouldAddRecord) {
        const count = habit.frequency === 'daily' 
          ? Math.min(Math.floor(Math.random() * habit.targetCount) + 1, habit.targetCount)
          : 1;
        
        records.push({
          habit_id: habit.id,
          date: dateStr,
          count,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
    }
  }
  
  if (records.length > 0) {
    const values = records.map(r => 
      `(${userId}, ${r.habit_id}, '${r.date}', ${r.count}, '${r.created_at}')`
    ).join(', ');
    
    await pool.query(`
      INSERT INTO habit_records (user_id, habit_id, date, count, created_at)
      VALUES ${values}
    `);
  }
}

// Основная функция создания демо-данных
async function createDemoData(userId) {
  try {
    console.log('🎯 Создание демо-данных для пользователя:', userId);
    
    // 1. Создаем задачи
    for (const task of demoTasks) {
      await pool.query(`
        INSERT INTO tasks (
          user_id, title, date, time, priority, comment, done, 
          done_date, deadline, is_recurring, recurrence_type, 
          recurrence_value, is_generated, templateid, folderid, 
          focus_sessions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId, task.title, task.date, task.time, task.priority, 
        task.comment, task.done ? 1 : 0, task.doneDate || null,
        task.deadline, task.isRecurring, task.recurrenceType,
        null, 0, null, null, 0
      ]);
    }
    
    // 2. Создаем привычки
    const habitIds = [];
    for (const habit of demoHabits) {
      const [result] = await pool.query(`
        INSERT INTO habits (
          user_id, title, color, icon, frequency, target_count, 
          best_streak, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, habit.title, habit.color, habit.icon, 
        habit.frequency, habit.targetCount, habit.bestStreak,
        habit.createdAt
      ]);
      
      habitIds.push({
        ...habit,
        id: result.insertId
      });
    }
    
    // 3. Создаем записи привычек
    await generateHabitRecords(userId, habitIds);
    
    // 4. Создаем события/ДР
    for (const birthday of demoBirthdays) {
      await pool.query(`
        INSERT INTO birthdays (
          user_id, name, type, day, month, year, notify_before
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, birthday.name, birthday.type, birthday.day, 
        birthday.month, birthday.year, birthday.notify_before
      ]);
    }
    
    console.log('✅ Демо-данные успешно созданы');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при создании демо-данных:', error);
    return false;
  }
}

module.exports = { createDemoData };

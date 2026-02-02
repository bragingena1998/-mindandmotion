const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const emailService = require('./emailService');


const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
  });

// Initialize database tables
async function initializeDB() {
  try {
// Create habit_records table
await pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    deadline DATE,
    title VARCHAR(255) NOT NULL,
    priority INT DEFAULT 2,
    comment TEXT,
    done BOOLEAN DEFAULT FALSE,
    done_date DATETIME,
    focus_sessions INT DEFAULT 0,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type VARCHAR(50),
recurrence_value VARCHAR(50),
    is_generated BOOLEAN DEFAULT FALSE,
    template_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

    // Create habits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) DEFAULT 'раз',
        plan INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create habit_records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        habit_id INT NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        day INT NOT NULL,
        value INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_record (user_id, habit_id, year, month, day),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initializeDB();

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.userId;
    next();
  });
}

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/register', async (req, res) => {
  console.log('📝 Register request:', req.body);
  
  const { email, password, name, birthdate } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  }

  try {
    // Проверяем, существует ли пользователь
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём пользователя
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, birthdate) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, birthdate || null]
    );

    const userId = result.insertId;
    console.log('✅ User created:', { userId, email, name });

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-12345',
      { expiresIn: '30d' }
    );

    res.json({ 
      token,
      userId,
      email,
      name
    });
    
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});


// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [users] = await pool.query(
      'SELECT id, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER PROFILE API ====================

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, birthdate, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, birthdate } = req.body;
    
    await pool.query(
      'UPDATE users SET name = ?, birthdate = ? WHERE id = ?',
      [name, birthdate, req.userId]
    );
    
    const [users] = await pool.query(
      'SELECT id, email, name, birthdate, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== HABITS API ====================

// Get all habits for user
app.get('/api/habits', authenticateToken, async (req, res) => {
  try {
    const [habits] = await pool.query(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY id ASC',
      [req.userId]
    );
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create habit
app.post('/api/habits', authenticateToken, async (req, res) => {
  try {
    const { name, unit, plan } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO habits (user_id, name, unit, plan) VALUES (?, ?, ?, ?)',
      [req.userId, name, unit || 'раз', plan || 0]
    );
    
    res.json({ 
      id: result.insertId,
      user_id: req.userId,
      name,
      unit,
      plan,
      created_at: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update habit
app.put('/api/habits/:id', authenticateToken, async (req, res) => {
  try {
    const { name, unit, plan } = req.body;
    
    await pool.query(
      'UPDATE habits SET name=?, unit=?, plan=? WHERE id=? AND user_id=?',
      [name, unit, plan, req.params.id, req.userId]
    );
    
    res.json({ 
      id: parseInt(req.params.id), 
      user_id: req.userId,
      name, 
      unit, 
      plan 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete habit
app.delete('/api/habits/:id', authenticateToken, async (req, res) => {
  try {
    // Удалить все записи привычки
    await pool.query(
      'DELETE FROM habit_records WHERE habit_id=? AND user_id=?',
      [req.params.id, req.userId]
    );
    
    // Удалить саму привычку
    await pool.query(
      'DELETE FROM habits WHERE id=? AND user_id=?',
      [req.params.id, req.userId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/habits/records/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const [records] = await pool.query(
      `SELECT habit_id as habitid, day, value FROM habit_records 
       WHERE user_id = ? AND year = ? AND month = ? 
       ORDER BY day`,
      [req.userId, parseInt(year), parseInt(month)]
    );

    console.log('First 3 records:', records.slice(0, 3));
    console.log(`✓ Loaded ${records.length} records for user ${req.userId}, ${year}-${month}`);
    res.json(records);
  } catch (err) {
    console.error('❌ Error loading records:', err);
    res.status(500).json({ error: 'Failed to load records' });
  }
});



// Save/update habit record (upsert)
app.post('/api/habits/records', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day, value } = req.body;
    
    // Проверить, что привычка принадлежит пользователю
    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, req.userId]
    );
    
    if (habits.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    // Вставить или обновить запись
    await pool.query(
      `INSERT INTO habit_records (user_id, habit_id, year, month, day, value) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
      [req.userId, habit_id, parseInt(year), parseInt(month), parseInt(day), value]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление отметки
app.delete('/api/habits/records', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day } = req.body;
    const userId = req.userId;

    console.log('🧹 DELETE habit record request:', {
      userId,
      habit_id,
      year,
      month,
      day
    });

    if (!habit_id || !year || !month || !day) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверяем, что привычка принадлежит пользователю
    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, userId]
    );

    console.log('Check habit ownership:', {
      habitId: habit_id,
      userId,
      habitsCount: habits.length
    });

    if (habits.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Удаляем запись
    await pool.query(
      'DELETE FROM habit_records WHERE habit_id = ? AND year = ? AND month = ? AND day = ?',
      [habit_id, year, month, day]
    );

    console.log(`✅ Deleted record: habit_id=${habit_id}, year=${year}, month=${month}, day=${day}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});





// Delete habit record
app.delete('/api/habits/records/:habit_id/:year/:month/:day', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day } = req.params;
    
    await pool.query(
      'DELETE FROM habit_records WHERE user_id = ? AND habit_id = ? AND year = ? AND month = ? AND day = ?',
      [req.userId, parseInt(habit_id), parseInt(year), parseInt(month), parseInt(day)]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single habit record
app.get('/api/habits/:habitId/record/:year/:month/:day', authenticateToken, async (req, res) => {
  try {
    const { habitId, year, month, day } = req.params;
    
    const [records] = await pool.query(
      'SELECT value FROM habit_records WHERE user_id = ? AND habit_id = ? AND year = ? AND month = ? AND day = ?',
      [req.userId, parseInt(habitId), parseInt(year), parseInt(month), parseInt(day)]
    );
    
    res.json({ value: records.length > 0 ? records[0].value : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ЗАДАЧИ (TASKS)
// ========================================

// ✅ ИСПРАВЛЕНИЕ 1: Получить все задачи (добавлен authenticateToken и req.userId)
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id,
        user_id,
        date,
        deadline,
        title,
        priority,
        comment,
        done,
        done_date as doneDate,
        focus_sessions as focusSessions,
        is_recurring as isRecurring,
        recurrence_type as recurrenceType,
        recurrence_value as recurrenceValue,
        is_generated as isGenerated,
        template_id as templateId,
        created_at,
        updated_at
      FROM tasks 
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
    `, [req.userId]);
    
    // Преобразуем boolean полей
    const formatted = rows.map(row => ({
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.isRecurring),
      isGenerated: Boolean(row.isGenerated)
    }));
    
    console.log(`✓ Loaded ${rows.length} tasks for user ${req.userId}`);
    res.json(formatted);
  } catch (err) {
    console.error('Ошибка получения задач:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ ИСПРАВЛЕНИЕ 2: Добавить задачу (добавлен authenticateToken и req.userId)
// Проверь, что это есть в server.js:
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const {
      date,
      deadline,
      title,
      priority,
      comment,
      done,
      doneDate,
      focusSessions,
      isRecurring,
      recurrenceType,
      recurrenceValue,
      isGenerated,
      templateId
    } = req.body;

    console.log('📥 Creating task:', {
      user_id: req.userId,
      title,
      isRecurring,
      recurrenceType,
      recurrenceValue
    });

    const [result] = await pool.query(
      `INSERT INTO tasks (
        user_id, date, deadline, title, priority, comment,
        done, done_date, focus_sessions,
        is_recurring, recurrence_type, recurrence_value,
        is_generated, template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        date,
        deadline || null,
        title,
        priority || 2,
        comment || '',
        done ? 1 : 0,
        doneDate || null,
        focusSessions || 0,
        isRecurring ? 1 : 0,
        recurrenceType || null,
        recurrenceValue || null,
        isGenerated ? 1 : 0,
        templateId || null
      ]
    );

    // Получаем созданную задачу
    const [rows] = await pool.query(`
      SELECT 
        id,
        user_id,
        date,
        deadline,
        title,
        priority,
        comment,
        done,
        done_date as doneDate,
        focus_sessions as focusSessions,
        is_recurring as isRecurring,
        recurrence_type as recurrenceType,
        recurrence_value as recurrenceValue,
        is_generated as isGenerated,
        template_id as templateId,
        created_at,
        updated_at
      FROM tasks 
      WHERE id = ?
    `, [result.insertId]);

    if (rows.length === 0) {
      return res.status(500).json({ error: 'Не удалось получить созданную задачу' });
    }

    const newTask = {
      ...rows[0],
      done: Boolean(rows[0].done),
      isRecurring: Boolean(rows[0].isRecurring),
      isGenerated: Boolean(rows[0].isGenerated)
    };

    console.log('✅ Task created:', {
      id: newTask.id,
      title: newTask.title,
      isRecurring: newTask.isRecurring,
      recurrenceType: newTask.recurrenceType
    });

    res.json(newTask);
  } catch (err) {
    console.error('❌ Error creating task:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});



// ✅ ИСПРАВЛЕНИЕ 3: Обновить задачу (добавлен authenticateToken и req.userId)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      deadline,
      title,
      priority,
      comment,
      done,
      done_date,
      focus_sessions,
      is_recurring,
      recurrence_type,
      recurrence_value
    } = req.body;

    await pool.query(
      `UPDATE tasks SET
        date = ?,
        deadline = ?,
        title = ?,
        priority = ?,
        comment = ?,
        done = ?,
        done_date = ?,
        focus_sessions = ?,
        is_recurring = ?,
        recurrence_type = ?,
        recurrence_value = ?
      WHERE id = ? AND user_id = ?`,
      [
        date,
        deadline || null,
        title,
        priority,
        comment,
        done ? 1 : 0,
        done_date || null,
        focus_sessions,
        is_recurring ? 1 : 0,
        recurrence_type || null,
        recurrence_value || null,
        id,
        req.userId
      ]
    );

    const [updated] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    console.log(`✓ Task updated: ${id}`);
    res.json(updated[0]);
  } catch (err) {
    console.error('Ошибка обновления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ ИСПРАВЛЕНИЕ 4: Удалить задачу (добавлен authenticateToken и req.userId)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [task] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    
    if (task.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    console.log(`✓ Task deleted: ${id}`);
    res.json({ message: 'Задача удалена', task: task[0] });
  } catch (err) {
    console.error('Ошибка удаления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ ИСПРАВЛЕНИЕ 5: Массовое обновление задач (добавлен authenticateToken и req.userId)
app.post('/api/tasks/sync', authenticateToken, async (req, res) => {
  try {
    const { tasks } = req.body;
    const userId = req.userId;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const results = [];
    
    for (const task of tasks) {
      // Проверяем, есть ли задача у этого пользователя
      const [existing] = await pool.query(
        'SELECT id FROM tasks WHERE id = ? AND user_id = ?', 
        [task.id, userId]
      );
      
      if (existing.length > 0) {
        // Обновляем
        await pool.query(
          `UPDATE tasks SET
            date = ?, deadline = ?, title = ?, priority = ?, comment = ?,
            done = ?, done_date = ?, focus_sessions = ?,
            is_recurring = ?, recurrence_type = ?, recurrence_value = ?
          WHERE id = ? AND user_id = ?`,
          [
            task.date,
            task.deadline || null,
            task.title,
            task.priority || 2,
            task.comment || '',
            task.done ? 1 : 0,
            task.doneDate || null,
            task.focusSessions || 0,
            task.isRecurring ? 1 : 0,
            task.recurrenceType || null,
            task.recurrenceValue || null,
            task.id,
            userId
          ]
        );
      } else {
        // Вставляем новую
        await pool.query(
          `INSERT INTO tasks (
            id, user_id, date, deadline, title, priority, comment,
            done, done_date, focus_sessions,
            is_recurring, recurrence_type, recurrence_value,
            is_generated, template_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            userId,
            task.date,
            task.deadline || null,
            task.title,
            task.priority || 2,
            task.comment || '',
            task.done ? 1 : 0,
            task.doneDate || null,
            task.focusSessions || 0,
            task.isRecurring ? 1 : 0,
            task.recurrenceType || null,
            task.recurrenceValue || null,
            task.isGenerated ? 1 : 0,
            task.templateId || null
          ]
        );
      }
      
      const [synced] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [task.id, userId]);
      results.push(synced[0]);
    }

    console.log(`✓ Synced ${results.length} tasks for user ${userId}`);
    res.json({ synced: results.length, tasks: results });
  } catch (err) {
    console.error('Ошибка синхронизации задач:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ ИСПРАВЛЕНИЕ 6: Удалить задачу (новый endpoint, добавлен authenticateToken и req.userId)
app.post('/api/tasks/delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID задачи требуется' });
    }

    const [task] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', 
      [id, req.userId]
    );
    
    if (task.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?', 
      [id, req.userId]
    );
    
    console.log(`✅ Deleted task: ${id}`);
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error('Ошибка удаления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== EMAIL VERIFICATION API ====================

// Отправить код подтверждения на email
app.post('/api/send-verification-code', async (req, res) => {
  const { name, email, birthdate, password } = req.body;

  if (!name || !email || !birthdate || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }

  try {
    // Проверяем, существует ли пользователь
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Срок действия: 15 минут (UTC)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    console.log('🕐 Registration - Server time (UTC):', new Date().toISOString());
    console.log('🕐 Registration - Expires at (UTC):', expiresAt.toISOString());

    // Удаляем старые коды верификации для этого email
    await pool.query('DELETE FROM email_verifications WHERE email = ?', [email]);

    // Сохраняем код верификации
    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    // Отправляем письмо
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .code { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; background: #f0f0ff; padding: 20px; border-radius: 8px; letter-spacing: 4px; }
          .info { color: #666; margin-top: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 Добро пожаловать в Трекер привычек!</h2>
          </div>
          <p>Привет, ${name.split(' ')[0]}!</p>
          <p>Мы получили запрос на создание аккаунта с этим email адресом. Чтобы завершить регистрацию, введите код подтверждения ниже:</p>
          <div class="code">${code}</div>
          <p class="info">Код действителен в течение 15 минут.</p>
          <p class="info">Если это были не вы, просто проигнорируйте это письмо.</p>
        </div>
      </body>
      </html>
    `;

    const result = await emailService.sendEmail({
      to: email,
      subject: '🔐 Подтверждение регистрации — Mind and Motion',
      html,
      text: `Ваш код подтверждения: ${code}. Код действителен 15 минут.`
    });

    if (!result.success) {
      console.error('❌ Ошибка отправки email:', result.error);
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    console.log(`✅ Код верификации отправлен на ${email} (код: ${code})`);
    res.json({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('❌ Ошибка send-verification-code:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// Проверить код подтверждения и создать пользователя
app.post('/api/verify-code', async (req, res) => {
  const { name, email, birthdate, password, code } = req.body;

  // Убираем пробелы из кода
  const cleanCode = String(code).replace(/\s+/g, '');

  console.log('📝 Verify email request:', { 
    email, 
    name,
    originalCode: code,
    cleanCode: cleanCode,
    serverTimeUTC: new Date().toISOString()
  });

  if (!name || !email || !birthdate || !password || !cleanCode) {
    console.error('❌ Missing fields:', { name: !!name, email: !!email, birthdate: !!birthdate, password: !!password, code: !!cleanCode });
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    // Проверяем код (с учётом UTC)
    const [verifications] = await pool.query(
      `SELECT *, 
              expires_at as expires_at_utc,
              UTC_TIMESTAMP() as current_time_utc,
              TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
       FROM email_verifications 
       WHERE email = ? 
         AND REPLACE(code, ' ', '') = ? 
         AND expires_at > UTC_TIMESTAMP()`,
      [email, cleanCode]
    );

    console.log('🔍 Found verifications:', verifications.length);
    
    if (verifications.length > 0) {
      console.log('✅ Verification found:', {
        code: verifications[0].code,
        expires_at_utc: verifications[0].expires_at_utc,
        current_time_utc: verifications[0].current_time_utc,
        seconds_left: verifications[0].seconds_left
      });
    } else {
      // Дополнительная проверка
      const [allVerifications] = await pool.query(
        `SELECT code, 
                expires_at as expires_at_utc,
                UTC_TIMESTAMP() as current_time_utc,
                TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
         FROM email_verifications 
         WHERE email = ?`,
        [email]
      );
      console.log('📋 All verifications for this email:', allVerifications);
    }

    if (verifications.length === 0) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

    // Проверяем, не существует ли уже пользователь
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём пользователя
    const [result] = await pool.query(
      'INSERT INTO users (name, email, birthdate, password, email_verified) VALUES (?, ?, ?, ?, TRUE)',
      [name, email, birthdate, hashedPassword]
    );

    const userId = result.insertId;

    // Удаляем использованный код
    await pool.query('DELETE FROM email_verifications WHERE email = ?', [email]);

    console.log(`✅ Пользователь создан: ${email} (userId: ${userId})`);

    // 🎉 ОТПРАВЛЯЕМ ПРИВЕТСТВЕННОЕ ПИСЬМО
    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .emoji { font-size: 48px; margin-bottom: 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎉</div>
            <h2>Добро пожаловать в Mind and Motion!</h2>
          </div>
          <p>Привет, <strong>${name.split(' ')[0]}</strong>! 👋</p>
          <p>Поздравляем с успешной регистрацией! Теперь ты можешь:</p>
          <ul>
            <li>📊 Отслеживать привычки каждый день</li>
            <li>✅ Создавать и выполнять задачи</li>
            <li>📈 Следить за своим прогрессом</li>
            <li>🎯 Достигать целей легко и с удовольствием</li>
          </ul>
          <p style="text-align: center;">
            <a href="http://mindandmotion.ru" class="button">Начать сейчас</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">С уважением,<br>Команда Mind and Motion</p>
        </div>
      </body>
      </html>
    `;
    
    // Отправляем асинхронно (не ждём результата)
    emailService.sendEmail({
      to: email,
      subject: '🎉 Добро пожаловать в Mind and Motion!',
      html: welcomeHtml,
      text: `Привет, ${name}! Добро пожаловать в Mind and Motion! Начни отслеживать свои привычки прямо сейчас.`
    }).then(result => {
      if (result.success) {
        console.log(`✅ Приветственное письмо отправлено на ${email}`);
      } else {
        console.error(`⚠️ Не удалось отправить приветственное письмо на ${email}:`, result.error);
      }
    }).catch(err => {
      console.error(`⚠️ Ошибка отправки приветственного письма:`, err.message);
    });

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-12345',
      { expiresIn: '30d' }
    );

    res.json({ 
      success: true, 
      message: 'Регистрация успешна',
      token,
      userId,
      email,
      name
    });
  } catch (error) {
    console.error('❌ Ошибка verify-code:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});


// Вспомогательная функция для валидации email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}


// ==================== PASSWORD RESET API ====================

// Отправить код для сброса пароля
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' });
  }

  try {
    // Проверяем, существует ли пользователь
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Срок действия: 15 минут (с учётом UTC)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    console.log('🕐 Server time (UTC):', new Date().toISOString());
    console.log('🕐 Expires at (UTC):', expiresAt.toISOString());

    // Удаляем старые коды для этого email
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    // Сохраняем новый код
    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    // Отправляем письмо
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .code { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; background: #f0f0ff; padding: 20px; border-radius: 8px; letter-spacing: 4px; }
          .info { color: #666; margin-top: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Восстановление пароля</h2>
          </div>
          <p>Вы запросили сброс пароля для вашего аккаунта. Используйте код ниже:</p>
          <div class="code">${code}</div>
          <p class="info">Код действителен в течение 15 минут.</p>
          <p class="info">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        </div>
      </body>
      </html>
    `;

    const result = await emailService.sendEmail({
      to: email,
      subject: '🔐 Восстановление пароля — Mind and Motion',
      html,
      text: `Ваш код для сброса пароля: ${code}. Код действителен 15 минут.`
    });

    if (!result.success) {
      console.error('❌ Ошибка отправки email:', result.error);
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    console.log(`✅ Код сброса пароля отправлен на ${email} (код: ${code})`);
    res.json({ success: true, message: 'Код отправлен на email' });
  } catch (error) {
    console.error('❌ Ошибка forgot-password:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// Сбросить пароль
app.post('/api/reset-password', async (req, res) => {
  const { email, code, new_password } = req.body;
const newPassword = new_password;  // используем как раньше


  // Убираем пробелы из кода
  const cleanCode = String(code).replace(/\s+/g, '');

  console.log('📝 Reset password request:', { 
    email, 
    originalCode: code, 
    cleanCode: cleanCode,
    newPasswordLength: newPassword?.length,
    serverTimeUTC: new Date().toISOString()
  });

  if (!email || !cleanCode || !newPassword) {
    console.error('❌ Missing fields:', { email: !!email, code: !!cleanCode, newPassword: !!newPassword });
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  }

  try {
    // Проверяем код (с учётом UTC)
    const [resets] = await pool.query(
      `SELECT *, 
              expires_at as expires_at_utc,
              UTC_TIMESTAMP() as current_time_utc,
              TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
       FROM password_resets 
       WHERE email = ? 
         AND REPLACE(code, ' ', '') = ? 
         AND expires_at > UTC_TIMESTAMP()`,
      [email, cleanCode]
    );

    console.log('🔍 Found resets:', resets.length);
    
    if (resets.length > 0) {
      console.log('✅ Reset found:', {
        code: resets[0].code,
        expires_at_utc: resets[0].expires_at_utc,
        current_time_utc: resets[0].current_time_utc,
        seconds_left: resets[0].seconds_left
      });
    } else {
      // Дополнительная проверка
      const [allResets] = await pool.query(
        `SELECT code, 
                expires_at as expires_at_utc,
                UTC_TIMESTAMP() as current_time_utc,
                TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
         FROM password_resets 
         WHERE email = ?`,
        [email]
      );
      console.log('📋 All resets for this email:', allResets);
    }

    if (resets.length === 0) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль пользователя
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Удаляем использованный код
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    console.log(`✅ Пароль успешно изменён для ${email}`);
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('❌ Ошибка reset-password:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Проверяем SMTP соединение
  await emailService.verifyConnection();
});


module.exports = pool;
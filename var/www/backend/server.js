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
// --- ЛОГИРОВАНИЕ ---
app.use((req, res, next) => {
  console.log(`📡 ЗАПРОС ПРИШЕЛ: ${req.method} ${req.url}`);
  console.log('Тело:', req.body);
  next();
});
// --------------------

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
    // 1. Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        time VARCHAR(5) DEFAULT NULL,
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
        folder_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `);

    // --- MIGRATION: Add time column to tasks ---
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'time'");
        if (columns.length === 0) {
          console.log('🔄 Adding time column to tasks table...');
          await pool.query(`
            ALTER TABLE tasks 
            ADD COLUMN time VARCHAR(5) DEFAULT NULL AFTER date
          `);
          console.log('✅ Column time added successfully');
        }
    } catch (err) {
        console.error('Migration error (time):', err.message);
    }
    // -----------------------------------------

    // 2. Create habits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) DEFAULT 'раз',
        plan INT DEFAULT 0,
        start_year INT DEFAULT NULL,
        start_month INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // --- MIGRATION: Add start_year and start_month columns ---
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM habits LIKE 'start_year'");
      if (columns.length === 0) {
        console.log('🔄 Adding start_year and start_month columns to habits table...');
        await pool.query(`
          ALTER TABLE habits 
          ADD COLUMN start_year INT DEFAULT NULL,
          ADD COLUMN start_month INT DEFAULT NULL
        `);
        console.log('✅ Columns start_year and start_month added successfully');
      }
    } catch (err) {
      console.error('Migration error (start_year/start_month):', err.message);
    }
    
     // --- MIGRATION: Add gender column ---
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'gender'");
      if (columns.length === 0) {
        console.log('🔄 Adding gender column to users table...');
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN gender VARCHAR(10) DEFAULT 'male'
        `);
        console.log('✅ Column gender added successfully');
      }
    } catch (err) {
      console.error('Migration error (gender):', err.message);
    }
    // -------------------------------------------------------

    // 3. Create habit_records table
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

    // 4. Create email_verifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create habit_monthly_configs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_monthly_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        habit_id INT NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        plan INT DEFAULT 0,
        unit VARCHAR(50),
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_config (habit_id, year, month),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      )
    `);
    
    // 6. Create subtasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table subtasks ready');

    // 7. Create folders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50) DEFAULT '📁',
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table folders ready');

    // --- MIGRATION: Add order_index to folders ---
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM folders LIKE 'order_index'");
      if (columns.length === 0) {
        console.log('🔄 Adding order_index column to folders table...');
        await pool.query(`ALTER TABLE folders ADD COLUMN order_index INT DEFAULT 0`);
        console.log('✅ Column order_index added successfully');
      }
    } catch (err) {
      console.error('Migration error (folders.order_index):', err.message);
    }

    // --- MIGRATION: Add folder_id to tasks ---
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'folder_id'");
      if (columns.length === 0) {
        console.log('🔄 Adding folder_id column to tasks table...');
        await pool.query(`
          ALTER TABLE tasks 
          ADD COLUMN folder_id INT DEFAULT NULL,
          ADD FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
        `);
        console.log('✅ Column folder_id added successfully');
      }
    } catch (err) {
      console.error('Migration error (folder_id):', err.message);
    }

    // --- MIGRATION: Add focus_sessions to tasks ---
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'focus_sessions'");
      if (columns.length === 0) {
        console.log('🔄 Adding focus_sessions column to tasks table...');
        await pool.query(`ALTER TABLE tasks ADD COLUMN focus_sessions INT DEFAULT 0`);
        console.log('✅ Column focus_sessions added successfully');
      }
    } catch (err) {
      console.error('Migration error (focus_sessions):', err.message);
    }

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
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, birthdate) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, birthdate || null]
    );

    const userId = result.insertId;
    console.log('✅ User created:', { userId, email, name });

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-12345',
      { expiresIn: '30d' }
    );

    res.json({ token, userId, email, name });
    
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

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, birthdate, gender, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [current] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (current.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = current[0];
    const { name, birthdate, gender } = req.body;
    
    await pool.query(
      'UPDATE users SET name = ?, birthdate = ?, gender = ? WHERE id = ?',
      [
        name !== undefined ? name : user.name,
        birthdate !== undefined ? birthdate : user.birthdate,
        gender !== undefined ? gender : user.gender,
        req.userId
      ]
    );
    
    const [updated] = await pool.query(
      'SELECT id, email, name, birthdate, gender, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Заполните оба поля пароля' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.userId]);
    const valid = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!valid) return res.status(400).json({ error: 'Неверный текущий пароль' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== HABITS API ====================

app.get('/api/habits', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const [habits] = await pool.query(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY order_index ASC, id ASC',
      [req.userId]
    );

    if (!year || !month) {
      return res.json(habits);
    }

    const requestedYear = parseInt(year);
    const requestedMonth = parseInt(month);

    const [configs] = await pool.query(
      'SELECT * FROM habit_monthly_configs WHERE habit_id IN (?) AND year = ? AND month = ?',
      [habits.map(h => h.id).length > 0 ? habits.map(h => h.id) : [0], year, month]
    );

    const [records] = await pool.query(
       'SELECT DISTINCT habit_id FROM habit_records WHERE user_id = ? AND year = ? AND month = ?',
       [req.userId, year, month]
    );
    const activeHabitIds = new Set(records.map(r => r.habit_id));

    const mergedHabits = habits.map(habit => {
      const config = configs.find(c => c.habit_id === habit.id);
      
      const effectivePlan = config ? config.plan : habit.plan;
      const effectiveUnit = config ? config.unit : habit.unit;
      const isArchived = config ? config.is_archived : false;

      const habitStartYear = habit.start_year;
      const habitStartMonth = habit.start_month;
      
      let existedInThisMonth = true;
      
      if (habitStartYear && habitStartMonth) {
        if (requestedYear < habitStartYear || 
            (requestedYear === habitStartYear && requestedMonth < habitStartMonth)) {
          existedInThisMonth = false;
        }
      }

      return {
        ...habit,
        plan: effectivePlan,
        unit: effectiveUnit,
        isArchived: isArchived,
        shouldShow: existedInThisMonth && (!isArchived || activeHabitIds.has(habit.id))
      };
    });

    res.json(mergedHabits);

  } catch (err) {
    console.error('Get habits error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/habits/reorder', authenticateToken, async (req, res) => {
  try {
    const { habits } = req.body;
    
    if (!Array.isArray(habits)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    for (const item of habits) {
      await pool.query(
        'UPDATE habits SET order_index = ? WHERE id = ? AND user_id = ?',
        [item.order_index, item.id, req.userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});


const parseDateForDB = (dateStr) => {
    if (!dateStr || dateStr === '' || dateStr === 'null') return null;
    return dateStr;
};

app.post('/api/habits', authenticateToken, async (req, res) => {
  try {
    console.log('📥 CREATE HABIT DATA:', req.body); 

    const { 
        name, 
        unit, 
        plan, 
        year, 
        month, 
        target_type, 
        start_date, 
        end_date, 
        days_of_week 
    } = req.body;

    if (!name) throw new Error("Field 'name' is required");
    if (!req.userId) throw new Error("User ID is missing");

    const planVal = parseInt(plan) || 0;
    const targetTypeVal = (target_type && target_type.length <= 20) ? target_type : 'monthly';
    const daysJson = JSON.stringify(Array.isArray(days_of_week) ? days_of_week : []);
    
    const formatDate = (d) => {
        if (!d || d === '' || d === 'null') return null;
        return d; 
    };
    const startVal = formatDate(start_date);
    const endVal = formatDate(end_date);

    const [result] = await pool.query(
      `INSERT INTO habits 
       (user_id, name, unit, plan, start_year, start_month, target_type, start_date, end_date, days_of_week) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, 
        name, 
        unit || 'раз', 
        planVal, 
        year || new Date().getFullYear(), 
        month || new Date().getMonth() + 1,
        targetTypeVal,
        startVal,
        endVal,
        daysJson
      ]
    );
    
    res.json({ id: result.insertId, success: true });

  } catch (err) {
    console.error('❌ CRITICAL DB ERROR:', err);
    res.status(500).json({ 
        error: 'DB_ERROR', 
        message: err.message, 
        sqlMessage: err.sqlMessage 
    });
  }
});


app.put('/api/habits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, plan, target_type, start_date, end_date, days_of_week } = req.body;

    const daysOfWeekJson = Array.isArray(days_of_week) ? JSON.stringify(days_of_week) : '[]';
    const startDateDB = parseDateForDB(start_date);
    const endDateDB = parseDateForDB(end_date);

    const [result] = await pool.query(
      `UPDATE habits 
       SET name = ?, unit = ?, plan = ?, target_type = ?, start_date = ?, end_date = ?, days_of_week = ? 
       WHERE id = ? AND user_id = ?`,
      [name, unit, plan, target_type || 'monthly', startDateDB, endDateDB, daysOfWeekJson, id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Habit not found or access denied' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Update habit error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/habits/:id', authenticateToken, async (req, res) => {
  try {
    const habitId = req.params.id;
    const { year, month } = req.query;

    if (year && month) {
      await pool.query(`
        INSERT INTO habit_monthly_configs (habit_id, year, month, is_archived)
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE is_archived = TRUE
      `, [habitId, year, month]);
      
      console.log(`✅ Habit ${habitId} archived for ${month}.${year}`);
      return res.json({ success: true, archived: true });
    }

    await pool.query('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, req.userId]);
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('Delete/archive habit error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/habits/:id/records', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const [records] = await pool.query(
      'SELECT * FROM habit_records WHERE habit_id = ? AND user_id = ? AND year = ? AND month = ?',
      [req.params.id, req.userId, year, month]
    );
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/habits/:id/records', authenticateToken, async (req, res) => {
  try {
    const { year, month, day, value } = req.body;
    await pool.query(
      `INSERT INTO habit_records (user_id, habit_id, year, month, day, value)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP`,
      [req.userId, req.params.id, year, month, day, value, value]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/habits/:id/monthly-config', authenticateToken, async (req, res) => {
  try {
    const { year, month, plan, unit, is_archived } = req.body;
    await pool.query(
      `INSERT INTO habit_monthly_configs (habit_id, year, month, plan, unit, is_archived)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE plan = ?, unit = ?, is_archived = ?`,
      [req.params.id, year, month, plan, unit, is_archived || false, plan, unit, is_archived || false]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== TASKS API ====================

// GET /api/tasks — получение задач
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query;
    let params;

    if (month !== undefined && year !== undefined) {
      query = `
        SELECT t.*, 
          (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtasks_count
        FROM tasks t
        WHERE t.user_id = ?
          AND (
            (MONTH(t.date) = ? AND YEAR(t.date) = ?)
            OR (MONTH(t.deadline) = ? AND YEAR(t.deadline) = ?)
            OR (t.date <= LAST_DAY(?) AND t.deadline >= ?)
          )
        ORDER BY t.deadline ASC, t.date ASC
      `;
      const monthStr = String(parseInt(month) + 1).padStart(2, '0');
      const yearStr = String(year);
      const firstDay = `${yearStr}-${monthStr}-01`;
      params = [req.userId, parseInt(month) + 1, year, parseInt(month) + 1, year, firstDay, firstDay];
    } else {
      query = `
        SELECT t.*, 
          (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtasks_count
        FROM tasks t
        WHERE t.user_id = ?
        ORDER BY t.deadline ASC, t.date ASC
      `;
      params = [req.userId];
    }

    const [tasks] = await pool.query(query, params);

    // Нормализуем поля для фронта (snake_case DB -> camelCase)
    const normalized = tasks.map(t => ({
      ...t,
      isrecurring: t.is_recurring ? 1 : 0,
      recurrencetype: t.recurrence_type || null,
      doneDate: t.done_date || null,
      focusSessions: t.focus_sessions || 0,
    }));

    res.json(normalized);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats
app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';

    const [[{ completed_today }]] = await pool.query(
      `SELECT COUNT(*) as completed_today FROM tasks WHERE user_id = ? AND done = 1 AND DATE(done_date) = ?`,
      [req.userId, today]
    );
    const [[{ total_today_plan }]] = await pool.query(
      `SELECT COUNT(*) as total_today_plan FROM tasks WHERE user_id = ? AND date <= ? AND deadline >= ?`,
      [req.userId, today, today]
    );
    const [[{ completed_week }]] = await pool.query(
      `SELECT COUNT(*) as completed_week FROM tasks WHERE user_id = ? AND done = 1 AND DATE(done_date) >= ?`,
      [req.userId, weekStartStr]
    );
    const [[{ completed_month }]] = await pool.query(
      `SELECT COUNT(*) as completed_month FROM tasks WHERE user_id = ? AND done = 1 AND DATE(done_date) >= ?`,
      [req.userId, monthStart]
    );
    const [[{ completed_total }]] = await pool.query(
      `SELECT COUNT(*) as completed_total FROM tasks WHERE user_id = ? AND done = 1`,
      [req.userId]
    );

    res.json({ completed_today, total_today_plan, completed_week, completed_month, completed_total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — создание задачи
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, date, deadline, time, priority, comment, isrecurring, recurrencetype } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, title, date, deadline, time, priority, comment, is_recurring, recurrence_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        title,
        date,
        deadline || date,
        time || null,
        priority || 2,
        comment || '',
        isrecurring ? 1 : 0,
        recurrencetype || null
      ]
    );

    res.json({ id: result.insertId, success: true });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — обновление задачи
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, deadline, time, priority, comment, done, doneDate, isrecurring, recurrencetype } = req.body;

    // Проверка владельца
    const [existing] = await pool.query(
      'SELECT id, is_recurring, recurrence_type, user_id FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = existing[0];

    const priorityNum = typeof priority === 'string'
      ? (priority === 'high' ? 1 : priority === 'low' ? 3 : 2)
      : (priority || 2);

    await pool.query(
      `UPDATE tasks SET title=?, date=?, deadline=?, time=?, priority=?, comment=?,
       done=?, done_date=?, is_recurring=?, recurrence_type=?
       WHERE id=? AND user_id=?`,
      [
        title,
        date,
        deadline || date,
        time || null,
        priorityNum,
        comment || '',
        done ? 1 : 0,
        doneDate || null,
        isrecurring ? 1 : 0,
        recurrencetype || null,
        id,
        req.userId
      ]
    );

    // Логика создания следующей копии при выполнении цикличной задачи
    if (done && task.is_recurring && task.recurrence_type) {
      const [taskData] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      const t = taskData[0];
      const baseDate = new Date(t.deadline || t.date);
      let nextDate = new Date(baseDate);

      if (task.recurrence_type === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (task.recurrence_type === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (task.recurrence_type === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const nextDateStr = nextDate.toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO tasks (user_id, title, date, deadline, time, priority, comment, is_recurring, recurrence_type, is_generated, template_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?)`,
        [req.userId, t.title, nextDateStr, nextDateStr, t.time, t.priority, t.comment, task.recurrence_type, id]
      );
      console.log(`🔄 Created next recurring task for ${task.recurrence_type}: ${nextDateStr}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/stop-recurring — остановить повторения
app.put('/api/tasks/:id/stop-recurring', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE tasks SET is_recurring = 0, recurrence_type = NULL WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    console.log(`⏹️ Recurring stopped for task ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Stop recurring error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/focus — добавить фокус-сессию к задаче
app.post('/api/tasks/:id/focus', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE tasks SET focus_sessions = focus_sessions + 1 WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    console.log(`🎯 Focus session added to task ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Focus session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUBTASKS API ====================

app.get('/api/tasks/:id/subtasks', authenticateToken, async (req, res) => {
  try {
    const [subtasks] = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY id ASC',
      [req.params.id]
    );
    res.json(subtasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/subtasks', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const [result] = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES (?, ?)',
      [req.params.id, title]
    );
    res.json({ id: result.insertId, task_id: parseInt(req.params.id), title, completed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subtasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE subtasks SET completed = NOT completed WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM subtasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== EMAIL VERIFICATION ====================

app.post('/api/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    await emailService.sendVerificationEmail(email, code);
    res.json({ success: true });
  } catch (err) {
    console.error('Send verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

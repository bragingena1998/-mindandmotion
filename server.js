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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
        await pool.query(`
          ALTER TABLE folders 
          ADD COLUMN order_index INT DEFAULT 0
        `);
        console.log('✅ Column order_index added successfully');
      }
    } catch (err) {
      console.error('Migration error (folders.order_index):', err.message);
    }
    // -----------------------------------------

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
    // -----------------------------------------

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

    console.log(`🔄 Reordering ${habits.length} habits for user ${req.userId}`);

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

    console.log('Ready to insert:', { 
        userId: req.userId, name, unit, planVal, year, month, targetTypeVal, startVal, endVal, daysJson 
    });

    const [result] = await pool.query(
      `INSERT INTO habits 
       (user_id, name, unit, plan, year, month, target_type, start_date, end_date, days_of_week) 
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
    console.log(`📝 Updating habit ${id}:`, req.body);

    const { name, unit, plan, target_type, start_date, end_date, days_of_week } = req.body;

    const daysOfWeekJson = Array.isArray(days_of_week) ? JSON.stringify(days_of_week) : '[]';
    const startDateDB = parseDateForDB(start_date);
    const endDateDB = parseDateForDB(end_date);

    const [result] = await pool.query(
      `UPDATE habits 
       SET name = ?, unit = ?, plan = ?, target_type = ?, start_date = ?, end_date = ?, days_of_week = ? 
       WHERE id = ? AND user_id = ?`,
      [
        name, 
        unit, 
        plan, 
        target_type || 'monthly', 
        startDateDB, 
        endDateDB, 
        daysOfWeekJson, 
        id, 
        req.userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Habit not found or access denied' });
    }
    
    console.log(`✅ Habit ${id} updated`);
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
      console.log(`🗑️ Archiving habit ${habitId} for ${month}.${year}`);
      
      await pool.query(`
        INSERT INTO habit_monthly_configs (habit_id, year, month, is_archived)
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE is_archived = TRUE
      `, [habitId, year, month]);

      res.json({ success: true, message: 'Habit archived for this month' });
    } else {
      await pool.query('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, req.userId]);
      res.json({ success: true, message: 'Habit deleted permanently' });
    }
  } catch (err) {
    console.error('Delete/Archive error:', err);
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

app.post('/api/habits/records', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day, value } = req.body;
    
    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, req.userId]
    );
    
    if (habits.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
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

    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, userId]
    );

    if (habits.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

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

// ==================== FOLDERS API ====================

app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    const [folders] = await pool.query(
      'SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC',
      [req.userId]
    );
    res.json(folders);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Название обязательно' });

    const [result] = await pool.query(
      'INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)',
      [req.userId, name, color || '#A0AEC0']
    );
    
    res.json({ id: result.insertId, user_id: req.userId, name, color });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ЗАДАЧИ (TASKS)
// ========================================

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    let query = `
      SELECT t.*,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtasks_count
      FROM tasks t
      WHERE t.user_id = ?
    `;

    let params = [userId];

    if (month && year) {
      query += ` AND (
        (t.done = 1 AND MONTH(t.done_date) = ? AND YEAR(t.done_date) = ?)
        OR 
        (t.done = 0 AND MONTH(t.date) = ? AND YEAR(t.date) = ?)
      )`;
      params.push(parseInt(month) + 1, year, parseInt(month) + 1, year);
    } else {
      query += ` AND (
        t.done = 0 
        OR (t.done = 1 AND t.done_date >= DATE_FORMAT(NOW() ,'%Y-%m-01'))
      )`;
    }

    query += ' ORDER BY t.done ASC, t.priority ASC, t.date DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(row => ({
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.is_recurring),
      isGenerated: Boolean(row.is_generated),
      subtasks_count: row.subtasks_count || 0,
      
      userId: row.user_id,
      time: row.time,
      doneDate: row.done_date,
      focusSessions: row.focus_sessions,
      recurrenceType: row.recurrence_type,
      recurrenceValue: row.recurrence_value,
      templateId: row.template_id,
      folderId: row.folder_id
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [rows] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN done = 1 AND DATE(done_date) = CURDATE() THEN 1 END) as completed_today,
        COUNT(CASE WHEN 
          (done = 0 AND (deadline IS NULL OR date <= CURDATE())) 
          OR (done = 1 AND DATE(done_date) = CURDATE()) 
        THEN 1 END) as total_today_plan,
        COUNT(CASE WHEN done = 1 AND YEARWEEK(done_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as completed_week,
        COUNT(CASE WHEN done = 1 AND YEAR(done_date) = YEAR(CURDATE()) AND MONTH(done_date) = MONTH(CURDATE()) THEN 1 END) as completed_month,
        COUNT(CASE WHEN done = 1 THEN 1 END) as completed_total
      FROM tasks 
      WHERE user_id = ?
    `, [userId]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const {
      date, time, deadline, title, priority, comment, done, doneDate,
      focusSessions, isRecurring, recurrenceType, recurrenceValue,
      isGenerated, templateId, folderId
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, date, time, deadline, title, priority, comment, done, done_date, focus_sessions, is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, date, time || null, deadline || null, title, priority || 2, comment || '', done ? 1 : 0,
       doneDate || null, focusSessions || 0, isRecurring ? 1 : 0,
       recurrenceType || null, recurrenceValue || null, isGenerated ? 1 : 0, templateId || null, folderId || null]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    if (rows.length === 0) return res.status(500).json({ error: 'Task not found after insert' });

    const row = rows[0];
    const newTask = {
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.is_recurring),
      isGenerated: Boolean(row.is_generated),
      subtasksCount: 0,
      userId: row.user_id,
      time: row.time,
      doneDate: row.done_date,
      focusSessions: row.focus_sessions,
      recurrenceType: row.recurrence_type,
      recurrenceValue: row.recurrence_value,
      templateId: row.template_id,
      folderId: row.folder_id
    };

    console.log('✅ Task created:', { id: newTask.id, title: newTask.title, time: newTask.time });
    res.json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const {
    date, time, deadline, title, priority, comment, done, doneDate,
    focusSessions, isRecurring, recurrenceType, recurrenceValue,
    isGenerated, templateId, folderId
  } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const oldTask = rows[0];

    await pool.query(
      `UPDATE tasks SET date=?, time=?, deadline=?, title=?, priority=?, comment=?, done=?, done_date=?, 
       focus_sessions=?, is_recurring=?, recurrence_type=?, recurrence_value=?, is_generated=?, template_id=?, folder_id=?
       WHERE id=? AND user_id=?`,
      [
        date, time || null, deadline || null, title, priority || 2, comment || '', done ? 1 : 0,
        doneDate || null, focusSessions || 0, isRecurring ? 1 : 0,
        recurrenceType || null, recurrenceValue || null,
        isGenerated ? 1 : 0, templateId || null, folderId || null,
        taskId, req.userId
      ]
    );

    if (isRecurring && done && !oldTask.done) {
      let nextDate = new Date(date);

      if (recurrenceType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (recurrenceType === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (recurrenceType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (recurrenceType === 'custom' && recurrenceValue) {
        try {
          const days = JSON.parse(recurrenceValue);
          if (Array.isArray(days) && days.length > 0) {
            let found = false;
            for (let i = 1; i <= 7; i++) {
              nextDate.setDate(nextDate.getDate() + 1);
              if (days.includes(nextDate.getDay())) {
                found = true;
                break;
              }
            }
            if (!found) nextDate.setDate(nextDate.getDate() + 1);
          } else {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        } catch(e) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }

      const nextDateStr = nextDate.toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO tasks (user_id, date, time, deadline, title, priority, comment, done, focus_sessions, is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, 1, ?, ?)`,
        [req.userId, nextDateStr, time || null, deadline || null, title, priority || 2, comment || '', recurrenceType, recurrenceValue || null, taskId, folderId || null]
      );

      console.log(`♻️ Цикличная задача создана на ${nextDateStr} в ${time}`);
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [task] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    
    if (task.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Задача удалена', task: task[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/tasks/sync', authenticateToken, async (req, res) => {
  try {
    const { tasks } = req.body;
    const userId = req.userId;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const results = [];
    
    for (const task of tasks) {
      const [existing] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [task.id, userId]);
      
      if (existing.length > 0) {
        await pool.query(
          `UPDATE tasks SET
            date = ?, time = ?, deadline = ?, title = ?, priority = ?, comment = ?,
            done = ?, done_date = ?, focus_sessions = ?,
            is_recurring = ?, recurrence_type = ?, recurrence_value = ?, folder_id = ?
          WHERE id = ? AND user_id = ?`,
          [
            task.date, task.time || null, task.deadline || null, task.title, task.priority || 2, task.comment || '',
            task.done ? 1 : 0, task.doneDate || null, task.focusSessions || 0,
            task.isRecurring ? 1 : 0, task.recurrenceType || null, task.recurrenceValue || null, task.folderId || null,
            task.id, userId
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO tasks (
            id, user_id, date, time, deadline, title, priority, comment,
            done, done_date, focus_sessions,
            is_recurring, recurrence_type, recurrence_value,
            is_generated, template_id, folder_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id, userId, task.date, task.time || null, task.deadline || null, task.title, task.priority || 2, task.comment || '',
            task.done ? 1 : 0, task.doneDate || null, task.focusSessions || 0,
            task.isRecurring ? 1 : 0, task.recurrenceType || null, task.recurrenceValue || null,
            task.isGenerated ? 1 : 0, task.templateId || null, task.folderId || null
          ]
        );
      }
      
      const [synced] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [task.id, userId]);
      results.push(synced[0]);
    }

    res.json({ synced: results.length, tasks: results });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/tasks/delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID задачи требуется' });

    const [task] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (task.length === 0) return res.status(404).json({ error: 'Задача не найдена' });

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ success: true, deleted: id });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== SUBTASKS API ====================

app.get('/api/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
    const [subtasks] = await pool.query('SELECT * FROM subtasks WHERE task_id = ? ORDER BY id ASC', [req.params.taskId]);
    res.json(subtasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const [result] = await pool.query('INSERT INTO subtasks (task_id, title) VALUES (?, ?)', [req.params.taskId, title]);
    res.json({ id: result.insertId, task_id: req.params.taskId, title, completed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subtasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE subtasks SET completed = NOT completed WHERE id = ?', [req.params.id]);
    const [updated] = await pool.query('SELECT * FROM subtasks WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Check SMTP connection if available
  if (emailService && emailService.verifyConnection) {
      await emailService.verifyConnection().catch(() => console.log('SMTP setup skipped'));
  }
});

module.exports = pool;

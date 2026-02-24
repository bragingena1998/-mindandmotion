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
// --- ВСТАВИТЬ ЭТО ---
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

    // 4. Create email_verifications table (если вдруг нет)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create habit_monthly_configs table (Настройки привычки на месяц)
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
    
    // 6. Create subtasks table (Подзадачи)
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

    // 7. Create folders table (Папки/Категории)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50) DEFAULT '📁',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table folders ready');

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

// ==================== USER PROFILE API (ИСПРАВЛЕНО) ====================

// 1. Получение профиля (теперь возвращает gender!)
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

// 2. Обновление профиля (сохраняет пол и дату рождения)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [current] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (current.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = current[0];
    const { name, birthdate, gender } = req.body;
    
    // SQL запрос обновляет только переданные поля
    await pool.query(
      'UPDATE users SET name = ?, birthdate = ?, gender = ? WHERE id = ?',
      [
        name !== undefined ? name : user.name,
        birthdate !== undefined ? birthdate : user.birthdate,
        gender !== undefined ? gender : user.gender,
        req.userId
      ]
    );
    
    // Возвращаем обновленные данные
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

// 3. Смена пароля (НОВЫЙ РОУТ)
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

// Get all habits for user with monthly config
app.get('/api/habits', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // 1. Получаем базовые привычки
    const [habits] = await pool.query(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY order_index ASC, id ASC',
      [req.userId]
    );

    if (!year || !month) {
      return res.json(habits);
    }

    const requestedYear = parseInt(year);
    const requestedMonth = parseInt(month);

    // 2. Получаем специфичные настройки для этого месяца
    const [configs] = await pool.query(
      'SELECT * FROM habit_monthly_configs WHERE habit_id IN (?) AND year = ? AND month = ?',
      [habits.map(h => h.id).length > 0 ? habits.map(h => h.id) : [0], year, month]
    );

    // 3. Получаем записи (records) за этот месяц
    const [records] = await pool.query(
       'SELECT DISTINCT habit_id FROM habit_records WHERE user_id = ? AND year = ? AND month = ?',
       [req.userId, year, month]
    );
    const activeHabitIds = new Set(records.map(r => r.habit_id));

    // 4. Мержим данные
    const mergedHabits = habits.map(habit => {
      const config = configs.find(c => c.habit_id === habit.id);
      
      const effectivePlan = config ? config.plan : habit.plan;
      const effectiveUnit = config ? config.unit : habit.unit;
      const isArchived = config ? config.is_archived : false;

      // ⭐ НОВАЯ ЛОГИКА: Проверяем, существовала ли привычка в запрашиваемом месяце
      const habitStartYear = habit.start_year;
      const habitStartMonth = habit.start_month;
      
      let existedInThisMonth = true; // По умолчанию да (для старых привычек без start_*)
      
      if (habitStartYear && habitStartMonth) {
        // Проверяем: запрашиваемый месяц >= месяца создания?
        // Например: привычка создана в Марте 2026, запрашиваем Январь 2026 -> НЕ показываем
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
        // Показываем если: (существовала в этом месяце) И ((НЕ архивная) ИЛИ (есть записи))
        shouldShow: existedInThisMonth && (!isArchived || activeHabitIds.has(habit.id))
      };
    });

    res.json(mergedHabits);

  } catch (err) {
    console.error('Get habits error:', err);
    res.status(500).json({ error: err.message });
  }
});



// Reorder habits
app.put('/api/habits/reorder', authenticateToken, async (req, res) => {
  try {
    const { habits } = req.body; // Expect array of { id, order_index }
    
    if (!Array.isArray(habits)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    console.log(`🔄 Reordering ${habits.length} habits for user ${req.userId}`);

    // Update each habit's order
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


// Вспомогательная функция (если еще нет)
const parseDateForDB = (dateStr) => {
    if (!dateStr || dateStr === '' || dateStr === 'null') return null;
    return dateStr;
};

// Create habit (DEBUG VERSION)
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

    // 1. Проверка обязательных полей
    if (!name) throw new Error("Field 'name' is required");
    if (!req.userId) throw new Error("User ID is missing");

    // 2. Подготовка данных
    const planVal = parseInt(plan) || 0;
    const targetTypeVal = (target_type && target_type.length <= 20) ? target_type : 'monthly';
    const daysJson = JSON.stringify(Array.isArray(days_of_week) ? days_of_week : []);
    
    // Осторожная обработка дат
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
    // ВОЗВРАЩАЕМ ТЕКСТ ОШИБКИ НА КЛИЕНТ
    res.status(500).json({ 
        error: 'DB_ERROR', 
        message: err.message, 
        sqlMessage: err.sqlMessage 
    });
  }
});


// Update habit
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

// Archive habit (Soft delete for current month)
app.delete('/api/habits/:id', authenticateToken, async (req, res) => {
  try {
    const habitId = req.params.id;
    const { year, month } = req.query; // Получаем из query params!

    if (year && month) {
      console.log(`🗑️ Archiving habit ${habitId} for ${month}.${year}`);
      
      // Создаем конфиг с флагом is_archived = true
      // План и юнит берем текущие (нужно бы их получить, но для упрощения оставим 0/null или текущие)
      // Лучше всего сделать UPSERT, не затирая план, если он там был
      await pool.query(`
        INSERT INTO habit_monthly_configs (habit_id, year, month, is_archived)
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE is_archived = TRUE
      `, [habitId, year, month]);

      res.json({ success: true, message: 'Habit archived for this month' });
    } else {
      // Если год/месяц не переданы - старое полное удаление (опасно, но оставим для совместимости)
      await pool.query('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, req.userId]);
      res.json({ success: true, message: 'Habit deleted permanently' });
    }
  } catch (err) {
    console.error('Delete/Archive error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Get habit records for month
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

// Delete habit record (by body)
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

// Delete habit record (by params)
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

// Get tasks with month filtering
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query; // Ожидаем: month=1 (Февраль), year=2026

    // ИСПОЛЬЗУЕМ t.* ЧТОБЫ ВЕРНУТЬ ВСЕ ПОЛЯ (snake_case)
    let query = `
      SELECT t.*,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtasks_count
      FROM tasks t
      WHERE t.user_id = ?
    `;

    let params = [userId];

    if (month && year) {
      // РЕЖИМ АРХИВА: Показываем задачи, выполненные в конкретном месяце
      // + Задачи, созданные в этом месяце
      query += ` AND (
        (t.done = 1 AND MONTH(t.done_date) = ? AND YEAR(t.done_date) = ?)
        OR 
        (t.done = 0 AND MONTH(t.date) = ? AND YEAR(t.date) = ?)
      )`;
      params.push(parseInt(month) + 1, year, parseInt(month) + 1, year); // SQL MONTH 1-12
    } else {
      // РЕЖИМ АКТУАЛЬНОЕ: Невыполненные + Выполненные в текущем месяце
      query += ` AND (
        t.done = 0 
        OR (t.done = 1 AND t.done_date >= DATE_FORMAT(NOW() ,'%Y-%m-01'))
      )`;
    }

    query += ' ORDER BY t.done ASC, t.priority ASC, t.date DESC'; // Сортировка

    const [rows] = await pool.query(query, params);

    // Маппинг для фронтенда
    const formatted = rows.map(row => ({
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.is_recurring),
      isGenerated: Boolean(row.is_generated),
      subtasks_count: row.subtasks_count || 0,
      
      // Добавляем camelCase алиасы для фронтенда (на всякий случай)
      userId: row.user_id,
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


// Get task statistics (Сегодня, Неделя, Месяц, Всего)
app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [rows] = await pool.query(`
      SELECT 
        -- СЕГОДНЯ (выполнено)
        COUNT(CASE WHEN done = 1 AND DATE(done_date) = CURDATE() THEN 1 END) as completed_today,
        
        -- СЕГОДНЯ (план: не выполнено и (дедлайн <= сегодня или нет дедлайна) + выполнено сегодня)
        COUNT(CASE WHEN 
          (done = 0 AND (deadline IS NULL OR date <= CURDATE())) 
          OR (done = 1 AND DATE(done_date) = CURDATE()) 
        THEN 1 END) as total_today_plan,

        -- НЕДЕЛЯ (выполнено с понедельника)
        COUNT(CASE WHEN done = 1 AND YEARWEEK(done_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as completed_week,

        -- МЕСЯЦ (выполнено в этом месяце)
        COUNT(CASE WHEN done = 1 AND YEAR(done_date) = YEAR(CURDATE()) AND MONTH(done_date) = MONTH(CURDATE()) THEN 1 END) as completed_month,

        -- ВСЕГО (за всё время)
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



// Добавить задачу
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const {
      date, deadline, title, priority, comment, done, doneDate,
      focusSessions, isRecurring, recurrenceType, recurrenceValue,
      isGenerated, templateId, folderId
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, date, deadline, title, priority, comment, done, done_date, focus_sessions, is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, date, deadline || null, title, priority || 2, comment || '', done ? 1 : 0,
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
      doneDate: row.done_date,
      focusSessions: row.focus_sessions,
      recurrenceType: row.recurrence_type,
      recurrenceValue: row.recurrence_value,
      templateId: row.template_id,
      folderId: row.folder_id
    };

    console.log('✅ Task created:', { id: newTask.id, title: newTask.title });
    res.json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  }
});




// Обновление задачи (Редактирование + Логика цикличности)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const {
    date, deadline, title, priority, comment, done, doneDate,
    focusSessions, isRecurring, recurrenceType, recurrenceValue,
    isGenerated, templateId, folderId
  } = req.body;

  try {
    // 1. Получаем текущую задачу, чтобы проверить изменился ли статус done
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const oldTask = rows[0];

    // 2. Обновляем текущую задачу
    await pool.query(
      `UPDATE tasks SET date=?, deadline=?, title=?, priority=?, comment=?, done=?, done_date=?, 
       focus_sessions=?, is_recurring=?, recurrence_type=?, recurrence_value=?, is_generated=?, template_id=?, folder_id=?
       WHERE id=? AND user_id=?`,
      [
        date, deadline || null, title, priority || 2, comment || '', done ? 1 : 0,
        doneDate || null, focusSessions || 0, isRecurring ? 1 : 0,
        recurrenceType || null, recurrenceValue || null,
        isGenerated ? 1 : 0, templateId || null, folderId || null,
        taskId, req.userId
      ]
    );

    // 3. ЛОГИКА ЦИКЛИЧНОСТИ: Если задачу только что выполнили (было 0, стало 1) и она цикличная
    if (isRecurring && done && !oldTask.done) {
      let nextDate = new Date(date);

      // Прибавляем интервал
      if (recurrenceType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (recurrenceType === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (recurrenceType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (recurrenceType === 'custom' && recurrenceValue) {
        // Парсим кастомные дни недели. Пример: "[1,3,5]" (где 1=Пн, 3=Ср, 5=Пт, 0=Вс)
        try {
          const days = JSON.parse(recurrenceValue);
          if (Array.isArray(days) && days.length > 0) {
            let found = false;
            // Ищем следующий подходящий день недели (до 7 дней вперед)
            for (let i = 1; i <= 7; i++) {
              nextDate.setDate(nextDate.getDate() + 1);
              if (days.includes(nextDate.getDay())) {
                found = true;
                break;
              }
            }
            if (!found) nextDate.setDate(nextDate.getDate() + 1); // fallback
          } else {
            nextDate.setDate(nextDate.getDate() + 1); // fallback
          }
        } catch(e) {
          nextDate.setDate(nextDate.getDate() + 1); // fallback
        }
      }

      const nextDateStr = nextDate.toISOString().split('T')[0];

      // Создаем клона задачи на следующую дату (done = 0)
      await pool.query(
        `INSERT INTO tasks (user_id, date, deadline, title, priority, comment, done, focus_sessions, is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, 1, ?, ?)`,
        [req.userId, nextDateStr, deadline || null, title, priority || 2, comment || '', recurrenceType, recurrenceValue || null, taskId, folderId || null]
      );

      console.log(`♻️ Цикличная задача создана на ${nextDateStr}`);
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// Удалить задачу
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Запрос на удаление задачи:', id, 'от пользователя:', req.userId);
    
    const [task] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    
    if (task.length === 0) {
      console.log('⚠️ Задача не найдена');
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    console.log('✅ Задача успешно удалена:', id);
    res.json({ message: 'Задача удалена', task: task[0] });
  } catch (err) {
    console.error('❌ Ошибка удаления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


// Массовое обновление задач
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
            is_recurring = ?, recurrence_type = ?, recurrence_value = ?, folder_id = ?
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
            task.folderId || null,
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
            is_generated, template_id, folder_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            task.templateId || null,
            task.folderId || null
          ]
        );
      }
      
      const [synced] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [task.id, userId]);
      results.push(synced[0]);
    }

    console.log(`✓ Synced \\${results.length} tasks for user \\${userId}`);
    res.json({ synced: results.length, tasks: results });
  } catch (err) {
    console.error('Ошибка синхронизации задач:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить задачу (новый endpoint)
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
    
    console.log(`✅ Deleted task: \\${id}`);
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
  const cleanCode = String(code).replace(/\\s+/g, '');

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
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
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
  const cleanCode = String(code).replace(/\\s+/g, '');

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


// ============================================
// SUBTASKS API (Подзадачи)
// ============================================

// Get subtasks for a task
app.get('/api/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
    const [subtasks] = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY id ASC',
      [req.params.taskId]
    );
    res.json(subtasks);
  } catch (err) {
    console.error('Get subtasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create subtask
app.post('/api/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const [result] = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES (?, ?)',
      [req.params.taskId, title]
    );
    res.json({ id: result.insertId, task_id: req.params.taskId, title, completed: false });
  } catch (err) {
    console.error('Create subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle subtask
app.put('/api/subtasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE subtasks SET completed = NOT completed WHERE id = ?',
      [req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM subtasks WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Toggle subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete subtask
app.delete('/api/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM subtasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// СЕКРЕТНЫЙ ЧАТ 4.0 (ОВОЩНОЙ АПОКАЛИПСИС)
// ===============================================

// Хелпер для ГМО-эффектов
const applyGMO = (text) => {
  const effects = [
    t => t.toUpperCase(), // КАПС
    t => t.split('').join('-'), // Р-а-з-р-я-д-к-а
    t => t.replace(/[аоеиуыэюя]/gi, 'Ы'), // Ы-фикация
    t => t.split(' ').reverse().join(' '), // Реверс слов
    t => `🥒 ${t} 🥒` // Огурцы
  ];
  const effect = effects[Math.floor(Math.random() * effects.length)];
  return effect(text);
};

// Хелпер для МУТА (Мычание)
const applyMute = () => {
  const variants = [
    "*невнятно мычит через кабачок*",
    "*пытается что-то сказать, но рот заклеен ботвой*",
    "мммм... м-м-м... (звуки из подвала)",
    "*глухие удары головой о клавиатуру*"
  ];
  return variants[Math.floor(Math.random() * variants.length)];
};

// 1. ПОЛУЧИТЬ СООБЩЕНИЯ + НАСТРОЙКИ
app.get('/api/secret-chat', async (req, res) => {
  try {
    const [messages] = await pool.query(`
      SELECT sc.*, u.rank, u.name as real_name,
      (SELECT COUNT(*) FROM message_reactions mr WHERE mr.message_id = sc.id AND mr.type = 'tomato') as tomato_count
      FROM secret_chat sc 
      LEFT JOIN users u ON sc.user_id = u.id 
      ORDER BY sc.created_at ASC 
      LIMIT 100
    `);

    const [settings] = await pool.query("SELECT * FROM chat_settings");
    const settingsMap = settings.reduce((acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }), {});

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      userName: msg.user_name || msg.real_name || 'Аноним',
      userRank: msg.rank || 'Семечка Сомнения',
      isAuthor: msg.user_id === 999,
      timestamp: msg.created_at,
      userId: msg.user_id,
      tomatoCount: msg.tomato_count || 0
    }));
    
    // ВАЖНО: Добавляем текущий пароль в настройки, чтобы клиент мог проверить, не изменился ли он
    // (В реальном продакшене так делать НЕЛЬЗЯ, надо отдавать хеш, но для нас пойдет)
    res.json({ messages: formattedMessages, settings: settingsMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2. ОТПРАВИТЬ СООБЩЕНИЕ (С ЛОГИКОЙ МУТА И ГМО)
app.post('/api/secret-chat', async (req, res) => {
  try {
    let { text, isAuthorMode, userId } = req.body; 
    
    if (!text || !text.trim()) return res.status(400).json({ error: 'Пустое сообщение' });

    // РУЛЕТКА (/roll)
    if (text.trim() === '/roll') {
      const rolls = [
        "выиграл право на лишний полив!",
        "должен присесть 10 раз во славу Моркови.",
        "назначается Гнилым Бананом на 5 минут.",
        "получает благословение Великой Свеклы.",
        "должен съесть сырую картофелину."
      ];
      const result = rolls[Math.floor(Math.random() * rolls.length)];
      
      // Ищем имя юзера
      let rollerName = 'Аноним';
      if (userId) {
        const [u] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
        if (u.length) rollerName = u[0].name;
      }

      await pool.query(
        'INSERT INTO secret_chat (user_id, user_name, content) VALUES (?, ?, ?)',
        [999, 'ОВОЩНАЯ РУЛЕТКА', `${rollerName} ${result}`]
      );
      return res.json({ success: true });
    }

    // РЕЖИМ АВТОРА
    if (userId === 4 && isAuthorMode) {
      await pool.query(
        'INSERT INTO secret_chat (user_id, user_name, content) VALUES (?, ?, ?)',
        [999, 'ГОЛОС АВТОРА', text]
      );
      return res.status(201).json({ success: true });
    }

    // ОБЫЧНЫЙ ЮЗЕР
    let senderId = userId || 0;
    let senderName = 'Аноним';
    let isMuted = false;
    let isInfected = false;

    if (userId) {
      const [userRows] = await pool.query('SELECT name, muted_until, gmo_infected FROM users WHERE id = ?', [userId]);
      if (userRows.length > 0) {
        senderName = userRows[0].name;
        isInfected = userRows[0].gmo_infected; // Проверка ГМО
        
        // Проверка МУТА
        if (userRows[0].muted_until) {
          const mutedUntil = new Date(userRows[0].muted_until);
          if (mutedUntil > new Date()) isMuted = true;
        }
      }
    }

    // ПРИМЕНЯЕМ ЭФФЕКТЫ
    if (isMuted) {
      text = applyMute(); // Заменяем текст на мычание
    } else if (isInfected) {
      text = applyGMO(text); // Искажаем текст
    }

    await pool.query(
      'INSERT INTO secret_chat (user_id, user_name, content) VALUES (?, ?, ?)',
      [senderId, senderName, text]
    );
    
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Send Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ПОМИДОРЫ (ДИЗЛАЙКИ)
app.post('/api/secret-chat/tomato', async (req, res) => {
  const { messageId, userId } = req.body;
  try {
    await pool.query('INSERT IGNORE INTO message_reactions (message_id, user_id, type) VALUES (?, ?, ?)', [messageId, userId, 'tomato']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. НАКАЗАНИЯ И ГМО
app.post('/api/secret-chat/punish', async (req, res) => {
  const { targetId, targetName, type, duration, reason } = req.body; 
  
  try {
    let systemMessage = '';

    if (type === 'mute') {
      const muteTime = new Date(Date.now() + duration * 60000);
      await pool.query('UPDATE users SET muted_until = ? WHERE id = ?', [muteTime, targetId]);
      systemMessage = `🔇 ${targetName} отправлен в компостную яму на ${duration} мин.`;
    } 
    else if (type === 'gmo') {
      // Заражаем ГМО
      await pool.query('UPDATE users SET gmo_infected = 1 WHERE id = ?', [targetId]);
      systemMessage = `🧬 ${targetName} заражен ГМО-вирусом! Его речь мутирует.`;
    }
    else if (type === 'cure') {
      // Лечим
      await pool.query('UPDATE users SET gmo_infected = 0, muted_until = NULL WHERE id = ?', [targetId]);
      systemMessage = `💊 ${targetName} исцелен молитвами Свеклы.`;
    }
    else {
      systemMessage = `🍆 Админ наказал ${targetName}: ${reason}`;
    }

    await pool.query(
      'INSERT INTO secret_chat (user_id, user_name, content) VALUES (?, ?, ?)',
      [999, 'СИСТЕМА НАКАЗАНИЙ', systemMessage]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. НАСТРОЙКИ (СМЕНА ПАРОЛЯ, ЗАГОЛОВКА, ПИСАНИЯ)
app.put('/api/secret-chat/settings', async (req, res) => {
  const { key, value } = req.body; // key: 'chat_password' | 'login_title' | 'sacred_text'
  try {
    // INSERT ON DUPLICATE UPDATE
    await pool.query(`
      INSERT INTO chat_settings (setting_key, setting_value) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `, [key, value]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- СТАНДАРТНЫЕ (Login, Users, Rank, Clear) ---
app.post('/api/secret-chat/login', async (req, res) => {
  const { userId, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT setting_value FROM chat_settings WHERE setting_key = 'chat_password'");
    const currentPassword = rows[0]?.setting_value || 'семечка сомнения';

    if (password.toLowerCase().trim() === currentPassword.toLowerCase().trim()) {
      if (userId) await pool.query('UPDATE users SET is_cult_member = 1 WHERE id = ?', [userId]);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Неверный пароль' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/secret-chat/users', async (req, res) => {
  try { const [users] = await pool.query('SELECT id, name, rank, gmo_infected FROM users WHERE is_cult_member = 1'); res.json(users); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/secret-chat/rank', async (req, res) => {
  const { userId, newRank } = req.body;
  try { await pool.query('UPDATE users SET rank = ? WHERE id = ?', [newRank, userId]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/secret-chat/clear', async (req, res) => {
  try { await pool.query('TRUNCATE TABLE secret_chat'); await pool.query('TRUNCATE TABLE message_reactions'); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});


// ========================================
// API: ДНИ РОЖДЕНИЯ (BIRTHDAYS)
// ========================================

// Get birthdays
app.get('/api/birthdays', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM birthdays WHERE user_id = ? ORDER BY month ASC, day ASC', 
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add birthday
app.post('/api/birthdays', authenticateToken, async (req, res) => {
  try {
    const { name, day, month, year } = req.body;
    if (!name || !day || !month) return res.status(400).json({ error: 'Missing fields' });

    const [result] = await pool.query(
      'INSERT INTO birthdays (user_id, name, day, month, year) VALUES (?, ?, ?, ?, ?)',
      [req.userId, name, day, month, year || null]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete birthday
app.delete('/api/birthdays/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM birthdays WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ПАПКИ (FOLDERS)
// ========================================

// Получить папки пользователя
app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM folders WHERE user_id = ? ORDER BY id ASC', [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Создать папку
app.post('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Название папки обязательно' });
    
    const [result] = await pool.query(
      'INSERT INTO folders (user_id, name, icon) VALUES (?, ?, ?)',
      [req.userId, name, icon || '📁']
    );
    res.json({ id: result.insertId, user_id: req.userId, name, icon: icon || '📁' });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удалить папку
app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true, message: 'Папка удалена' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Проверяем SMTP соединение
  await emailService.verifyConnection();
});



module.exports = pool;
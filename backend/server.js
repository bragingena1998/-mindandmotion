const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const emailService = require('./emailService');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));

// --- Логирование ---
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    // console.log('Body:', req.body);
  }
  next();
});

// -------------------- MySQL connection pool --------------------
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
    console.log('✅ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err);
  });

// ... Initialize database tables ...
async function initializeDB() {
  try {
    // 1. Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        date DATE NOT NULL,
        deadline DATE,
        time VARCHAR(5) DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        priority INT DEFAULT 2,
        comment TEXT,
        done BOOLEAN DEFAULT FALSE,
        donedate DATETIME,
        focussessions INT DEFAULT 0,
        isrecurring BOOLEAN DEFAULT FALSE,
        recurrencetype VARCHAR(50),
        recurrencevalue VARCHAR(50),
        isgenerated BOOLEAN DEFAULT FALSE,
        templateid INT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 2. Create habits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) DEFAULT '',
        plan INT DEFAULT 0,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // ... (стальные миграции оставлены как есть) ...

    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}
initializeDB();

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = user.userId;
    next();
  });
}

// ... Authentication Endpoints ...

// ==========================================
// TASKS API
// ==========================================

// Get tasks with month filtering
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query; 

    let query = `
      SELECT 
        id, userid, date, deadline, time, title, priority, comment, 
        done, donedate, focussessions, 
        isrecurring as isRecurring, recurrencetype as recurrenceType, recurrencevalue as recurrenceValue, 
        isgenerated as isGenerated 
      FROM tasks 
      WHERE userid = ?
    `;
    let params = [userId];

    if (month && year) {
      query += `
        AND (
          (done = 1 AND MONTH(donedate) = ? AND YEAR(donedate) = ?)
          OR 
          (done = 0 AND MONTH(date) = ? AND YEAR(date) = ?)
        )
      `;
      params.push(parseInt(month) + 1, year, parseInt(month) + 1, year);
    } else {
      query += ` AND (done = 0 OR (done = 1 AND donedate >= DATE_FORMAT(NOW() ,'%Y-%m-01')) )`;
    }

    query += ` ORDER BY done ASC, priority ASC, date DESC`;

    const [rows] = await pool.query(query, params);
    
    const formatted = rows.map(row => ({
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.isRecurring),
      isGenerated: Boolean(row.isGenerated)
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { 
      date, deadline, title, priority, comment, done, doneDate, 
      focusSessions, isRecurring, recurrenceType, recurrenceValue, 
      isGenerated, templateId, time 
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tasks (
        userid, date, deadline, time, title, priority, comment, done, donedate, 
        focussessions, isrecurring, recurrencetype, recurrencevalue, isgenerated, templateid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, date, deadline || null, time || null, title, priority || 2, 
        comment || '', done ? 1 : 0, doneDate || null, focusSessions || 0, 
        isRecurring ? 1 : 0, recurrenceType || null, recurrenceValue || null, 
        isGenerated ? 1 : 0, templateId || null
      ]
    );

    const [rows] = await pool.query(
      `SELECT id, userid, date, deadline, time, title, priority, comment, done, donedate as doneDate, 
       focussessions as focusSessions, isrecurring as isRecurring, recurrencetype as recurrenceType, 
       recurrencevalue as recurrenceValue, isgenerated as isGenerated, templateid as templateId, 
       createdat, updatedat FROM tasks WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) return res.status(500).json({ error: 'Failed to retrieve created task' });

    const newTask = {
      ...rows[0],
      done: Boolean(rows[0].done),
      isRecurring: Boolean(rows[0].isRecurring),
      isGenerated: Boolean(rows[0].isGenerated)
    };

    res.json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      date, deadline, time, title, priority, comment, done, 
      doneDate, focussessions, isrecurring, recurrencetype, recurrencevalue 
    } = req.body;

    await pool.query(
      `UPDATE tasks SET 
        date = ?, deadline = ?, time = ?, title = ?, priority = ?, comment = ?, 
        done = ?, donedate = ?, focussessions = ?, isrecurring = ?, 
        recurrencetype = ?, recurrencevalue = ? 
       WHERE id = ? AND userid = ?`,
      [
        date, deadline || null, time || null, title, priority, comment, 
        done ? 1 : 0, doneDate || null, focussessions, isrecurring ? 1 : 0, 
        recurrencetype || null, recurrencevalue || null, id, req.userId
      ]
    );

    const [updated] = await pool.query('SELECT * FROM tasks WHERE id = ? AND userid = ?', [id, req.userId]);
    if (updated.length === 0) return res.status(404).json({ error: 'Task not found' });
    
    res.json(updated[0]);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [task] = await pool.query('SELECT * FROM tasks WHERE id = ? AND userid = ?', [id, req.userId]);
    if (task.length === 0) return res.status(404).json({ error: 'Task not found' });
    
    await pool.query('DELETE FROM tasks WHERE id = ? AND userid = ?', [id, req.userId]);
    res.json({ message: 'Task deleted', task: task[0] });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task statistics
app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN done = 1 AND DATE(donedate) = CURDATE() THEN 1 END) as completed_today,
        COUNT(CASE WHEN done = 0 AND (deadline IS NULL OR date <= CURDATE()) OR (done = 1 AND DATE(donedate) = CURDATE()) THEN 1 END) as total_today_plan,
        COUNT(CASE WHEN done = 1 AND YEARWEEK(donedate, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as completed_week,
        COUNT(CASE WHEN done = 1 AND YEAR(donedate) = YEAR(CURDATE()) AND MONTH(donedate) = MONTH(CURDATE()) THEN 1 END) as completed_month,
        COUNT(CASE WHEN done = 1 THEN 1 END) as completed_total 
      FROM tasks 
      WHERE userid = ?
    `, [req.userId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
});

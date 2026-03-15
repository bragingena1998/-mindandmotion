const pool = require('./db');

async function initializeDB() {
  try {
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

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

    // Миграции habits
    const habitMigrations = [
      { col: 'start_year',   sql: 'ADD COLUMN start_year INT DEFAULT NULL, ADD COLUMN start_month INT DEFAULT NULL' },
      { col: 'order_index',  sql: 'ADD COLUMN order_index INT DEFAULT 0' },
      { col: 'target_type',  sql: "ADD COLUMN target_type VARCHAR(20) DEFAULT 'monthly', ADD COLUMN start_date DATE DEFAULT NULL, ADD COLUMN end_date DATE DEFAULT NULL, ADD COLUMN days_of_week TEXT DEFAULT NULL" },
    ];
    for (const m of habitMigrations) {
      const [cols] = await pool.query(`SHOW COLUMNS FROM habits LIKE '${m.col}'`);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE habits ${m.sql}`);
        console.log(`✅ habits: migration '${m.col}' done`);
      }
    }

    // Миграция users.gender
    const [genderCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'gender'");
    if (genderCol.length === 0) {
      await pool.query(`ALTER TABLE users ADD COLUMN gender VARCHAR(10) DEFAULT 'male'`);
      console.log('✅ users: gender column added');
    }

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Миграции folders и tasks
    const tableMigrations = [
      { table: 'folders', col: 'order_index', sql: 'ADD COLUMN order_index INT DEFAULT 0' },
      { table: 'tasks',   col: 'folder_id',   sql: 'ADD COLUMN folder_id INT DEFAULT NULL' },
      { table: 'tasks',   col: 'focus_sessions', sql: 'ADD COLUMN focus_sessions INT DEFAULT 0' },
      { table: 'tasks',   col: 'time',        sql: 'ADD COLUMN time VARCHAR(5) DEFAULT NULL AFTER date' },
    ];
    for (const m of tableMigrations) {
      const [cols] = await pool.query(`SHOW COLUMNS FROM ${m.table} LIKE '${m.col}'`);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE ${m.table} ${m.sql}`);
        console.log(`✅ ${m.table}: migration '${m.col}' done`);
      }
    }

    console.log('✓ Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initializeDB();

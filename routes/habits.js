const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const parseDateForDB = (dateStr) => {
  if (!dateStr || dateStr === '' || dateStr === 'null') return null;
  return dateStr;
};

// GET /api/habits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;

    // Если указаны year и month — фильтруем привычки активные в этом месяце
    if (year && month) {
      const requestedYear = parseInt(year);
      const requestedMonth = parseInt(month);

      const sql = `SELECT h.* FROM habits h
         WHERE h.user_id = ?
         AND (
           h.start_year < ? OR 
           (h.start_year = ? AND h.start_month <= ?)
         )
         AND NOT EXISTS (
           SELECT 1 FROM habit_monthly_configs hmc
           WHERE hmc.habit_id = h.id
           AND hmc.year = ? AND hmc.month = ?
           AND hmc.is_archived = 1
         )
         ORDER BY h.order_index ASC, h.id ASC`;
      
      const params = [req.userId, requestedYear, requestedYear, requestedMonth, requestedYear, requestedMonth];
      console.log('[GET /habits] SQL:', sql.replace(/\s+/g, ' ').trim());
      console.log('[GET /habits] Params:', params);

      const [habits] = await pool.query(sql, params);
      console.log(`[GET /habits] Found ${habits.length} habits for ${requestedYear}-${requestedMonth}`);
      return res.json(habits);
    }

    // Без year/month — возвращаем все привычки пользователя
    const [habits] = await pool.query(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY order_index ASC, id ASC',
      [req.userId]
    );

    res.json(habits);
  } catch (err) {
    console.error('Get habits error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/habits/reorder  — ВАЖНО: выше /:id
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const { habits } = req.body;
    if (!Array.isArray(habits)) return res.status(400).json({ error: 'Invalid data format' });

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

// GET /api/habits/records/:year/:month  — ВАЖНО: выше /:id
router.get('/records/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const [records] = await pool.query(
      `SELECT habit_id as habitid, day, value FROM habit_records
       WHERE user_id = ? AND year = ? AND month = ? ORDER BY day`,
      [req.userId, parseInt(year), parseInt(month)]
    );
    console.log(`✓ Loaded ${records.length} records for user ${req.userId}, ${year}-${month}`);
    res.json(records);
  } catch (err) {
    console.error('❌ Error loading records:', err);
    res.status(500).json({ error: 'Failed to load records' });
  }
});

// POST /api/habits/records  — ВАЖНО: выше /:id
router.post('/records', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day, value } = req.body;
    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, req.userId]
    );
    if (habits.length === 0) return res.status(404).json({ error: 'Habit not found' });

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

// DELETE /api/habits/records  — по body
router.delete('/records', authenticateToken, async (req, res) => {
  try {
    const { habit_id, year, month, day } = req.body;
    const userId = req.userId;

    if (!habit_id || !year || !month || !day) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habit_id, userId]
    );
    if (habits.length === 0) return res.status(404).json({ error: 'Habit not found' });

    await pool.query(
      'DELETE FROM habit_records WHERE habit_id = ? AND year = ? AND month = ? AND day = ?',
      [habit_id, year, month, day]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/habits/records/:habit_id/:year/:month/:day
router.delete('/records/:habit_id/:year/:month/:day', authenticateToken, async (req, res) => {
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

// POST /api/habits
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, unit, plan, year, month, target_type, start_date, end_date, days_of_week } = req.body;
    if (!name) throw new Error("Field 'name' is required");

    const planVal = parseInt(plan) || 0;
    const targetTypeVal = (target_type && target_type.length <= 20) ? target_type : 'monthly';
    const daysJson = JSON.stringify(Array.isArray(days_of_week) ? days_of_week : []);
    const formatDate = (d) => (!d || d === '' || d === 'null') ? null : d;

    const [result] = await pool.query(
      `INSERT INTO habits (user_id, name, unit, plan, start_year, start_month, target_type, start_date, end_date, days_of_week)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, name, unit || 'раз', planVal,
       year || new Date().getFullYear(),
       month || new Date().getMonth() + 1,
       targetTypeVal, formatDate(start_date), formatDate(end_date), daysJson]
    );
    res.json({ id: result.insertId, success: true });
  } catch (err) {
    console.error('❌ CRITICAL DB ERROR:', err);
    res.status(500).json({ error: 'DB_ERROR', message: err.message, sqlMessage: err.sqlMessage });
  }
});

// PUT /api/habits/:id/monthly-config  — ВАЖНО: выше /:id
router.put('/:id/monthly-config', authenticateToken, async (req, res) => {
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

// PUT /api/habits/:id/archive - Archive habit for specific month  — ВАЖНО: выше /:id
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const habitId = req.params.id;
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    // Verify habit belongs to user
    const [habits] = await pool.query(
      'SELECT id FROM habits WHERE id = ? AND user_id = ?',
      [habitId, req.userId]
    );
    if (habits.length === 0) return res.status(404).json({ error: 'Habit not found' });

    // Archive habit for this month
    await pool.query(
      `INSERT INTO habit_monthly_configs (habit_id, year, month, is_archived) 
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE is_archived = TRUE`,
      [habitId, year, month]
    );

    res.json({ success: true, message: 'Habit archived for this month' });
  } catch (err) {
    console.error('❌ Archive habit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/habits/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, plan, target_type, start_date, end_date, days_of_week } = req.body;

    const daysOfWeekJson = Array.isArray(days_of_week) ? JSON.stringify(days_of_week) : '[]';
    const startDateDB = parseDateForDB(start_date);
    const endDateDB = parseDateForDB(end_date);

    const [result] = await pool.query(
      `UPDATE habits SET name = ?, unit = ?, plan = ?, target_type = ?, start_date = ?, end_date = ?, days_of_week = ?
       WHERE id = ? AND user_id = ?`,
      [name, unit, plan, target_type || 'monthly', startDateDB, endDateDB, daysOfWeekJson, id, req.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Habit not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Update habit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/habits/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const habitId = req.params.id;
    const { year, month } = req.query;

    if (year && month) {
      await pool.query(
        `INSERT INTO habit_monthly_configs (habit_id, year, month, is_archived) VALUES (?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE is_archived = TRUE`,
        [habitId, year, month]
      );
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

module.exports = router;

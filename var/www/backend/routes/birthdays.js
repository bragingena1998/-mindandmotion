const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/birthdays
router.get('/', authenticateToken, async (req, res) => {
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

// POST /api/birthdays
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, day, month, year, type, notify_before } = req.body;
    if (!name || !day || !month) return res.status(400).json({ error: 'Missing fields' });

    const [result] = await pool.query(
      'INSERT INTO birthdays (user_id, name, day, month, year, type, notify_before) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.userId,
        name,
        parseInt(day),
        parseInt(month),
        year ? parseInt(year) : null,
        type || 'birthday',
        notify_before != null ? parseInt(notify_before) : 1
      ]
    );
    res.json({ id: result.insertId, name, day: parseInt(day), month: parseInt(month), year: year ? parseInt(year) : null, type: type || 'birthday', notify_before: notify_before != null ? parseInt(notify_before) : 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/birthdays/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, day, month, year, type, notify_before } = req.body;
    const fields = [];
    const values = [];

    if (name       !== undefined) { fields.push('name = ?');          values.push(name); }
    if (day        !== undefined) { fields.push('day = ?');           values.push(parseInt(day)); }
    if (month      !== undefined) { fields.push('month = ?');         values.push(parseInt(month)); }
    if (year       !== undefined) { fields.push('year = ?');          values.push(year ? parseInt(year) : null); }
    if (type       !== undefined) { fields.push('type = ?');          values.push(type); }
    if (notify_before !== undefined) { fields.push('notify_before = ?'); values.push(parseInt(notify_before)); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.id, req.userId);
    await pool.query(
      `UPDATE birthdays SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/birthdays/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM birthdays WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

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

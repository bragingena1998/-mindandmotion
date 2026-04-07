const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { deleteDemoData } = require('../utils/demoData');

let hasGenderColumnCache = null;
async function hasGenderColumn() {
  if (hasGenderColumnCache !== null) return hasGenderColumnCache;
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'gender'");
    hasGenderColumnCache = rows.length > 0;
  } catch (error) {
    hasGenderColumnCache = false;
  }
  return hasGenderColumnCache;
}

// GET /api/user/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const hasGender = await hasGenderColumn();
    const selectFields = hasGender
      ? 'id, email, name, birthdate, gender, created_at'
      : "id, email, name, birthdate, 'male' as gender, created_at";
    const [users] = await pool.query(
      `SELECT ${selectFields} FROM users WHERE id = ?`,
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const hasGender = await hasGenderColumn();
    const [current] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (current.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = current[0];
    const { name, birthdate, gender } = req.body;

    if (hasGender) {
      await pool.query(
        'UPDATE users SET name = ?, birthdate = ?, gender = ? WHERE id = ?',
        [
          name !== undefined ? name : user.name,
          birthdate !== undefined ? birthdate : user.birthdate,
          gender !== undefined ? gender : user.gender,
          req.userId
        ]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, birthdate = ? WHERE id = ?',
        [
          name !== undefined ? name : user.name,
          birthdate !== undefined ? birthdate : user.birthdate,
          req.userId
        ]
      );
    }

    const selectFields = hasGender
      ? 'id, email, name, birthdate, gender, created_at'
      : "id, email, name, birthdate, 'male' as gender, created_at";
    const [updated] = await pool.query(
      `SELECT ${selectFields} FROM users WHERE id = ?`,
      [req.userId]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/password
router.put('/password', authenticateToken, async (req, res) => {
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

// DELETE /api/user/demo-data
router.delete('/demo-data', authenticateToken, async (req, res) => {
  try {
    const result = await deleteDemoData(req.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

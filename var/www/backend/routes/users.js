const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/user/profile
router.get('/profile', authenticateToken, async (req, res) => {
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

// PUT /api/user/profile
router.put('/profile', authenticateToken, async (req, res) => {
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

module.exports = router;

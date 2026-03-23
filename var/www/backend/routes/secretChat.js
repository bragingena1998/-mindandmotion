/**
 * Тайный чат (огород) — API для SecretChatScreen.js
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const DEFAULT_RANK = 'Семечка Сомнения';

async function ensureDefaults() {
  await pool.query(`
    INSERT IGNORE INTO chat_settings (`key`, `value`) VALUES
    ('chat_password', 'семечка сомнения'),
    ('login_title', 'Тайный огород'),
    ('sacred_text', '')
  `);
}

async function getAllSettings() {
  await ensureDefaults();
  const [rows] = await pool.query('SELECT `key`, `value` FROM chat_settings');
  const o = {};
  rows.forEach((r) => {
    o[r.key] = r.value;
  });
  return o;
}

// GET /api/secret-chat
router.get('/secret-chat', authenticateToken, async (req, res) => {
  try {
    const settings = await getAllSettings();
    const [messages] = await pool.query(
      `SELECT m.id,
              m.user_id AS userId,
              m.text,
              m.tomato_count AS tomatoCount,
              m.is_author AS isAuthor,
              u.name AS userName
       FROM chat_messages m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.id ASC`
    );
    const mapped = messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.userName,
      text: m.text,
      tomatoCount: m.tomatoCount,
      isAuthor: !!m.isAuthor,
    }));
    res.json({ messages: mapped, settings });
  } catch (err) {
    console.error('secret-chat GET:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secret-chat/login
router.post('/secret-chat/login', authenticateToken, async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'Нужны userId и пароль' });
    }
    if (Number(req.userId) !== Number(userId)) {
      return res.status(403).json({ error: 'Несовпадение пользователя' });
    }
    const settings = await getAllSettings();
    const serverPw = (settings.chat_password || 'семечка сомнения').toLowerCase().trim();
    if (password.toLowerCase().trim() !== serverPw) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat login:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secret-chat — новое сообщение
router.post('/secret-chat', authenticateToken, async (req, res) => {
  try {
    const { text, isAuthorMode, userId } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Пустое сообщение' });
    }
    if (Number(req.userId) !== Number(userId)) {
      return res.status(403).json({ error: 'Несовпадение пользователя' });
    }
    const isAuthor = isAuthorMode ? 1 : 0;
    if (isAuthor && Number(userId) !== 4) {
      return res.status(403).json({ error: 'Режим автора только для админа' });
    }
    await pool.query(
      'INSERT INTO chat_messages (user_id, text, is_author) VALUES (?, ?, ?)',
      [userId, String(text).trim(), isAuthor]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat POST:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secret-chat/tomato
router.post('/secret-chat/tomato', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId' });
    await pool.query(
      'UPDATE chat_messages SET tomato_count = tomato_count + 1 WHERE id = ?',
      [messageId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat tomato:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secret-chat/punish
router.post('/secret-chat/punish', authenticateToken, async (req, res) => {
  try {
    if (Number(req.userId) !== 4) {
      return res.status(403).json({ error: 'Только админ' });
    }
    const { targetId, type, duration, reason } = req.body;
    if (!targetId || !type) return res.status(400).json({ error: 'targetId, type' });

    if (type === 'gmo') {
      await pool.query(
        `INSERT INTO chat_user_meta (user_id, gmo_infected, rank_name)
         VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE gmo_infected = 1`,
        [targetId, DEFAULT_RANK]
      );
    } else if (type === 'cure') {
      await pool.query(
        `INSERT INTO chat_user_meta (user_id, gmo_infected, rank_name)
         VALUES (?, 0, ?)
         ON DUPLICATE KEY UPDATE gmo_infected = 0`,
        [targetId, DEFAULT_RANK]
      );
    } else if (type === 'mute' && duration) {
      await pool.query(
        `INSERT INTO chat_user_meta (user_id, mute_until, rank_name)
         VALUES (?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)
         ON DUPLICATE KEY UPDATE mute_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)`,
        [targetId, Number(duration), DEFAULT_RANK, Number(duration)]
      );
    } else if (type === 'shame') {
      // Заглушка: наказание «позор» — без отдельной таблицы
      console.log('secret-chat shame:', targetId, reason);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat punish:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/secret-chat/settings
router.put('/secret-chat/settings', authenticateToken, async (req, res) => {
  try {
    if (Number(req.userId) !== 4) {
      return res.status(403).json({ error: 'Только админ' });
    }
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key' });
    await pool.query(
      'INSERT INTO secret_chat_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, value != null ? String(value) : '']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/secret-chat/users
router.get('/secret-chat/users', authenticateToken, async (req, res) => {
  try {
    if (Number(req.userId) !== 4) {
      return res.status(403).json({ error: 'Только админ' });
    }
    const [rows] = await pool.query(
      `SELECT u.id,
              u.name,
              COALESCE(m.rank_name, ?) AS \`rank\`,
              COALESCE(m.gmo_infected, 0) AS gmo_infected
       FROM users u
       LEFT JOIN chat_user_meta m ON m.user_id = u.id
       ORDER BY u.id ASC`,
      [DEFAULT_RANK]
    );
    const list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      rank: r.rank,
      gmo_infected: !!r.gmo_infected,
    }));
    res.json(list);
  } catch (err) {
    console.error('secret-chat users:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/secret-chat/rank
router.put('/secret-chat/rank', authenticateToken, async (req, res) => {
  try {
    if (Number(req.userId) !== 4) {
      return res.status(403).json({ error: 'Только админ' });
    }
    const { userId, newRank } = req.body;
    if (!userId || !newRank) return res.status(400).json({ error: 'userId, newRank' });
    await pool.query(
      `INSERT INTO chat_user_meta (user_id, rank_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE rank_name = VALUES(rank_name)`,
      [userId, newRank]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat rank:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secret-chat/clear
router.post('/secret-chat/clear', authenticateToken, async (req, res) => {
  try {
    if (Number(req.userId) !== 4) {
      return res.status(403).json({ error: 'Только админ' });
    }
    await pool.query('DELETE FROM chat_messages');
    res.json({ ok: true });
  } catch (err) {
    console.error('secret-chat clear:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

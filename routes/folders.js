const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/folders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, user_id, name, icon, order_index, created_at FROM folders WHERE user_id = ? ORDER BY order_index ASC, id ASC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/folders
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название папки обязательно' });

    const [maxRows] = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) AS maxOrder FROM folders WHERE user_id = ?',
      [req.userId]
    );
    const nextOrder = (maxRows[0]?.maxOrder || 0) + 1;
    const folderIcon = icon || '📁';

    const [result] = await pool.query(
      'INSERT INTO folders (user_id, name, icon, order_index) VALUES (?, ?, ?, ?)',
      [req.userId, name.trim(), folderIcon, nextOrder]
    );
    res.json({ id: result.insertId, user_id: req.userId, name: name.trim(), icon: folderIcon, order_index: nextOrder });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/folders/reorder  — ВАЖНО: должен быть ВЫШЕ /:id
router.put('/reorder', authenticateToken, async (req, res) => {
  const { folders } = req.body;
  if (!Array.isArray(folders)) return res.status(400).json({ error: 'folders должен быть массивом' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const f of folders) {
      if (!f?.id && f?.id !== 0) continue;
      const ord = Number.isFinite(Number(f.order_index)) ? Number(f.order_index) : 0;
      await conn.query(
        'UPDATE folders SET order_index = ? WHERE id = ? AND user_id = ?',
        [ord, f.id, req.userId]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Reorder folders error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/folders/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;
    const { name, icon } = req.body;

    if ((!name || !name.trim()) && icon === undefined) {
      return res.status(400).json({ error: 'Нечего обновлять' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM folders WHERE id = ? AND user_id = ?',
      [folderId, req.userId]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Папка не найдена' });

    const current = existing[0];
    const newName = name !== undefined ? name.trim() : current.name;
    const newIcon = icon !== undefined ? icon : current.icon;

    await pool.query(
      'UPDATE folders SET name = ?, icon = ? WHERE id = ? AND user_id = ?',
      [newName, newIcon, folderId, req.userId]
    );

    const [updated] = await pool.query(
      'SELECT id, user_id, name, icon, order_index, created_at FROM folders WHERE id = ? AND user_id = ?',
      [folderId, req.userId]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('Update folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/folders/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE tasks SET folder_id = NULL WHERE folder_id = ? AND user_id = ?', [req.params.id, req.userId]);
    await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true, message: 'Папка удалена' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

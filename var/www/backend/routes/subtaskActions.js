const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// PUT /api/subtasks/:id/toggle
router.put('/:id/toggle', authenticateToken, async (req, res) => {
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

// DELETE /api/subtasks/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM subtasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

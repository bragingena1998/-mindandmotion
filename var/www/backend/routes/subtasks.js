const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/tasks/:taskId/subtasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [subtasks] = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY id ASC',
      [req.params.taskId]
    );
    res.json(subtasks);
  } catch (err) {
    console.error('Get subtasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:taskId/subtasks
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const [result] = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES (?, ?)',
      [req.params.taskId, title]
    );
    res.json({ id: result.insertId, task_id: req.params.taskId, title, completed: false });
  } catch (err) {
    console.error('Create subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

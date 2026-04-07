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

// PUT /api/tasks/:taskId/subtasks/:subtaskId
router.put('/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const { title, completed } = req.body;
    
    await pool.query(
      'UPDATE subtasks SET title = ?, completed = ? WHERE id = ? AND task_id = ?',
      [title, completed ? 1 : 0, subtaskId, req.params.taskId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:taskId/subtasks/:subtaskId
router.delete('/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    
    const [result] = await pool.query(
      'DELETE FROM subtasks WHERE id = ? AND task_id = ?',
      [subtaskId, req.params.taskId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete subtask error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

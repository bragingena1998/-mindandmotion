const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    let query = `
      SELECT t.*,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtasks_count
      FROM tasks t
      WHERE t.user_id = ?
    `;
    let params = [userId];

    if (month && year) {
      query += ` AND (
        (t.done = 1 AND MONTH(t.done_date) = ? AND YEAR(t.done_date) = ?)
        OR
        (t.done = 0 AND MONTH(t.date) = ? AND YEAR(t.date) = ?)
      )`;
      params.push(parseInt(month) + 1, year, parseInt(month) + 1, year);
    } else {
      query += ` AND (
        t.done = 0
        OR (t.done = 1 AND t.done_date >= DATE_FORMAT(NOW() ,'%Y-%m-01'))
      )`;
    }

    query += ' ORDER BY t.done ASC, t.priority ASC, t.date DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(row => ({
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.is_recurring),
      isGenerated: Boolean(row.is_generated),
      subtasks_count: row.subtasks_count || 0,
      userId: row.user_id,
      doneDate: row.done_date,
      focusSessions: row.focus_sessions,
      recurrenceType: row.recurrence_type,
      recurrenceValue: row.recurrence_value,
      templateId: row.template_id,
      folderId: row.folder_id,
      time: row.time || null
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(CASE WHEN done = 1 AND DATE(done_date) = CURDATE() THEN 1 END) as completed_today,
        COUNT(CASE WHEN
          (done = 0 AND (deadline IS NULL OR date <= CURDATE()))
          OR (done = 1 AND DATE(done_date) = CURDATE())
        THEN 1 END) as total_today_plan,
        COUNT(CASE WHEN done = 1 AND YEARWEEK(done_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as completed_week,
        COUNT(CASE WHEN done = 1 AND YEAR(done_date) = YEAR(CURDATE()) AND MONTH(done_date) = MONTH(CURDATE()) THEN 1 END) as completed_month,
        COUNT(CASE WHEN done = 1 THEN 1 END) as completed_total
      FROM tasks WHERE user_id = ?
    `, [req.userId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/sync  — ВАЖНО: выше /:id
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { tasks } = req.body;
    const userId = req.userId;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const results = [];

    for (const task of tasks) {
      const [existing] = await pool.query(
        'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
        [task.id, userId]
      );

      if (existing.length > 0) {
        await pool.query(
          `UPDATE tasks SET
            date = ?, time = ?, deadline = ?, title = ?, priority = ?, comment = ?,
            done = ?, done_date = ?, focus_sessions = ?,
            is_recurring = ?, recurrence_type = ?, recurrence_value = ?, folder_id = ?
          WHERE id = ? AND user_id = ?`,
          [
            task.date, task.time || null, task.deadline || null, task.title, task.priority || 2,
            task.comment || '', task.done ? 1 : 0, task.doneDate || null,
            task.focusSessions || 0, task.isRecurring ? 1 : 0,
            task.recurrenceType || null, task.recurrenceValue || null,
            task.folderId || null, task.id, userId
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO tasks (
            id, user_id, date, time, deadline, title, priority, comment,
            done, done_date, focus_sessions,
            is_recurring, recurrence_type, recurrence_value,
            is_generated, template_id, folder_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id, userId, task.date, task.time || null, task.deadline || null, task.title,
            task.priority || 2, task.comment || '', task.done ? 1 : 0,
            task.doneDate || null, task.focusSessions || 0,
            task.isRecurring ? 1 : 0, task.recurrenceType || null,
            task.recurrenceValue || null, task.isGenerated ? 1 : 0,
            task.templateId || null, task.folderId || null
          ]
        );
      }

      const [synced] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [task.id, userId]);
      results.push(synced[0]);
    }

    console.log(`✓ Synced ${results.length} tasks for user ${userId}`);
    res.json({ synced: results.length, tasks: results });
  } catch (err) {
    console.error('Ошибка синхронизации задач:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/tasks/delete  — альтернативный endpoint
router.post('/delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID задачи требуется' });

    const [task] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (task.length === 0) return res.status(404).json({ error: 'Задача не найдена' });

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    console.log(`✅ Deleted task: ${id}`);
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error('Ошибка удаления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/tasks
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      date, time, deadline, title, priority, comment, done, doneDate,
      focusSessions, isRecurring, recurrenceType, recurrenceValue,
      isGenerated, templateId, folderId
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, date, time, deadline, title, priority, comment, done, done_date,
        focus_sessions, is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, date, time || null, deadline || null, title, priority || 2, comment || '',
       done ? 1 : 0, doneDate || null, focusSessions || 0, isRecurring ? 1 : 0,
       recurrenceType || null, recurrenceValue || null, isGenerated ? 1 : 0,
       templateId || null, folderId || null]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    if (rows.length === 0) return res.status(500).json({ error: 'Task not found after insert' });

    const row = rows[0];
    const newTask = {
      ...row,
      done: Boolean(row.done),
      isRecurring: Boolean(row.is_recurring),
      isGenerated: Boolean(row.is_generated),
      subtasksCount: 0,
      userId: row.user_id,
      doneDate: row.done_date,
      focusSessions: row.focus_sessions,
      recurrenceType: row.recurrence_type,
      recurrenceValue: row.recurrence_value,
      templateId: row.template_id,
      folderId: row.folder_id,
      time: row.time || null
    };

    console.log('✅ Task created:', { id: newTask.id, title: newTask.title });
    res.json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/stop-recurring  — ВАЖНО: выше /:id
router.put('/:id/stop-recurring', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE tasks SET is_recurring = 0, recurrence_type = NULL WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    console.log(`⏹️ Recurring stopped for task ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Stop recurring error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const {
    date, time, deadline, title, priority, comment, done, doneDate,
    focusSessions, isRecurring, recurrenceType, recurrenceValue,
    isGenerated, templateId, folderId
  } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const oldTask = rows[0];

    await pool.query(
      `UPDATE tasks SET date=?, time=?, deadline=?, title=?, priority=?, comment=?, done=?, done_date=?,
       focus_sessions=?, is_recurring=?, recurrence_type=?, recurrence_value=?, is_generated=?, template_id=?, folder_id=?
       WHERE id=? AND user_id=?`,
      [
        date, time || null, deadline || null, title, priority || 2, comment || '',
        done ? 1 : 0, doneDate || null, focusSessions || 0, isRecurring ? 1 : 0,
        recurrenceType || null, recurrenceValue || null,
        isGenerated ? 1 : 0, templateId || null, folderId || null,
        taskId, req.userId
      ]
    );

    if (isRecurring && done && !oldTask.done) {
      let nextDate = new Date(date);

      if (recurrenceType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (recurrenceType === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (recurrenceType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (recurrenceType === 'custom' && recurrenceValue) {
        try {
          const days = JSON.parse(recurrenceValue);
          if (Array.isArray(days) && days.length > 0) {
            let found = false;
            for (let i = 1; i <= 7; i++) {
              nextDate.setDate(nextDate.getDate() + 1);
              if (days.includes(nextDate.getDay())) { found = true; break; }
            }
            if (!found) nextDate.setDate(nextDate.getDate() + 1);
          } else {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        } catch (e) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }

      const nextDateStr = nextDate.toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO tasks (user_id, date, time, deadline, title, priority, comment, done, focus_sessions,
          is_recurring, recurrence_type, recurrence_value, is_generated, template_id, folder_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, 1, ?, ?)`,
        [req.userId, nextDateStr, time || null, deadline || null, title, priority || 2,
         comment || '', recurrenceType, recurrenceValue || null, taskId, folderId || null]
      );
      console.log(`♻️ Цикличная задача создана на ${nextDateStr}`);
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/focus
router.post('/:id/focus', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE tasks SET focus_sessions = focus_sessions + 1 WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    console.log(`🎯 Focus session added to task ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Focus session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Запрос на удаление задачи:', id, 'от пользователя:', req.userId);

    const [task] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (task.length === 0) {
      console.log('⚠️ Задача не найдена');
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    console.log('✅ Задача успешно удалена:', id);
    res.json({ message: 'Задача удалена', task: task[0] });
  } catch (err) {
    console.error('❌ Ошибка удаления задачи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

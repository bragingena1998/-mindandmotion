const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/policies/accept - принять политики
router.post('/policies/accept', authenticateToken, async (req, res) => {
  try {
    const { privacy, terms, emailMarketing } = req.body;
    const userId = req.userId;

    if (privacy !== true || terms !== true) {
      return res.status(400).json({ 
        error: 'Privacy policy and terms of service are required' 
      });
    }

    await db.execute(
      `UPDATE users SET 
       privacy_accepted = 1, 
       terms_accepted = 1, 
       email_marketing_accepted = ?, 
       policies_accepted_at = NOW()
       WHERE id = ?`,
      [emailMarketing ? 1 : 0, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting policies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/announcements - получить непрочитанные анонсы
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [announcements] = await db.execute(`
      SELECT a.* 
      FROM app_announcements a
      WHERE a.is_active = 1 
      AND a.id NOT IN (
        SELECT announcement_id 
        FROM announcement_reads 
        WHERE user_id = ?
      )
      ORDER BY a.created_at DESC
    `, [userId]);

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/announcements/:id/read - отметить анонс прочитанным
router.post('/announcements/:id/read', authenticateToken, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const userId = req.userId;

    await db.execute(
      'INSERT IGNORE INTO announcement_reads (user_id, announcement_id, read_at) VALUES (?, ?, NOW())',
      [userId, announcementId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

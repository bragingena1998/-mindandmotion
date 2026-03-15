const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const emailService = require('../emailService');

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// POST /api/register
router.post('/register', async (req, res) => {
  console.log('📝 Register request:', req.body);
  const { email, password, name, birthdate } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  }

  try {
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, birthdate) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, birthdate || null]
    );

    const userId = result.insertId;
    console.log('✅ User created:', { userId, email, name });

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-12345',
      { expiresIn: '30d' }
    );

    res.json({ token, userId, email, name });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [users] = await pool.query('SELECT id, password FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/send-verification-code
router.post('/send-verification-code', async (req, res) => {
  const { name, email, birthdate, password } = req.body;

  if (!name || !email || !birthdate || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }

  try {
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    console.log('🕐 Registration - Server time (UTC):', new Date().toISOString());
    console.log('🕐 Registration - Expires at (UTC):', expiresAt.toISOString());

    await pool.query('DELETE FROM email_verifications WHERE email = ?', [email]);
    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}.header{text-align:center;margin-bottom:30px}.code{font-size:36px;font-weight:bold;color:#667eea;text-align:center;background:#f0f0ff;padding:20px;border-radius:8px;letter-spacing:4px}.info{color:#666;margin-top:20px;font-size:14px}</style></head><body><div class="container"><div class="header"><h2>🎉 Добро пожаловать в Трекер привычек!</h2></div><p>Привет, ${name.split(' ')[0]}!</p><p>Мы получили запрос на создание аккаунта. Введите код подтверждения:</p><div class="code">${code}</div><p class="info">Код действителен в течение 15 минут.</p><p class="info">Если это были не вы, просто проигнорируйте это письмо.</p></div></body></html>`;

    const result = await emailService.sendEmail({
      to: email,
      subject: '🔐 Подтверждение регистрации — Mind and Motion',
      html,
      text: `Ваш код подтверждения: ${code}. Код действителен 15 минут.`
    });

    if (!result.success) {
      console.error('❌ Ошибка отправки email:', result.error);
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    console.log(`✅ Код верификации отправлен на ${email} (код: ${code})`);
    res.json({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('❌ Ошибка send-verification-code:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// POST /api/verify-code
router.post('/verify-code', async (req, res) => {
  const { name, email, birthdate, password, code } = req.body;
  const cleanCode = String(code).replace(/\s+/g, '');

  console.log('📝 Verify email request:', { email, name, originalCode: code, cleanCode, serverTimeUTC: new Date().toISOString() });

  if (!name || !email || !birthdate || !password || !cleanCode) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const [verifications] = await pool.query(
      `SELECT *, expires_at as expires_at_utc, UTC_TIMESTAMP() as current_time_utc,
              TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
       FROM email_verifications
       WHERE email = ? AND REPLACE(code, ' ', '') = ? AND expires_at > UTC_TIMESTAMP()`,
      [email, cleanCode]
    );

    console.log('🔍 Found verifications:', verifications.length);

    if (verifications.length === 0) {
      const [all] = await pool.query(
        `SELECT code, expires_at, UTC_TIMESTAMP() as now, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left FROM email_verifications WHERE email = ?`,
        [email]
      );
      console.log('📋 All verifications for email:', all);
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, birthdate, password, email_verified) VALUES (?, ?, ?, ?, TRUE)',
      [name, email, birthdate, hashedPassword]
    );
    const userId = result.insertId;

    await pool.query('DELETE FROM email_verifications WHERE email = ?', [email]);
    console.log(`✅ Пользователь создан: ${email} (userId: ${userId})`);

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px"><h2>🎉 Добро пожаловать в Mind and Motion!</h2><p>Привет, <strong>${name.split(' ')[0]}</strong>! 👋</p><p>Поздравляем с успешной регистрацией! Теперь ты можешь отслеживать привычки и задачи.</p><p style="text-align:center"><a href="http://mindandmotion.ru" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 30px;text-decoration:none;border-radius:8px">Начать сейчас</a></p></div></body></html>`;

    emailService.sendEmail({
      to: email,
      subject: '🎉 Добро пожаловать в Mind and Motion!',
      html: welcomeHtml,
      text: `Привет, ${name}! Добро пожаловать в Mind and Motion!`
    }).catch(err => console.error('⚠️ Ошибка отправки приветственного письма:', err.message));

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-12345',
      { expiresIn: '30d' }
    );

    res.json({ success: true, message: 'Регистрация успешна', token, userId, email, name });
  } catch (error) {
    console.error('❌ Ошибка verify-code:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// POST /api/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    console.log('🕐 Server time (UTC):', new Date().toISOString());
    console.log('🕐 Expires at (UTC):', expiresAt.toISOString());

    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);
    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:30px}.code{font-size:36px;font-weight:bold;color:#667eea;text-align:center;background:#f0f0ff;padding:20px;border-radius:8px;letter-spacing:4px}.info{color:#666;margin-top:20px;font-size:14px}</style></head><body><div class="container"><h2>🔐 Восстановление пароля</h2><p>Вы запросили сброс пароля. Используйте код ниже:</p><div class="code">${code}</div><p class="info">Код действителен в течение 15 минут.</p><p class="info">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p></div></body></html>`;

    const result = await emailService.sendEmail({
      to: email,
      subject: '🔐 Восстановление пароля — Mind and Motion',
      html,
      text: `Ваш код для сброса пароля: ${code}. Код действителен 15 минут.`
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    console.log(`✅ Код сброса пароля отправлен на ${email}`);
    res.json({ success: true, message: 'Код отправлен на email' });
  } catch (error) {
    console.error('❌ Ошибка forgot-password:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, new_password } = req.body;
  const newPassword = new_password;
  const cleanCode = String(code).replace(/\s+/g, '');

  console.log('📝 Reset password request:', { email, originalCode: code, cleanCode, serverTimeUTC: new Date().toISOString() });

  if (!email || !cleanCode || !newPassword) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  }

  try {
    const [resets] = await pool.query(
      `SELECT *, expires_at as expires_at_utc, UTC_TIMESTAMP() as current_time_utc,
              TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left
       FROM password_resets
       WHERE email = ? AND REPLACE(code, ' ', '') = ? AND expires_at > UTC_TIMESTAMP()`,
      [email, cleanCode]
    );

    console.log('🔍 Found resets:', resets.length);

    if (resets.length === 0) {
      const [all] = await pool.query(
        `SELECT code, expires_at, UTC_TIMESTAMP() as now, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) as seconds_left FROM password_resets WHERE email = ?`,
        [email]
      );
      console.log('📋 All resets for email:', all);
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    console.log(`✅ Пароль успешно изменён для ${email}`);
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('❌ Ошибка reset-password:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

module.exports = router;

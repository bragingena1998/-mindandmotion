const nodemailer = require('nodemailer');
require('dotenv').config();

// Создаём транспортер для Beget SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // SSL только для 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Для тестирования, можно убрать позже
  }
});

/**
 * Отправить письмо
 * @param {Object} options - { to, subject, html, text }
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text: text || '', // Текстовая версия для старых клиентов
      html: html || text // HTML версия
    });

    console.log(`✅ Email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email error (${to}):`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Проверить соединение с SMTP
 */
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

/**
 * HTML шаблон письма с кодом подтверждения
 */
function getVerificationEmailHtml(code, username) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align: center; color: #333; margin-bottom: 20px; }
          .code { background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #00d9ff; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%); color: #0a0e1a; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">🎉 Добро пожаловать в Трекер привычек!</h2>
          
          <p>Привет, ${username}!</p>
          
          <p>Мы получили запрос на создание аккаунта с этим email адресом. 
          Чтобы завершить регистрацию, введите код подтверждения ниже:</p>
          
          <div class="code">${code}</div>
          
          <p style="color: #666; font-size: 14px;">
            Код действителен в течение <strong>15 минут</strong>.
          </p>
          
          <p style="color: #999; font-size: 13px;">
            Если это были не вы, просто игнорируйте это письмо.
          </p>
          
          <div class="footer">
            <p>© 2026 Трекер привычек. Все права защищены.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * HTML шаблон письма о успешной регистрации
 */
function getWelcomeEmailHtml(username) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align: center; color: #333; margin-bottom: 20px; }
          .features { margin: 20px 0; }
          .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">✅ Регистрация завершена!</h2>
          
          <p>Привет, ${username}!</p>
          
          <p>Ваш аккаунт успешно создан и готов к использованию. 
          Вот что вы сможете делать с Трекером привычек:</p>
          
          <div class="features">
            <div class="feature">📊 Отслеживать привычки в виде таблицы на 31 день</div>
            <div class="feature">✅ Управлять задачами с категориями и приоритетами</div>
            <div class="feature">📅 Выбирать разные месяцы и анализировать прогресс</div>
            <div class="feature">🎨 Менять цветовые темы интерфейса</div>
            <div class="feature">⏳ Видеть жизненное время (прогресс жизни)</div>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="https://85.198.96.149" style="background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%); color: #0a0e1a; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
              Перейти в приложение →
            </a>
          </p>
          
          <div class="footer">
            <p>© 2026 Трекер привычек. Все права защищены.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  verifyConnection,
  getVerificationEmailHtml,
  getWelcomeEmailHtml
};


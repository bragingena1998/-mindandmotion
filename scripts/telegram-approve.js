#!/usr/bin/env node
/**
 * telegram-approve.js
 * Отправляет сообщение в Telegram с кнопками ✅ Approve / ❌ Cancel
 * и ждёт ответа. Завершается с кодом 0 (approve) или 1 (cancel/timeout).
 *
 * Использование:
 *   node scripts/telegram-approve.js "Описание действия"
 *
 * Env-переменные (из .env в корне docs или web):
 *   TG_BOT_TOKEN  — токен бота от @BotFather
 *   TG_CHAT_ID    — твой chat_id (получить через @userinfobot)
 */

const https = require('https');
const { execSync } = require('child_process');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

// Загружаем .env вручную (без dotenv-зависимости)
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'apps', 'web', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^"|"$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
      break;
    }
  }
}

loadEnv();

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID   = process.env.TG_CHAT_ID;
const TIMEOUT_MS = 60_000; // 60 секунд на ответ

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ TG_BOT_TOKEN и TG_CHAT_ID должны быть в .env');
  console.error('   Смотри docs/runbooks/telegram-bridge.md');
  process.exit(1);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function apiCall(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const action = process.argv[2] || 'Неизвестное действие';
  const branch = (() => {
    try { return execSync('git branch --show-current', { encoding: 'utf8' }).trim(); }
    catch { return 'unknown'; }
  })();
  const time = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' });

  const callbackApprove = `approve_${Date.now()}`;
  const callbackCancel  = `cancel_${Date.now()}`;

  // 1. Отправляем сообщение с кнопками
  const sent = await apiCall('sendMessage', {
    chat_id: CHAT_ID,
    text:
      `🤖 *Mind & Motion — Запрос апрува*\n\n` +
      `📋 *Действие:* ${action}\n` +
      `🌿 *Ветка:* \`${branch}\`\n` +
      `🕐 *Время:* ${time}\n\n` +
      `Подтвердить выполнение?`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: callbackApprove },
        { text: '❌ Cancel',  callback_data: callbackCancel  },
      ]]
    }
  });

  if (!sent.ok) {
    console.error('❌ Не удалось отправить сообщение в Telegram:', sent);
    process.exit(1);
  }

  const messageId = sent.result.message_id;
  console.log(`📨 Запрос отправлен в Telegram. Ожидание ответа (${TIMEOUT_MS / 1000}с)...`);

  // 2. Получаем offset для long-polling
  let offset = 0;
  try {
    const upd = await apiCall('getUpdates', { limit: 1, timeout: 0 });
    if (upd.ok && upd.result.length > 0) {
      offset = upd.result[upd.result.length - 1].update_id + 1;
    }
  } catch {}

  // 3. Long-polling: ждём нажатия кнопки
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const remaining = Math.floor((deadline - Date.now()) / 1000);
    const res = await apiCall('getUpdates', {
      offset,
      timeout: Math.min(10, remaining),
      allowed_updates: ['callback_query'],
    });

    if (res.ok && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        const cb = update.callback_query;
        if (!cb) continue;

        if (cb.data === callbackApprove) {
          // Апрув!
          await apiCall('answerCallbackQuery', { callback_query_id: cb.id, text: '✅ Approved!' });
          await apiCall('editMessageText', {
            chat_id: CHAT_ID,
            message_id: messageId,
            text: `✅ *APPROVED*\n\n📋 ${action}\n🌿 \`${branch}\`\n🕐 ${time}`,
            parse_mode: 'Markdown',
          });
          console.log('✅ Approved! Продолжаем выполнение.');
          process.exit(0);
        }

        if (cb.data === callbackCancel) {
          // Отмена!
          await apiCall('answerCallbackQuery', { callback_query_id: cb.id, text: '❌ Cancelled' });
          await apiCall('editMessageText', {
            chat_id: CHAT_ID,
            message_id: messageId,
            text: `❌ *CANCELLED*\n\n📋 ${action}\n🌿 \`${branch}\`\n🕐 ${time}`,
            parse_mode: 'Markdown',
          });
          console.log('❌ Cancelled. Действие отменено.');
          process.exit(1);
        }
      }
    }

    await sleep(500);
  }

  // Timeout
  await apiCall('editMessageText', {
    chat_id: CHAT_ID,
    message_id: messageId,
    text: `⏰ *TIMEOUT*\n\n📋 ${action}\n🌿 \`${branch}\`\n\nВремя ожидания истекло (${TIMEOUT_MS / 1000}с). Действие отменено.`,
    parse_mode: 'Markdown',
  });

  console.log('⏰ Timeout. Действие отменено.');
  process.exit(1);
}

main().catch(err => {
  console.error('❌ Ошибка telegram-approve:', err.message);
  process.exit(1);
});

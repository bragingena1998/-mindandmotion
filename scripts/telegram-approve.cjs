#!/usr/bin/env node
/**
 * telegram-approve.cjs
 * Отправляет сообщение в Telegram с кнопками ✅ Approve / ❌ Cancel
 * и ждёт ответа. Завершается с кодом 0 (approve) или 1 (cancel/timeout).
 *
 * Использование:
 *   node scripts/telegram-approve.cjs "Описание действия"
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Загрузка .env вручную (без dotenv) ──────────────────────────────────────
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
      console.log('📄 .env загружен из:', envPath);
      break;
    }
  }
}

loadEnv();

const BOT_TOKEN  = process.env.TG_BOT_TOKEN;
const CHAT_ID    = process.env.TG_CHAT_ID;
const TIMEOUT_MS = 60_000;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ TG_BOT_TOKEN и TG_CHAT_ID должны быть в .env');
  console.error('   Смотри docs/runbooks/telegram-bridge.md');
  console.error('   TG_BOT_TOKEN:', BOT_TOKEN ? '✅ есть' : '❌ нет');
  console.error('   TG_CHAT_ID:  ', CHAT_ID   ? '✅ есть' : '❌ нет');
  process.exit(1);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
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
    console.error('❌ Telegram API ошибка:', JSON.stringify(sent));
    process.exit(1);
  }

  const messageId = sent.result.message_id;
  console.log(`📨 Запрос отправлен! Ожидание ответа (${TIMEOUT_MS / 1000}с)...`);

  // offset для long-polling
  let offset = 0;
  try {
    const upd = await apiCall('getUpdates', { limit: 1, timeout: 0 });
    if (upd.ok && upd.result.length > 0) {
      offset = upd.result[upd.result.length - 1].update_id + 1;
    }
  } catch {}

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
          await apiCall('answerCallbackQuery', { callback_query_id: cb.id, text: '✅ Approved!' });
          await apiCall('editMessageText', {
            chat_id: CHAT_ID, message_id: messageId,
            text: `✅ *APPROVED*\n\n📋 ${action}\n🌿 \`${branch}\`\n🕐 ${time}`,
            parse_mode: 'Markdown',
          });
          console.log('✅ Approved!');
          process.exit(0);
        }

        if (cb.data === callbackCancel) {
          await apiCall('answerCallbackQuery', { callback_query_id: cb.id, text: '❌ Cancelled' });
          await apiCall('editMessageText', {
            chat_id: CHAT_ID, message_id: messageId,
            text: `❌ *CANCELLED*\n\n📋 ${action}\n🌿 \`${branch}\`\n🕐 ${time}`,
            parse_mode: 'Markdown',
          });
          console.log('❌ Cancelled.');
          process.exit(1);
        }
      }
    }
    await sleep(500);
  }

  await apiCall('editMessageText', {
    chat_id: CHAT_ID, message_id: messageId,
    text: `⏰ *TIMEOUT*\n\n📋 ${action}\n🌿 \`${branch}\`\n\nВремя истекло (${TIMEOUT_MS / 1000}с). Отменено.`,
    parse_mode: 'Markdown',
  });
  console.log('⏰ Timeout. Отменено.');
  process.exit(1);
}

main().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});

---
tags: [problem, security, backend]
platform: backend
status: resolved
severity: high
discovered: 2026-07-22
discovered-by: "аудит кода при переносе документации в vault"
resolved-date: 2026-07-22
---

# Небезопасный дефолтный JWT-секрет

**Решено 2026-07-22.** `middleware/auth.js` и `routes/auth.js` (3 места подписи токена) использовали:
```js
const secret = process.env.JWT_SECRET || 'your-secret-key-12345';
```

Если `JWT_SECRET` не задан в `.env` на каком-либо окружении — токены подписывались **публично известной строкой из кода**, что позволяло подделывать валидные JWT для любого `userId`.

**Фикс применён:** фолбэк убран во всех 4 местах (`backend/middleware/auth.js` коммит `80554bb`, `backend/routes/auth.js` тот же коммит). Теперь при отсутствии `JWT_SECRET` `jsonwebtoken` сам бросает исключение вместо тихой подмены на предсказуемое значение.

Совпало по времени с ротацией `JWT_SECRET` на проде (см. [[08-Решения/История-решений]], инцидент с утечкой `context-perplexity/` 2026-07-22) — новый секрет уже стоит в `.env` на VPS.

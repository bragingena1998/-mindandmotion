---
tags: [runbook, deploy, web]
platform: web
verified: false
source: "docs/runbooks/deploy-web-vps.md (перенесено, пути и статус исправлены)"
---

# Деплой Web-сайта на VPS

> Backend уже работает на `mindandmotion.ru/api` — не трогать при деплое веба. Веб — статические файлы (HTML+JS+CSS), которые nginx раздаёт напрямую.

## ⚠️ Статус нужно перепроверить

Этот раннбук изначально (docs/, апрель 2026) был написан как план **до** первого деплоя — там прямо было написано "nginx для веба ещё не настроен". Но по истории решений (см. `context-perplexity`, файл про VPS-инциденты) настройка nginx под веб **фактически была сделана** позже, при этом:
- Реальный работающий конфиг сайта `mindandmotion.ru` — это `/etc/nginx/sites-enabled/default`, а **не** отдельный файл `sites-enabled/mindandmotion`, как предполагалось изначально ниже.
- Минимум дважды рассинхрон портов (nginx проксировал на 5000, PM2-бэкенд слушал 3000) клал прод целиком.

Перед использованием — зайти на VPS и свериться с реальным `nginx -T`, а не с текстом ниже.

## Первый деплой (разовая настройка, ориентировочно)

```bash
ssh USER@mindandmotion.ru
mkdir -p /var/www/web
```

Пример конфига (сверить с реальным перед правкой):
```nginx
server {
    listen 443 ssl;
    server_name mindandmotion.ru www.mindandmotion.ru;
    ssl_certificate     /etc/letsencrypt/live/mindandmotion.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindandmotion.ru/privkey.pem;

    root /var/www/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;   # ⚠️ сверить фактический порт backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
nginx -t
systemctl reload nginx
```

## Регулярный деплой

```powershell
Set-Location "E:\ProjectMM\web"
npm run build
scp -r dist/* USER@mindandmotion.ru:/var/www/web/dist/
```

Фронт исторически **не клонировался на сервере через git** — собирается локально и заливается через `scp`. Если решите деплоить через git на сервере — не забыть, что ветка называется `web`, не `web-review`.

```bash
curl -I https://mindandmotion.ru
# Ожидаемо: 200 OK
```

## Переменные окружения для прода

`web/.env.production` (не в git):
```
VITE_API_URL=https://mindandmotion.ru/api
```

## Откат

```bash
git checkout <PREVIOUS_COMMIT>
npm run build
scp -r dist/* USER@mindandmotion.ru:/var/www/web/dist/
```
Или хранить бэкап `dist/` перед каждым деплоем — см. [[rollback|Откат]].

# Runbook: Деплой Web-сайта на VPS

> Для публикации React + Vite фронтенда на VPS Beget.
> Цель: сайт доступен на `https://mindandmotion.ru` для тестирования с телефона и других устройств.
> Последнее обновление: апрель 2026

---

## Архитектура

```
Локальная разработка          VPS Beget
E:\...\apps\web   ──build──►  /var/www/web/dist/
                              ↑
                         Nginx раздаёт статику
                         mindandmotion.ru → /var/www/web/dist
```

**Backend** уже работает на `mindandmotion.ru/api` — трогать не нужно.
Веб-сайт — это статические файлы (HTML + JS + CSS), которые Nginx раздаёт напрямую.

---

## Первый деплой (разовая настройка)

### 1. Создать папку на VPS

```bash
ssh USER@mindandmotion.ru
mkdir -p /var/www/web
```

### 2. Настроить Nginx

Открыть конфиг Nginx (обычно `/etc/nginx/sites-available/mindandmotion`):

```nginx
server {
    listen 443 ssl;
    server_name mindandmotion.ru www.mindandmotion.ru;

    # SSL-сертификаты (уже настроены для API)
    ssl_certificate     /etc/letsencrypt/live/mindandmotion.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindandmotion.ru/privkey.pem;

    # Веб-приложение (React SPA)
    root /var/www/web/dist;
    index index.html;

    # SPA: все маршруты отдают index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API проксируется на Node.js бэкенд
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Проверить и перезапустить Nginx:
```bash
nginx -t
systemctl reload nginx
```

---

## Регулярный деплой (каждый раз)

### 1. Собрать фронтенд локально

```powershell
Set-Location "E:\Mobile app = web + web ios\apps\web"
npm run build
# Создастся папка dist/
```

### 2. Загрузить на VPS через SCP

```powershell
# Скопировать папку dist на сервер
scp -r dist/* USER@mindandmotion.ru:/var/www/web/dist/
```

**Альтернатива — через git (после настройки):**
```bash
# На VPS:
cd /var/www/web
git pull origin web-review
npm install
npm run build
# dist/ обновится на месте
```

### 3. Проверить

```bash
curl -I https://mindandmotion.ru
# Должен вернуть 200 OK
```

Открыть `https://mindandmotion.ru` в браузере или на телефоне — появится страница логина.

---

## Переменные окружения для прода

В `apps/web` создать `.env.production`:
```
VITE_API_URL=https://mindandmotion.ru/api
```

Vite автоматически использует `.env.production` при `npm run build`.

> ⚠️ `.env.production` **не добавлять в git**. Добавить в `.gitignore`.

---

## Откат

Если новая версия сломана — залить предыдущий `dist/` с локального бэкапа
или переключить git на предыдущий коммит и пересобрать:

```bash
git checkout <PREVIOUS_COMMIT>
npm run build
scp -r dist/* USER@mindandmotion.ru:/var/www/web/dist/
```

---

## Статус

| Шаг | Статус |
|-----|--------|
| Папка `/var/www/web/` на VPS | ❌ Не создана (первый деплой нужен) |
| Nginx настроен для веба | ❌ Не настроен |
| Первый деплой выполнен | ❌ Ожидает настройки Nginx |

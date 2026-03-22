# Сборка APK и уведомления (Mind&Motion)

## 1. Иконка, splash, adaptive icon (чёрный фон + логотип)

В проекте используется **чистый чёрный** `#000000` под логотипом (`app.json`, `BrandedSplash`).

Подготовьте PNG (или экспорт из Figma):

| Файл | Рекомендация |
|------|----------------|
| `assets/icon.png` | 1024×1024, логотип по центру на **чёрном** фоне |
| `assets/adaptive-icon.png` | 1024×1024, **прозрачный фон** вокруг логотипа; цвет подложки задаётся в `app.json` → `android.adaptiveIcon.backgroundColor` (**#000000**) |
| `assets/splash-icon.png` | Логотип крупно по центру на **чёрном** (Expo подставит `splash.backgroundColor` **#000000**) |

После замены файлов пересоберите нативный проект (EAS ниже) — иначе старые картинки останутся в кэше сборки.

---

## 2. Уведомления в production APK

В приложении уже подключены **`expo-notifications`** и плагин в `app.json`. Для **локальных** напоминаний (задачи, утро/вечер и т.д.) **не нужен** FCM для пушей с сервера — достаточно разрешения на устройстве.

Что сделать при сборке:

1. Соберите **release** / **production** APK (не Expo Go) — локальные уведомления **не работают** в Expo Go.
2. На Android **13+** разрешение `POST_NOTIFICATIONS` подставляется через плагин Expo; при первом запуске приложение запросит разрешение (логика в `src/services/notifications.js` → `registerForPushNotificationsAsync` / `initNotifications`).
3. В коде `notifications.js` в режиме **Dev Client / `__DEV__`** стоят заглушки — на **собранном APK** `__DEV__ === false`, используется настоящий `expo-notifications`.

Проверка на устройстве: после установки APK зайти в системные настройки приложения → уведомления — разрешить.

---

## 3. Команды EAS Build (APK)

Установка CLI (один раз):

```bash
npm install -g eas-cli
eas login
```

В корне проекта (где `eas.json`):

```bash
cd путь/к/mindandmotion-mobile
eas build -p android --profile production
```

Профиль `production` в `eas.json` уже настроен на **`buildType: "apk"`**.

Для внутреннего теста без store:

```bash
eas build -p android --profile preview
```

Статус и ссылка на артефакт — в выводе EAS и на [expo.dev](https://expo.dev).

---

## 4. Тайный чат (404)

Маршруты **`/api/secret-chat/*`** должны быть на сервере. В репозитории добавлены:

- `var/www/backend/routes/secretChat.js`
- подключение в `server.js`
- таблицы в `initDB.js`

После деплоя на VPS перезапустите Node и убедитесь, что миграции выполнились (лог `✓ secret_chat tables OK`).

---

## 5. Краткий чеклист перед сборкой

- [ ] Заменены `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` под чёрный бренд
- [ ] Задеплоен бэкенд с `secretChat` (если нужен тайный чат)
- [ ] `eas build -p android --profile production`
- [ ] На телефоне проверить уведомления в настройках приложения после установки APK

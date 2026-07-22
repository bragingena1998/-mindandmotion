---
tags: [runbook, deploy, mobile, rustore]
platform: mobile
verified: false
source: "docs/runbooks/build-android.md (перенесено как есть, с уточнениями по RuStore)"
---

# Сборка и публикация Android

## Предусловия
- `npm install -g eas-cli`, `eas login`
- `eas.json` настроен в корне `mobile/` (собственный keystore, `credentialsSource: "local"` — см. [[решение-собственный-keystore]])
- Актуальный `.env`

## Сборка

```bash
cd E:\ProjectMM\mobile

# Preview (APK, для тестов и для RuStore)
eas build --platform android --profile preview

# Production (AAB, для Google Play)
eas build --platform android --profile production
```
Сборка идёт в облаке EAS (~10–15 мин), ссылка — в терминале и на expo.dev.

⚠️ **RuStore требует APK, не AAB** (в отличие от Google Play) — использовать `preview`-профиль или отдельный APK-профиль для RuStore, не `production`/AAB.

## Публикация в RuStore

1. Скачать `.apk` по ссылке из EAS.
2. [RuStore Console](https://console.rustore.ru) → приложение → Версии → Загрузить новую версию.
3. Скриншоты карточки — **горизонтальные 16:9, 1920×1080** (проверено по факту консоли RuStore — см. [[daysOfWeek-и-другие-долгие-баги|историю с ошибочными советами про вертикальный формат]]).
4. Загрузить `.apk`, заполнить «что нового», отправить на модерацию.

## Публикация в Google Play

1. Скачать `.aab`.
2. Google Play Console → приложение → Production → Create new release.
3. Загрузить `.aab`, заполнить release notes, отправить на review.

## OTA-обновление (только JS, без пересборки)

```bash
eas update --branch production --message "fix: описание"
```
Полная пересборка APK/AAB нужна только при нативных модулях, изменении `app.json` или нативного кода.

## Раздача APK напрямую с прод-сервера (альтернатива RuStore/Google Play)

Исторически APK также раздавался напрямую: `https://mindandmotion.ru/downloads/mind-motion.apk` — требует отдельного `location /downloads/` в nginx **до** `location /` (иначе SPA-роутер веба перехватывает путь), MIME `application/vnd.android.package-archive`, права `755`/`644` на файл.

## Проверка перед релизом

- [ ] Версия в `app.json` обновлена (`version`, `android.versionCode`)
- [ ] `.env` содержит prod-переменные, `BASE_URL` указывает на `https://mindandmotion.ru/api` (не на голый IP:порт — это уже один раз ломало логин в проде)
- [ ] OTA channel настроен в `eas.json`
- [ ] Иконки и splash screen актуальны
- [ ] Тест на физическом устройстве пройден

## Откат

См. [[rollback|Откат]] → раздел Mobile.

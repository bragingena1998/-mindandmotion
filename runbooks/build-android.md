# Build & Publish Android

## Предусловия
- Установлен EAS CLI: `npm install -g eas-cli`
- Залогинен: `eas login`
- Файл `eas.json` настроен (уже есть в корне)
- `.env` с актуальными переменными

## Сборка APK / AAB

### Preview (для тестов, APK)
```bash
cd "E:\Mobile app = web + web ios"
eas build --platform android --profile preview
```

### Production (AAB для магазина)
```bash
eas build --platform android --profile production
```

Сборка идёт в облаке EAS (~10-15 мин). Ссылка на скачивание появится в терминале и на [expo.dev](https://expo.dev).

## Публикация в RuStore

1. Скачай `.aab` файл по ссылке из EAS
2. Зайди в [RuStore Console](https://console.rustore.ru)
3. Выбери приложение → **Версии** → **Загрузить новую версию**
4. Загрузи `.aab`, заполни what's new, отправь на модерацию

## Публикация в Google Play

1. Скачай `.aab` файл
2. Зайди в [Google Play Console](https://play.google.com/console)
3. Выбери приложение → **Production** → **Create new release**
4. Загрузи `.aab`, заполни release notes, отправь на review

## OTA-обновление (JS only, без сборки)

Если менялся только JS-код (не нативные модули):
```bash
eas update --branch production --message "fix: описание изменений"
```

## Проверка перед релизом

- [ ] Версия в `app.json` обновлена (`version` и `android.versionCode`)
- [ ] `.env` содержит prod-переменные
- [ ] OTA channel настроен в `eas.json`
- [ ] Иконки и splash screen актуальны
- [ ] Тест на физическом устройстве пройден

## Откат

См. [rollback.md](./rollback.md) → раздел "Mobile".

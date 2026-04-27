# AGENTS.md — Mobile (mobile-dev3.0)

> ⚠️ Эта ветка содержит только мобильное приложение (React Native + Expo).
>
> **Главный AGENTS.md живёт в ветке `docs`:**
> [`docs/AGENTS.md`](https://github.com/bragingena1998/-mindandmotion/blob/docs/docs/AGENTS.md)

## Что читать перед работой в этой ветке

1. `docs` ветка → `docs/AGENTS.md` — полный контракт, все законы, все эндпоинты
2. `docs` ветка → `.windsurf/rules/00-project.md` — общие правила
3. `docs` ветка → `.windsurf/rules/02-mobile.md` — правила мобилки
4. `docs` ветка → `docs/ARCHITECTURE.md` — архитектура

## Быстрый старт (мобилка)

- **Стек:** React Native + Expo SDK (Bare Workflow)
- **Ветка:** `mobile-dev3.0`
- **Токен:** SecureStore (не AsyncStorage!)
- **Цвета:** `const { colors } = useTheme()` — никогда хардкод
- **API:** `services/api.js`, базовый URL `https://mindandmotion.ru/api`

## ⚠️ Важно для этой ветки

В рабочей директории есть удалённые файлы (`var/www/backend/*`, `DEVLOG_v2.md` и др.)
это артефакты старой структуры — **не восстанавливать**, не коммитить их.

# Шаблон: Windsurf Execution Prompt

> Это финальный формат prompt, который ты вставляешь в Windsurf/Cascade.
> Perplexity генерирует его — ты только вставляешь.

---

## Структура готового prompt для Windsurf

```
[perplexity-reviewed: true]

Задача: <одна фраза>
Домен: <web | backend | mobile | docs>
Риск: <low | medium | high>

Контекст:
- <файл 1 и что в нём>
- <файл 2 и что в нём>

Шаги:
1. <конкретный шаг>
2. <конкретный шаг>
3. <конкретный шаг>

Ограничения:
- Не менять <что нельзя трогать>
- Сохранить поведение <что должно остаться>

Проверить после:
- <критерий 1>
- <критерий 2>

Документация:
- Обновить STATUS.md
- Создать handoff-файл docs/handoffs/YYYY-MM-DD_описание.md
```

---

## Важно

- Метка `[perplexity-reviewed: true]` означает: Windsurf **не переанализирует архитектуру**, а сразу выполняет план
- Если шаг требует `npm install`, `git push`, `rm` — Windsurf вызывает соответствующий safe-скрипт
- Опасные действия всегда через `scripts/git-push-safe.ps1`, `scripts/safe-install.ps1` и т.д.

# Шаблон: Intake Message

> Копируй этот блок и заполняй после получения ответа от Telegram intake-бота.
> Или используй напрямую — боты заполняют его автоматически.

---

```
[INTAKE]
Текст: 
Проблема: 
Гипотеза: 
Зона: web | backend | mobile | docs
Файлы вероятно: 
Риск: low | medium | high
Нужен prompt для Windsurf: yes | no
[/INTAKE]
```

---

## Заполненный пример

```
[INTAKE]
Текст: при открытии экрана привычек в мобилке иногда пустой список, хотя данные есть
Проблема: HabitsScreen иногда рендерит пустой массив при первом маунте
Гипотеза: race condition между AsyncStorage и API-запросом в useEffect
Зона: mobile
Файлы вероятно: mindandmotion-mobile/src/screens/HabitsScreen.js
Риск: medium
Нужен prompt для Windsurf: yes
[/INTAKE]
```

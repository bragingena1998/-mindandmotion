# API Reference — Mind & Motion Backend

> Полный список эндпоинтов backend (E:\ProjectMM\backend).
> Base URL prod: https://mindandmotion.ru/api
> Base URL dev:  http://localhost:5000/api
> Auth: Bearer token в заголовке Authorization.

## Auth

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | /login | Вход, возвращает JWT |
| POST | /register | Регистрация |
| POST | /verify-code | Верификация email |
| POST | /resend-code | Повторная отправка кода |
| POST | /logout | Выход |
| POST | /forgot-password | Запрос сброса пароля |
| POST | /reset-password | Установка нового пароля |

## User

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /user/profile | Получить профиль |
| PUT | /user/profile | Обновить профиль |
| PUT | /user/password | Сменить пароль |

## Tasks

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /tasks | Список задач |
| POST | /tasks | Создать задачу |
| PUT | /tasks/:id | Обновить задачу |
| DELETE | /tasks/:id | Удалить задачу |
| POST | /tasks/:id/focus | Запустить фокус-сессию |
| PUT | /tasks/:id/stop-recurring | Остановить повтор |

## Subtasks

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /tasks/:taskId/subtasks | Список подзадач |
| POST | /tasks/:taskId/subtasks | Создать подзадачу |
| PUT | /subtasks/:id/toggle | Переключить статус |
| DELETE | /subtasks/:id | Удалить подзадачу |

## Habits

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /habits | Список привычек |
| POST | /habits | Создать привычку |
| PUT | /habits/:id | Обновить привычку |
| DELETE | /habits/:id | Удалить привычку |
| PUT | /habits/reorder | Изменить порядок |
| PUT | /habits/:id/archive | Архивировать |

## Folders

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /folders | Список папок |
| POST | /folders | Создать папку |
| PUT | /folders/:id | Обновить папку |
| DELETE | /folders/:id | Удалить папку |

## Birthdays

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /birthdays | Список дней рождения |
| POST | /birthdays | Добавить |
| PUT | /birthdays/:id | Обновить |
| DELETE | /birthdays/:id | Удалить |

/**
 * notifications.js — полная логика уведомлений Mind&Motion
 *
 * ТИПЫ УВЕДОМЛЕНИЙ:
 *  1. Утреннее  — сводка задач + просрочки + дедлайн завтра
 *  2. Вечернее  — отметить привычки + дедлайн завтра
 *  3. До задачи   — за X и Y минут (только если есть время)
 *  4. ДР / события — за notify_before дней
 *  5. Конец сессии — одноразовое
 *  6. Недельный итог — в выбранный день/время
 *  7. Неактивность — со 2-го дня, повтор до 7 дней
 *
 * Тестировать только через APK!
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings } from './settingsStorage';

// Ключи в AsyncStorage
const LAST_VISIT_KEY = '@mm_last_visit';
const TASK_NOTIF_PREFIX = '@mm_task_notif_';
const BIRTHDAY_NOTIF_PREFIX = '@mm_bday_notif_';

// Настройка поведения уведомлений при получении
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---------------------------------------------------------------------------
// 1. РЕГИСТРАЦИЯ ПРАВ
// ---------------------------------------------------------------------------
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Notifications: не реальное устройство, пропускаем');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notifications: права не выданы');
    return null;
  }

  // Android: настройка канала
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mind&Motion',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }

  return finalStatus;
}

// ---------------------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ
// ---------------------------------------------------------------------------

// Парсинг времени в { hour, minute }
function parseTime(timeStr) {
  const [h, m] = (timeStr || '08:00').split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

// Дата следующего определённого часа (если сегодня уже прошло — завтра)
function nextOccurrence(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

// ---------------------------------------------------------------------------
// 2. УТРЕННЕЕ + ВЕЧЕРНЕЕ
// ---------------------------------------------------------------------------
export async function scheduleDailyNotifications() {
  const settings = await loadSettings();

  // Отменяем старые
  await Notifications.cancelScheduledNotificationAsync('morning-daily').catch(() => {});
  await Notifications.cancelScheduledNotificationAsync('evening-daily').catch(() => {});

  if (settings.morningEnabled) {
    const { hour, minute } = parseTime(settings.morningTime);
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-daily',
      content: {
        title: 'Доброе утро! 🌅',
        body: 'Посмотри задачи на сегодня — хороший день начинается с плана!',
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  if (settings.eveningEnabled) {
    const { hour, minute } = parseTime(settings.eveningTime);
    await Notifications.scheduleNotificationAsync({
      identifier: 'evening-daily',
      content: {
        title: 'Вечерний итог 🌙',
        body: 'День почти завершён — внеси отметки и подведи итог дня!',
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 3. НЕДЕЛЬНЫЙ ИТОГ
// ---------------------------------------------------------------------------
export async function scheduleWeeklyNotification() {
  const settings = await loadSettings();

  await Notifications.cancelScheduledNotificationAsync('weekly-summary').catch(() => {});

  if (!settings.weeklyEnabled) return;

  const { hour, minute } = parseTime(settings.weeklyTime);
  // weeklyDay: 0=Вс, 1=Пн ... в JS getDay() 0=вск, наш 0=Вс — совпадает
  const weekday = settings.weeklyDay + 1; // expo: 1=вск, 2=пн...

  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: 'Недельный итог 📅',
      body: 'Как прошла неделя? Загляни в Mind&Motion и подведи итог!',
      sound: true,
    },
    trigger: {
      weekday,
      hour,
      minute,
      repeats: true,
    },
  });
}

// ---------------------------------------------------------------------------
// 4. УВЕДОМЛЕНИЯ ДО ЗАДАЧИ
// scheduleTaskReminders(task) — вызывать при создании/редактировании задачи
// cancelTaskReminders(taskId) — при удалении
// ---------------------------------------------------------------------------
export async function scheduleTaskReminders(task) {
  const settings = await loadSettings();
  if (!settings.taskReminderEnabled) return;
  if (!task.time || !task.date) return; // нет времени — не шлём

  // Отменяем старые перед перезаписью
  await cancelTaskReminders(task.id);

  const [taskHour, taskMin] = task.time.split(':').map(Number);
  const [year, month, day] = task.date.split('-').map(Number);

  const taskDate = new Date(year, month - 1, day, taskHour, taskMin, 0);
  const now = new Date();

  const ids = {};

  for (const minsBefore of [settings.taskReminderFirst, settings.taskReminderSecond]) {
    if (!minsBefore || minsBefore <= 0) continue;
    const triggerDate = new Date(taskDate.getTime() - minsBefore * 60 * 1000);
    if (triggerDate <= now) continue; // уже прошло

    const id = `task-${task.id}-${minsBefore}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `Напоминание ⏰`,
        body: `«${task.title}» начнётся через ${minsBefore} мин`,
        sound: true,
      },
      trigger: triggerDate,
    });
    ids[minsBefore] = id;
  }

  // Сохраняем id-шники для отмены
  await AsyncStorage.setItem(TASK_NOTIF_PREFIX + task.id, JSON.stringify(ids));
}

export async function cancelTaskReminders(taskId) {
  try {
    const raw = await AsyncStorage.getItem(TASK_NOTIF_PREFIX + taskId);
    if (!raw) return;
    const ids = JSON.parse(raw);
    for (const id of Object.values(ids)) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    await AsyncStorage.removeItem(TASK_NOTIF_PREFIX + taskId);
  } catch {}
}

// ---------------------------------------------------------------------------
// 5. ДР / СОБЫТИЯ
// scheduleBirthdayNotification(event) — вызывать при создании/редактировании события
// ---------------------------------------------------------------------------
export async function scheduleBirthdayNotification(event) {
  const settings = await loadSettings();
  if (!settings.birthdayEnabled) return;

  await cancelBirthdayNotification(event.id);

  const notifyBefore = event.notify_before ?? 1;
  const now = new Date();

  // Строим дату события в этом году
  const currentYear = now.getFullYear();
  let eventDate = new Date(currentYear, (event.month || 1) - 1, event.day || 1, 9, 0, 0);

  // Если уже прошло в этом году — планируем на следующий
  if (eventDate < now) eventDate.setFullYear(currentYear + 1);

  const triggerDate = new Date(eventDate.getTime() - notifyBefore * 24 * 60 * 60 * 1000);
  if (triggerDate <= now) return;

  const isBirthday = event.type === 'birthday';
  const id = `birthday-${event.id}`;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: isBirthday ? `🎂 День рождения!` : `📅 Напоминание о событии`,
      body: isBirthday
        ? `У ${event.name} через ${notifyBefore === 1 ? 'завтра' : `${notifyBefore} дн.`} день рождения!`
        : `«${event.name}» через ${notifyBefore === 1 ? 'завтра' : `${notifyBefore} дн.`}`,
      sound: true,
    },
    trigger: triggerDate,
  });

  await AsyncStorage.setItem(BIRTHDAY_NOTIF_PREFIX + event.id, id);
}

export async function cancelBirthdayNotification(eventId) {
  try {
    const id = await AsyncStorage.getItem(BIRTHDAY_NOTIF_PREFIX + eventId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(BIRTHDAY_NOTIF_PREFIX + eventId);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// 6. КОНЕЦ КОНЦЕНТРАТ-СЕССИИ
// ---------------------------------------------------------------------------
export async function scheduleSessionEndNotification(durationMinutes, taskTitle) {
  const settings = await loadSettings();
  if (!settings.sessionEndEnabled) return;

  const id = 'session-end';
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const triggerDate = new Date(Date.now() + durationMinutes * 60 * 1000);

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Сессия завершена! ✅',
      body: taskTitle
        ? `${durationMinutes} мин концентрации на «${taskTitle}». Отличная работа!`
        : `${durationMinutes} мин концентрации позади! Отличная работа!`,
      sound: true,
    },
    trigger: triggerDate,
  });
}

export async function cancelSessionEndNotification() {
  await Notifications.cancelScheduledNotificationAsync('session-end').catch(() => {});
}

// ---------------------------------------------------------------------------
// 7. НЕАКТИВНОСТЬ
// Вызывать при каждом запуске приложения
// ---------------------------------------------------------------------------
export async function checkInactivityNotification() {
  const settings = await loadSettings();
  if (!settings.inactivityEnabled) return;

  const lastVisitStr = await AsyncStorage.getItem(LAST_VISIT_KEY);
  const now = new Date();

  if (lastVisitStr) {
    const lastVisit = new Date(lastVisitStr);
    const diffDays = Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2 && diffDays <= 7) {
      // Отменяем старое (чтобы не дублировать)
      await Notifications.cancelScheduledNotificationAsync('inactivity').catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier: 'inactivity',
        content: {
          title: 'Давно не заходил 💪',
          body: `Уже ${diffDays} ${diffDays === 2 ? 'дня' : 'дней'} без захода. Тебя ждут задачи и привычки!`,
          sound: true,
        },
        trigger: { seconds: 3 }, // через 3 секунды после запуска
      });
    }
  }

  // Обновляем последний визит
  await AsyncStorage.setItem(LAST_VISIT_KEY, now.toISOString());
}

// ---------------------------------------------------------------------------
// 8. ИНИЦИАЛИЗАЦИЯ ВСЕГО ДАЙЛЫ — вызывать из App.js
// ---------------------------------------------------------------------------
export async function initNotifications() {
  const status = await registerForPushNotificationsAsync();
  if (!status) return; // права не выданы

  await scheduleDailyNotifications();
  await scheduleWeeklyNotification();
  await checkInactivityNotification();
}

// ---------------------------------------------------------------------------
// 9. ПЕРЕПЛАНИРОВАНИЕ ДАЙЛЫ NOTIF ПОСЛЕ СМЕНЫ НАСТРОЕК
// Вызывать из NotificationSettingsScreen после любого изменения
// ---------------------------------------------------------------------------
export async function rescheduleAllDailyNotifications() {
  await scheduleDailyNotifications();
  await scheduleWeeklyNotification();
}

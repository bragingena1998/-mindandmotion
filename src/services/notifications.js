import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Конфигурация: как показывать уведомления, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Регистрация и получение токена (для пушей с сервера) или просто прав (для локальных)
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Получаем токен, если бы мы хотели слать с сервера. 
    // Для локальных уведомлений токен не обязателен, но права нужны.
    try {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig.extra.eas.projectId,
        })).data;
    } catch(e) {
        // console.log(e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Отправка тестового уведомления прямо сейчас
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Mind & Motion 🚀",
      body: "Это тестовое уведомление! Система работает отлично.",
      sound: true,
    },
    trigger: null, // null = отправить сейчас
  });
}

// Планирование ежедневного утреннего брифинга (9:00)
export async function scheduleMorningNotification() {
  // Сначала отменим старые, чтобы не дублировать
  await cancelAllNotifications();

  // Утро 9:00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Доброе утро! ☀️",
      body: "Посмотри свой план на сегодня. Время побеждать!",
      sound: true,
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  // Вечер 20:00 - напоминание
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Как успехи? 👀",
      body: "Не забудь отметить выполненные привычки и задачи!",
      sound: true,
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    },
  });
}

// Отмена всех запланированных (полезно при логауте или изменении настроек)
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

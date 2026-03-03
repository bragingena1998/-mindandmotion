import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Конфигурация: как показывать уведомления, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Регистрация и получение разрешений для локальных уведомлений
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get permissions for notifications!');
      return null;
    }
    
    // ВНИМАНИЕ: Вызов getExpoPushTokenAsync убран.
    // В новых версиях Expo Go (SDK 52+) модуль ExpoPushTokenManager вырезан,
    // поэтому попытка получить токен роняет приложение.
    // Для локальных уведомлений токен не нужен.
    console.log('Local notifications permissions granted.');
    return 'local-notifications-only'; // Возвращаем заглушку вместо реального токена
    
  } catch (error) {
    console.log('Error in registerForPushNotificationsAsync:', error);
    return null;
  }
}

// Отправка тестового уведомления
export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Mind & Motion 🚀",
        body: "Это тестовое локальное уведомление! Система работает отлично.",
        sound: true,
      },
      trigger: null,
    });
    Alert.alert("Успех", "Уведомление отправлено! Если не пришло - проверьте шторку.");
  } catch (error) {
    Alert.alert("Ошибка", "Не удалось отправить уведомление. Возможно, нет прав.");
    console.log(error);
  }
}

// Планирование ежедневных уведомлений
export async function scheduleMorningNotification() {
  try {
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

    // Вечер 20:00
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
  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Error canceling notifications:', error);
  }
}

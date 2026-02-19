import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

// Конфигурация: как показывать уведомления, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Регистрация и получение токена
export async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return;
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
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Пытаемся получить токен, но безопасно
    // В Expo Go это работает, в Development Build тоже, но иногда бывают сбои
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
        if (projectId) {
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } else {
             // Если нет ID проекта, токен не получим, но локальные уведомления работать БУДУТ
             console.log('Project ID not found, skipping push token generation');
        }
    } catch(e) {
        console.log('Error fetching push token:', e);
    }
  } catch (error) {
    console.log('Error in registerForPushNotificationsAsync:', error);
  }

  return token;
}

// Отправка тестового уведомления
export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Mind & Motion 🚀",
        body: "Это тестовое уведомление! Система работает отлично.",
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

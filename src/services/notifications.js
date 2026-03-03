// ВРЕМЕННАЯ ЗАГЛУШКА ДЛЯ EXPO GO
// Библиотека expo-notifications временно отключена, так как в Expo SDK 52
// она вызывает ошибку \"Cannot find native module 'ExpoPushTokenManager'\"
// при использовании стандартного приложения Expo Go.
// Чтобы уведомления заработали, необходимо собрать Development Build (npx expo run:android)

import { Alert } from 'react-native';

export async function registerForPushNotificationsAsync() {
  console.log('Notifications are temporarily disabled in Expo Go');
  return null;
}

export async function sendTestNotification() {
  Alert.alert(
    \"Уведомления отключены\", 
    \"Для работы уведомлений требуется собрать собственную версию приложения (Development Build). В Expo Go они временно отключены во избежание сбоев.\"
  );
}

export async function scheduleMorningNotification() {
  console.log('Mock: scheduleMorningNotification called');
}

export async function cancelAllNotifications() {
  console.log('Mock: cancelAllNotifications called');
}

// src/services/notifications.js
// ВРЕМЕННАЯ ЗАГЛУШКА (MOCK) для Expo Dev Client.
// Нативный модуль expo-notifications отсутствует в текущей сборке APK.
// Когда будем готовы внедрять уведомления - вернем реальный код и пересобирем APK через EAS.

import { Alert } from 'react-native';

export async function registerForPushNotificationsAsync() {
  console.log('🔔 [MOCK] registerForPushNotificationsAsync called');
  return null;
}

export async function sendTestNotification() {
  console.log('🔔 [MOCK] sendTestNotification called');
  Alert.alert('Уведомления отключены', 'Функция Push-уведомлений временно отключена для стабильной работы Dev Client. Будет добавлена в следующей сборке.');
}

export async function scheduleMorningNotification() {
  console.log('🔔 [MOCK] scheduleMorningNotification called');
}

export async function cancelAllNotifications() {
  console.log('🔔 [MOCK] cancelAllNotifications called');
}

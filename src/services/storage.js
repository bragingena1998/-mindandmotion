// src/services/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Ключи для хранилища
const KEYS = {
  AUTH_TOKEN: 'app-auth-token',
  USER_ID: 'app-user-id',
  USER_EMAIL: 'app-user-email',
  THEME: 'app-theme',
};

// Сохранение токена и ID пользователя
export const saveToken = async (token, userId) => {
  try {
    const promises = [AsyncStorage.setItem(KEYS.AUTH_TOKEN, token)];
    if (userId) {
      promises.push(AsyncStorage.setItem(KEYS.USER_ID, String(userId)));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error('Ошибка сохранения токена:', error);
  }
};

// Получение токена
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Ошибка получения токена:', error);
    return null;
  }
};

// Удаление данных авторизации (выход)
export const removeToken = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.USER_ID]);
  } catch (error) {
    console.error('Ошибка удаления токена:', error);
  }
};

// Сохранение Email (для автоподстановки при логине)
export const saveUserEmail = async (email) => {
  try {
    await AsyncStorage.setItem(KEYS.USER_EMAIL, email);
  } catch (error) {
    console.error('Ошибка сохранения email:', error);
  }
};

// Получение Email
export const getUserEmail = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.USER_EMAIL);
  } catch (error) {
    console.error('Ошибка получения email:', error);
    return null;
  }
};

// Сохранение темы
export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  } catch (error) {
    console.error('Ошибка сохранения темы:', error);
  }
};

// Получение темы
export const getTheme = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.THEME);
  } catch (error) {
    console.error('Ошибка получения темы:', error);
    return null;
  }
};

export default {
  saveToken,
  getToken,
  removeToken,
  saveUserEmail,
  getUserEmail,
  saveTheme,
  getTheme,
};

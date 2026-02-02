import AsyncStorage from '@react-native-async-storage/async-storage';

// Ключи для хранения
const TOKEN_KEY = '@mindandmotion:token';
const USER_ID_KEY = '@mindandmotion:userId';

// Сохранить токен
export const saveToken = async (token, userId) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_ID_KEY, userId.toString());
    console.log('✅ Токен сохранён в AsyncStorage');
  } catch (error) {
    console.error('❌ Ошибка сохранения токена:', error);
  }
};

// Получить токен
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ Ошибка получения токена:', error);
    return null;
  }
};

// Получить userId
export const getUserId = async () => {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    return userId ? parseInt(userId) : null;
  } catch (error) {
    console.error('❌ Ошибка получения userId:', error);
    return null;
  }
};

// Удалить токен (logout)
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_ID_KEY);
    console.log('✅ Токен удалён из AsyncStorage');
  } catch (error) {
    console.error('❌ Ошибка удаления токена:', error);
  }
};

// Проверка авторизации
export const isAuthenticated = async () => {
  const token = await getToken();
  return token !== null;
};


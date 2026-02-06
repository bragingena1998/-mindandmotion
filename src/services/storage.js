// src/services/storage.js
export const saveToken = async (token, userId) => {
  try {
    localStorage.setItem('app-auth-token', token);
    if (userId) {
      localStorage.setItem('app-user-id', String(userId));
    }
  } catch (error) {
    console.error('Ошибка сохранения токена:', error);
  }
};

export const getToken = async () => {
  try {
    return localStorage.getItem('app-auth-token');
  } catch (error) {
    console.error('Ошибка получения токена:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    localStorage.removeItem('app-auth-token');
    localStorage.removeItem('app-user-id');
  } catch (error) {
    console.error('Ошибка удаления токена:', error);
  }
};

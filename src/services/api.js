import axios from 'axios';

// Базовый URL твоего API
const API_URL = 'http://mindandmotion.ru:5000';

// Создаём экземпляр axios с настройками
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 секунд таймаут
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена к каждому запросу
api.interceptors.request.use(
  async (config) => {
    // Позже здесь будем добавлять JWT токен из AsyncStorage
    // const token = await AsyncStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API методы для авторизации
export const authAPI = {
  // Логин
login: async (email, password) => {
  const response = await api.post('/api/login', { email, password });
  return response.data;
},

  // Регистрация
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  // Подтверждение кода
  verifyCode: async (email, code) => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },

  // Сброс пароля
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Сброс пароля с кодом
  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { 
      email, 
      code, 
      newPassword 
    });
    return response.data;
  },
};

// API методы для задач (добавим позже)
export const tasksAPI = {
  getTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  // ... остальные методы добавим позже
};

// API методы для привычек (добавим позже)
export const habitsAPI = {
  getHabits: async () => {
    const response = await api.get('/habits');
    return response.data;
  },
  // ... остальные методы добавим позже
};

export default api;


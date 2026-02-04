import axios from 'axios';
import { getToken } from './storage';


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
    try {
      const token = await getToken(); // ← НОВАЯ СТРОКА
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

    } catch (error) {
      console.error('Ошибка получения токена:', error);
    }
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

// API методы для задач
export const tasksAPI = {
  // Получить все задачи
  getTasks: async () => {
    const response = await api.get('/api/tasks');
    return response.data;
  },
  
  // Создать новую задачу
  createTask: async (taskData) => {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },
  
  // Обновить задачу
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/api/tasks/${taskId}`, taskData);
    return response.data;
  },
  
  // Удалить задачу
  deleteTask: async (taskId) => {
    const response = await api.delete(`/api/tasks/${taskId}`);
    return response.data;
  },

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


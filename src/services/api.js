// src/services/api.js
import axios from 'axios';
import { getToken, removeToken } from './storage';
import { Platform } from 'react-native';

// Определяем базовый URL в зависимости от окружения
// Для Android эмулятора локалхост это 10.0.2.2, для iOS - localhost
// Но у тебя внешний IP, так что оставляем его
const BASE_URL = 'http://85.198.96.149:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Ошибка при добавлении токена в запрос:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Unauthorized - токен истёк или неверен');
      await removeToken();
      
      // На мобилке мы не можем просто сделать window.location.href = '/'
      // Навигация должна обрабатываться в React компонентах через слушатель состояния аутентификации
      // Но для веба оставим редирект
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
      // Можно выбросить специальную ошибку, которую поймает App.js или экран
      // Но пока просто реджектим
    }
    return Promise.reject(error);
  }
);

export const tasksAPI = {
  getTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },
  
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
  
  syncTasks: async (tasks) => {
    const response = await api.post('/tasks/sync', { tasks });
    return response.data;
  }
};

export default api;

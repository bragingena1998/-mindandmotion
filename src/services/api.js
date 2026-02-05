import axios from 'axios';
import { getToken } from './storage';

// Создаём экземпляр axios
const api = axios.create({
  baseURL: 'http://mindandmotion.ru:5000',
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
      console.error('Ошибка получения токена:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API для авторизации
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/login', { email, password });
    return response.data;
  },
  
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  verifyCode: async (email, code) => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },
  
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { 
      email, 
      code, 
      newPassword 
    });
    return response.data;
  },
};

// API методы для задач (используем axios!)
export const tasksAPI = {
  getTasks: async () => {
    console.log('📡 GET /api/tasks');
    const response = await api.get('/api/tasks');
    console.log('📡 GET OK:', response.data.length, 'задач');
    return response.data;
  },

  createTask: async (taskData) => {
    console.log('📡 POST /api/tasks:', taskData.title);
    const response = await api.post('/api/tasks', taskData);
    console.log('📡 POST OK:', response.data);
    return response.data;
  },

  updateTask: async (taskId, taskData) => {
    console.log('📡 PUT /api/tasks/' + taskId);
    const response = await api.put(`/api/tasks/${taskId}`, taskData);
    console.log('📡 PUT OK');
    return response.data;
  },

  // ✅ ИСПРАВЛЕНО: используем axios (не fetch!), signal через config
  deleteTask: async (id) => {
    console.log('📡 DELETE /api/tasks/' + id);
    const response = await api.delete(`/api/tasks/${id}`);
    console.log('✅ DELETE OK');
    return response.data;
  }
};

export default api;

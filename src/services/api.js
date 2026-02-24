// src/services/api.js
import axios from 'axios';
import { getToken, removeToken } from './storage';
import { Platform } from 'react-native';

// Определяем базовый URL в зависимости от окружения
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

// Обработка ошибок ответа
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Unauthorized - токен истёк или неверен');
      await removeToken();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ========================================
// TASKS API
// ========================================
export const tasksAPI = {
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks', { params });
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
  },

  getStats: async () => {
    const response = await api.get('/tasks/stats');
    return response.data;
  },
};

// ========================================
// FOLDERS API
// ========================================
export const foldersAPI = {
  // Получить все папки пользователя
  getFolders: async () => {
    const response = await api.get('/folders');
    return response.data;
  },

  // Создать папку
  createFolder: async (folderData) => {
    // folderData: { name: string, icon?: string }
    const response = await api.post('/folders', folderData);
    return response.data;
  },

  // Редактировать папку
  updateFolder: async (id, folderData) => {
    // folderData: { name?: string, icon?: string }
    const response = await api.put(`/folders/${id}`, folderData);
    return response.data;
  },

  // Удалить папку (задачи в ней получат folder_id = null)
  deleteFolder: async (id) => {
    const response = await api.delete(`/folders/${id}`);
    return response.data;
  },

  // Сортировка папок
  reorderFolders: async (folders) => {
    // folders: Array<{ id: number, order_index: number }>
    const response = await api.put('/folders/reorder', { folders });
    return response.data;
  },
};

// ========================================
// SUBTASKS API
// ========================================
export const subtasksAPI = {
  // Получить подзадачи задачи
  getSubtasks: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  },

  // Создать подзадачу
  createSubtask: async (taskId, title) => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
  },

  // Переключить выполнение подзадачи
  toggleSubtask: async (subtaskId) => {
    const response = await api.put(`/subtasks/${subtaskId}/toggle`);
    return response.data;
  },

  // Удалить подзадачу
  deleteSubtask: async (subtaskId) => {
    const response = await api.delete(`/subtasks/${subtaskId}`);
    return response.data;
  },
};

export default api;

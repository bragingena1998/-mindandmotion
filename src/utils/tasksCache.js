import { MMKV } from 'react-native-mmkv';

// Создаем инстанс MMKV для задач
const tasksStorage = new MMKV({
  id: 'tasks-storage',
  encryptionKey: 'tasks-encryption-key'
});

// Создаем инстанс для папок
const foldersStorage = new MMKV({
  id: 'folders-storage', 
  encryptionKey: 'folders-encryption-key'
});

// Функции для работы с задачами
export const tasksCache = {
  // Сохранить задачи
  setTasks: (tasks) => {
    try {
      tasksStorage.set('tasks', JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error('Failed to save tasks to cache:', error);
      return false;
    }
  },

  // Получить задачи
  getTasks: () => {
    try {
      const cached = tasksStorage.getString('tasks');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to load tasks from cache:', error);
      return null;
    }
  },

  // Очистить кеш задач
  clearTasks: () => {
    try {
      tasksStorage.delete('tasks');
      return true;
    } catch (error) {
      console.error('Failed to clear tasks cache:', error);
      return false;
    }
  }
};

// Функции для работы с папками
export const foldersCache = {
  // Сохранить папки
  setFolders: (folders) => {
    try {
      foldersStorage.set('folders', JSON.stringify(folders));
      return true;
    } catch (error) {
      console.error('Failed to save folders to cache:', error);
      return false;
    }
  },

  // Получить папки
  getFolders: () => {
    try {
      const cached = foldersStorage.getString('folders');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to load folders from cache:', error);
      return null;
    }
  },

  // Очистить кеш папок
  clearFolders: () => {
    try {
      foldersStorage.delete('folders');
      return true;
    } catch (error) {
      console.error('Failed to clear folders cache:', error);
      return false;
    }
  }
};

// Утилиты для синхронизации
export const syncUtils = {
  // Получить время последней синхронизации
  getLastSyncTime: () => {
    try {
      return tasksStorage.getNumber('lastSyncTime') || 0;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return 0;
    }
  },

  // Установить время последней синхронизации
  setLastSyncTime: (timestamp = Date.now()) => {
    try {
      tasksStorage.set('lastSyncTime', timestamp);
      return true;
    } catch (error) {
      console.error('Failed to set last sync time:', error);
      return false;
    }
  },

  // Проверить нужно ли синхронизироваться
  needsSync: (maxAge = 5 * 60 * 1000) => { // 5 минут по умолчанию
    const lastSync = syncUtils.getLastSyncTime();
    return Date.now() - lastSync > maxAge;
  }
};

export default {
  tasksCache,
  foldersCache,
  syncUtils
};

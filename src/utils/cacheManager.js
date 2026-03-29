import { MMKV } from 'react-native-mmkv';

// Универсальный менеджер кеширования для всех сущностей
class CacheManager {
  constructor() {
    // Создаем инстансы для разных типов данных
    this.storages = {
      tasks: new MMKV({ id: 'tasks-cache', encryptionKey: 'tasks-key' }),
      habits: new MMKV({ id: 'habits-cache', encryptionKey: 'habits-key' }),
      folders: new MMKV({ id: 'folders-cache', encryptionKey: 'folders-key' }),
      stats: new MMKV({ id: 'stats-cache', encryptionKey: 'stats-key' }),
      focus: new MMKV({ id: 'focus-cache', encryptionKey: 'focus-key' }),
      pomodoro: new MMKV({ id: 'pomodoro-cache', encryptionKey: 'pomodoro-key' }),
      settings: new MMKV({ id: 'settings-cache', encryptionKey: 'settings-key' }),
      user: new MMKV({ id: 'user-cache', encryptionKey: 'user-key' }),
    };
    
    // Время последней синхронизации
    this.syncTimes = new MMKV({ id: 'sync-times', encryptionKey: 'sync-key' });
  }

  // Универсальные методы
  set(type, key, data) {
    try {
      this.storages[type].set(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to cache ${type}.${key}:`, error);
      return false;
    }
  }

  get(type, key) {
    try {
      const cached = this.storages[type].getString(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Failed to load ${type}.${key} from cache:`, error);
      return null;
    }
  }

  remove(type, key) {
    try {
      this.storages[type].delete(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${type}.${key} from cache:`, error);
      return false;
    }
  }

  clear(type) {
    try {
      this.storages[type].clearAll();
      return true;
    } catch (error) {
      console.error(`Failed to clear ${type} cache:`, error);
      return false;
    }
  }

  // Методы синхронизации
  setLastSyncTime(type, timestamp = Date.now()) {
    try {
      this.syncTimes.set(type, timestamp);
      return true;
    } catch (error) {
      console.error(`Failed to set sync time for ${type}:`, error);
      return false;
    }
  }

  getLastSyncTime(type) {
    try {
      return this.syncTimes.getNumber(type) || 0;
    } catch (error) {
      console.error(`Failed to get sync time for ${type}:`, error);
      return 0;
    }
  }

  needsSync(type, maxAge = 5 * 60 * 1000) { // 5 минут по умолчанию
    const lastSync = this.getLastSyncTime(type);
    return Date.now() - lastSync > maxAge;
  }

  // Удобные методы для конкретных сущностей
  // Tasks
  setTasks(tasks) { return this.set('tasks', 'all', tasks); }
  getTasks() { return this.get('tasks', 'all'); }
  clearTasks() { return this.clear('tasks'); }
  tasksNeedSync(maxAge) { return this.needsSync('tasks', maxAge); }
  setTasksSyncTime() { return this.setLastSyncTime('tasks'); }

  // Habits
  setHabits(habits) { return this.set('habits', 'all', habits); }
  getHabits() { return this.get('habits', 'all'); }
  clearHabits() { return this.clear('habits'); }
  habitsNeedSync(maxAge) { return this.needsSync('habits', maxAge); }
  setHabitsSyncTime() { return this.setLastSyncTime('habits'); }

  // Habit Records
  setHabitRecords(records) { return this.set('habits', 'records', records); }
  getHabitRecords() { return this.get('habits', 'records'); }
  setHabitRecordsSyncTime() { return this.setLastSyncTime('habit-records'); }

  // Folders
  setFolders(folders) { return this.set('folders', 'all', folders); }
  getFolders() { return this.get('folders', 'all'); }
  clearFolders() { return this.clear('folders'); }
  foldersNeedSync(maxAge) { return this.needsSync('folders', maxAge); }
  setFoldersSyncTime() { return this.setLastSyncTime('folders'); }

  // Stats
  setStats(stats) { return this.set('stats', 'all', stats); }
  getStats() { return this.get('stats', 'all'); }
  setStatsSyncTime() { return this.setLastSyncTime('stats'); }

  // Focus Sessions
  setFocusSessions(sessions) { return this.set('focus', 'sessions', sessions); }
  getFocusSessions() { return this.get('focus', 'sessions'); }
  setFocusSyncTime() { return this.setLastSyncTime('focus'); }

  // Pomodoro Sessions
  setPomodoroSessions(sessions) { return this.set('pomodoro', 'sessions', sessions); }
  getPomodoroSessions() { return this.get('pomodoro', 'sessions'); }
  setPomodoroSyncTime() { return this.setLastSyncTime('pomodoro'); }

  // Settings
  setSettings(settings) { return this.set('settings', 'all', settings); }
  getSettings() { return this.get('settings', 'all'); }
  setSettingsSyncTime() { return this.setLastSyncTime('settings'); }

  // User Profile
  setUserProfile(profile) { return this.set('user', 'profile', profile); }
  getUserProfile() { return this.get('user', 'profile'); }
  setUserSyncTime() { return this.setLastSyncTime('user'); }

  // Очистка всего кеша
  clearAll() {
    Object.keys(this.storages).forEach(type => {
      this.clear(type);
    });
    this.syncTimes.clearAll();
  }

  // Получение размера кеша (для отладки)
  getCacheInfo() {
    const info = {};
    Object.keys(this.storages).forEach(type => {
      try {
        // MMKV не предоставляет прямого API для размера, но можно получить ключи
        const keys = this.storages[type].getAllKeys();
        info[type] = {
          keysCount: keys.length,
          keys: keys,
          lastSync: this.getLastSyncTime(type)
        };
      } catch (error) {
        info[type] = { error: error.message };
      }
    });
    return info;
  }
}

// Экспортируем singleton
const cacheManager = new CacheManager();
export default cacheManager;

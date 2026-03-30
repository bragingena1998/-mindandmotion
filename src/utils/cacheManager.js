import sqliteCacheManager from './sqliteCacheManager';

// Универсальный менеджер кеширования для всех сущностей (теперь на SQLite)
class CacheManager {
  constructor() {
    // Типы данных для кеширования
    this.types = {
      tasks: 'tasks',
      habits: 'habits', 
      folders: 'folders',
      stats: 'stats',
      focus: 'focus',
      pomodoro: 'pomodoro',
      settings: 'settings',
      user: 'user',
      dashboard: 'dashboard',
      'habit-records': 'habit-records',
    };
  }

  // Универсальные методы
  async set(type, key, data) {
    try {
      const cacheKey = `${type}.${key}`;
      return await sqliteCacheManager.set(cacheKey, data, type);
    } catch (error) {
      console.error(`Failed to cache ${type}.${key}:`, error);
      return false;
    }
  }

  async get(type, key) {
    try {
      const cacheKey = `${type}.${key}`;
      return await sqliteCacheManager.get(cacheKey);
    } catch (error) {
      console.error(`Failed to get cached ${type}.${key}:`, error);
      return null;
    }
  }

  async remove(type, key) {
    try {
      const cacheKey = `${type}.${key}`;
      return await sqliteCacheManager.remove(cacheKey);
    } catch (error) {
      console.error(`Failed to remove cached ${type}.${key}:`, error);
      return false;
    }
  }

  async clear(type) {
    try {
      if (type) {
        return await sqliteCacheManager.clearByType(type);
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

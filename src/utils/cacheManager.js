import sqliteCacheManager from './sqliteCacheManager';

// 🗄️ Универсальный менеджер кеширования для всех сущностей (теперь на SQLite)
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
      console.log(`📦 Caching ${cacheKey}:`, data ? 'success' : 'null');
      return await sqliteCacheManager.set(cacheKey, data, type);
    } catch (error) {
      console.error(`Failed to cache ${type}.${key}:`, error);
      return false;
    }
  }

  async get(type, key) {
    try {
      const cacheKey = `${type}.${key}`;
      const result = await sqliteCacheManager.get(cacheKey);
      console.log(`📦 Getting ${cacheKey}:`, result ? 'found' : 'not found');
      return result;
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
      }
      return await sqliteCacheManager.clear();
    } catch (error) {
      console.error(`Failed to clear cache ${type}:`, error);
      return false;
    }
  }

  // Специализированные методы для разных типов данных
  async setTasks(tasks) {
    return await this.set('tasks', 'list', tasks);
  }

  async getTasks() {
    return await this.get('tasks', 'list');
  }

  async setHabits(habits) {
    return await this.set('habits', 'list', habits);
  }

  async getHabits() {
    return await this.get('habits', 'list');
  }

  async setHabitRecords(records) {
    return await this.set('habit-records', 'list', records);
  }

  async getHabitRecords() {
    return await this.get('habit-records', 'list');
  }

  async setFolders(folders) {
    return await this.set('folders', 'list', folders);
  }

  async getFolders() {
    return await this.get('folders', 'list');
  }

  async setDashboard(data) {
    return await this.set('dashboard', 'data', data);
  }

  async getDashboard() {
    return await this.get('dashboard', 'data');
  }

  async setUser(user) {
    return await this.set('user', 'profile', user);
  }

  async getUser() {
    return await this.get('user', 'profile');
  }

  async setStats(stats) {
    return await this.set('stats', 'data', stats);
  }

  async getStats() {
    return await this.get('stats', 'data');
  }

  async setSettings(settings) {
    return await this.set('settings', 'config', settings);
  }

  async getSettings() {
    return await this.get('settings', 'config');
  }

  // Время последней синхронизации
  async setSyncTime(type, timestamp = Date.now()) {
    return await this.set('sync-times', type, timestamp);
  }

  async getSyncTime(type) {
    return await this.get('sync-times', type);
  }

  async needsSync(type, maxAge = 5 * 60 * 1000) { // 5 минут
    const lastSync = await this.getSyncTime(type);
    if (!lastSync) return true;
    return Date.now() - lastSync > maxAge;
  }

  // Очистка старых данных
  async cleanup() {
    return await sqliteCacheManager.cleanup();
  }

  // Статистика кеша
  async getStats() {
    return await sqliteCacheManager.getStats();
  }

  // Проверка работоспособности
  async isHealthy() {
    try {
      // Пробуем записать и прочитать тестовые данные
      const testKey = 'health-check';
      const testValue = { timestamp: Date.now() };
      
      await sqliteCacheManager.set(testKey, testValue);
      const retrieved = await sqliteCacheManager.get(testKey);
      await sqliteCacheManager.remove(testKey);
      
      return retrieved && retrieved.timestamp === testValue.timestamp;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }
}

// 🚀 Экспорт инстанса
const cacheManager = new CacheManager();
export default cacheManager;

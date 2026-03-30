import * as SQLite from 'expo-sqlite';

// 🗄️ SQLite Cache Manager - замена MMKV
class SQLiteCacheManager {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('app_cache.db');
      
      // Создаем таблицу для кеша
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          type TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_cache_type ON cache(type);
        CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON cache(timestamp);
      `);
      
      console.log('✅ SQLite cache initialized');
    } catch (error) {
      console.error('❌ SQLite init error:', error);
      throw error;
    }
  }

  async ensureDb() {
    if (!this.db) {
      await this.initPromise;
    }
  }

  // Установить значение в кеш
  async set(key, value, type = 'default') {
    await this.ensureDb();
    try {
      const serializedValue = JSON.stringify(value);
      const timestamp = Date.now();
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO cache (key, value, timestamp, type) VALUES (?, ?, ?, ?)`,
        [key, serializedValue, timestamp, type]
      );
      
      return true;
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
      return false;
    }
  }

  // Получить значение из кеша
  async get(key) {
    await this.ensureDb();
    try {
      const result = await this.db.getFirstAsync(
        'SELECT value FROM cache WHERE key = ?',
        [key]
      );
      
      if (result?.value) {
        return JSON.parse(result.value);
      }
      return null;
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  // Получить все значения по типу
  async getByType(type) {
    await this.ensureDb();
    try {
      const results = await this.db.getAllAsync(
        'SELECT key, value FROM cache WHERE type = ? ORDER BY timestamp DESC',
        [type]
      );
      
      const data = {};
      results.forEach(row => {
        try {
          data[row.key] = JSON.parse(row.value);
        } catch (e) {
          console.error(`❌ Parse error for key ${row.key}:`, e);
        }
      });
      
      return data;
    } catch (error) {
      console.error(`❌ Cache getByType error for type ${type}:`, error);
      return {};
    }
  }

  // Удалить значение из кеша
  async remove(key) {
    await this.ensureDb();
    try {
      await this.db.runAsync('DELETE FROM cache WHERE key = ?', [key]);
      return true;
    } catch (error) {
      console.error(`❌ Cache remove error for key ${key}:`, error);
      return false;
    }
  }

  // Очистить весь кеш
  async clear() {
    await this.ensureDb();
    try {
      await this.db.runAsync('DELETE FROM cache');
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  // Очистить кеш по типу
  async clearByType(type) {
    await this.ensureDb();
    try {
      await this.db.runAsync('DELETE FROM cache WHERE type = ?', [type]);
      return true;
    } catch (error) {
      console.error(`❌ Cache clearByType error for type ${type}:`, error);
      return false;
    }
  }

  // Получить все ключи по типу
  async getKeysByType(type) {
    await this.ensureDb();
    try {
      const results = await this.db.getAllAsync(
        'SELECT key FROM cache WHERE type = ? ORDER BY timestamp DESC',
        [type]
      );
      return results.map(row => row.key);
    } catch (error) {
      console.error(`❌ Cache getKeysByType error for type ${type}:`, error);
      return [];
    }
  }

  // Проверить наличие ключа
  async has(key) {
    const value = await this.get(key);
    return value !== null;
  }

  // Получить размер кеша (количество записей)
  async getSize() {
    await this.ensureDb();
    try {
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM cache');
      return result?.count || 0;
    } catch (error) {
      console.error('❌ Cache getSize error:', error);
      return 0;
    }
  }

  // Очистка старых записей (старше N дней)
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 дней по умолчанию
    await this.ensureDb();
    try {
      const cutoffTime = Date.now() - maxAge;
      const result = await this.db.runAsync(
        'DELETE FROM cache WHERE timestamp < ?',
        [cutoffTime]
      );
      
      console.log(`🧹 Cleaned ${result.changes} old cache entries`);
      return result.changes;
    } catch (error) {
      console.error('❌ Cache cleanup error:', error);
      return 0;
    }
  }

  // Получить статистику кеша
  async getStats() {
    await this.ensureDb();
    try {
      const [totalResult, typeStats] = await Promise.all([
        this.db.getFirstAsync('SELECT COUNT(*) as total FROM cache'),
        this.db.getAllAsync('SELECT type, COUNT(*) as count FROM cache GROUP BY type ORDER BY count DESC')
      ]);

      return {
        total: totalResult?.total || 0,
        byType: typeStats.reduce((acc, row) => {
          acc[row.type] = row.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('❌ Cache getStats error:', error);
      return { total: 0, byType: {} };
    }
  }
}

// 🚀 Экспорт инстанса
const sqliteCacheManager = new SQLiteCacheManager();
export default sqliteCacheManager;

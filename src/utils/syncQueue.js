import sqliteCacheManager from './sqliteCacheManager';
import NetInfo from '@react-native-community/netinfo';

class SyncQueue {
  constructor() {
    this.isSyncing = false;
    this.initTable();
  }

  async initTable() {
    await sqliteCacheManager.ensureDb();
    await sqliteCacheManager.db.runAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        data TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  }

  // Добавить действие в очередь
  async enqueue(method, url, data) {
    console.log('📥 ENQUEUE CALLED:', method, url, JSON.stringify(data).slice(0, 100));
    console.trace(); // ← Покажет откуда вызывается
    await sqliteCacheManager.ensureDb();
    await sqliteCacheManager.db.runAsync(
      'INSERT INTO sync_queue (method, url, data, created_at) VALUES (?, ?, ?, ?)',
      [method, url, JSON.stringify(data || {}), Date.now()]
    );
    console.log(`📥 Queued: ${method} ${url}`);
  }

  // Получить все действия из очереди
  async getAll() {
    await sqliteCacheManager.ensureDb();
    return await sqliteCacheManager.db.getAllAsync(
      'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );
  }

  // Удалить выполненное действие
  async remove(id) {
    await sqliteCacheManager.ensureDb();
    await sqliteCacheManager.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  // Очистить всю очередь
  async clear() {
    await sqliteCacheManager.ensureDb();
    await sqliteCacheManager.db.runAsync('DELETE FROM sync_queue');
  }

  // Выполнить все накопленные действия
  async flush(apiInstance, onSuccessCallback = null) {
    if (this.isSyncing) {
      console.log('⚠️ FLUSH already in progress, skipping');
      return;
    }
    const items = await this.getAll();
    console.log(`📋 FLUSH: Found ${items.length} items in queue:`, items.map(i => `${i.id}:${i.method}:${i.url}`));
    if (items.length === 0) return;
    this.isSyncing = true;
    console.log(`🔄 Syncing ${items.length} queued actions...`);
    for (const item of items) {
      try {
        const data = JSON.parse(item.data);
        console.log('🚀 FLUSH SENDING:', item.method, item.url, 'item.id:', item.id, 'data.id:', data.id);
        const result = await apiInstance[item.method.toLowerCase()](item.url, data);
        console.log('✅ FLUSH DONE:', item.method, item.url, '→ result id:', result?.data?.id);
        await this.remove(item.id);
        console.log('🗑️ FLUSH REMOVED from queue:', item.id);
        
        // Вызываем callback при успешной синхронизации POST с получением real id
        if (onSuccessCallback && item.method === 'POST' && result?.data?.id) {
          // Извлекаем tempId из данных запроса если есть
          const tempId = data.id;
          if (tempId && String(tempId).startsWith('temp-')) {
            onSuccessCallback({
              tempId: tempId,
              realId: result.data.id,
              url: item.url,
              data: result.data
            });
          }
        }
        
        console.log(`✅ Synced: ${item.method} ${item.url}${result?.data?.id ? ` → real id: ${result.data.id}` : ''}`);
      } catch (err) {
        console.error(`❌ Sync failed: ${item.method} ${item.url}`, err);
        break; // останавливаемся при ошибке, попробуем позже
      }
    }
    this.isSyncing = false;
    console.log('🏁 FLUSH completed, isSyncing = false');
  }
}

const syncQueue = new SyncQueue();
export default syncQueue;

import cacheManager from './cacheManager';

// 🧹 Функция для принудительной очистки кеша при проблемах
export const resetCache = async () => {
  try {
    console.log('🧹 Starting cache reset...');
    
    // Очищаем все типы данных
    await Promise.all([
      cacheManager.clear('tasks'),
      cacheManager.clear('habits'), 
      cacheManager.clear('habit-records'),
      cacheManager.clear('dashboard'),
      cacheManager.clear('user'),
      cacheManager.clear('folders'),
      cacheManager.clear('stats'),
    ]);
    
    console.log('✅ Cache reset completed');
    return true;
  } catch (error) {
    console.error('❌ Cache reset failed:', error);
    return false;
  }
};

// 🧹 Функция для очистки старых данных
export const cleanupOldCache = async () => {
  try {
    console.log('🧹 Starting cache cleanup...');
    
    // Используем встроенную cleanup функцию
    await cacheManager.cleanup();
    
    console.log('✅ Cache cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
    return false;
  }
};

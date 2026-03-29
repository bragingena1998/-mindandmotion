import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import cacheManager from '../utils/cacheManager';

// Универсальный хук для local-first архитектуры
export const useLocalFirst = ({
  type, // 'tasks', 'habits', 'folders', etc.
  fetchFunction, // функция для загрузки с сервера
  dependencies = [], // зависимости для перезагрузки
  syncInterval = 5 * 60 * 1000, // 5 минут
  autoSync = true, // авто-синхронизация при активации
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Универсальная функция загрузки
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      
      // 1. Сначала загружаем из кеша (мгновенно)
      if (!forceRefresh) {
        const cachedData = cacheManager[`get${type.charAt(0).toUpperCase() + type.slice(1)}`]();
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
        }
      }
      
      // 2. Затем синхронизируем с сервером в фоне
      const freshData = await fetchFunction();
      setData(freshData);
      
      // 3. Сохраняем в кеш
      cacheManager[`set${type.charAt(0).toUpperCase() + type.slice(1)}`](freshData);
      cacheManager[`set${type.charAt(0).toUpperCase() + type.slice(1)}SyncTime`]();
      
      setLoading(false);
      return freshData;
      
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
      
      // Если сервер недоступен, пробуем загрузить из кеша
      if (!forceRefresh) {
        const cachedData = cacheManager[`get${type.charAt(0).toUpperCase() + type.slice(1)}`]();
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }
      
      setError(err.message || `Failed to load ${type}`);
      setData(null);
      setLoading(false);
      throw err;
    }
  }, [fetchFunction, type]);

  // Optimistic update
  const optimisticUpdate = useCallback((updaterFn) => {
    const currentData = data;
    try {
      // 1. Применяем обновление локально
      const updatedData = updaterFn(currentData);
      setData(updatedData);
      
      // 2. Сохраняем в кеш
      cacheManager[`set${type.charAt(0).toUpperCase() + type.slice(1)}`](updatedData);
      
      return { success: true, data: updatedData, originalData: currentData };
    } catch (error) {
      console.error(`Optimistic update failed for ${type}:`, error);
      return { success: false, error, originalData: currentData };
    }
  }, [data, type]);

  // Откат optimistic update
  const rollbackUpdate = useCallback((originalData) => {
    setData(originalData);
    cacheManager[`set${type.charAt(0).toUpperCase() + type.slice(1)}`](originalData);
  }, [type]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(true); // forceRefresh
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // Проверка нужна ли синхронизация
  const needsSync = useCallback(() => {
    return cacheManager.needsSync(type, syncInterval);
  }, [type, syncInterval]);

  // Тихая синхронизация
  const quietSync = useCallback(async () => {
    if (needsSync()) {
      try {
        await loadData(false);
      } catch (error) {
        console.log(`Quiet sync failed for ${type}:`, error);
      }
    }
  }, [loadData, needsSync]);

  // Initial load
  useEffect(() => {
    loadData();
  }, dependencies);

  // Авто-синхронизация при активации приложения
  useEffect(() => {
    if (!autoSync) return;

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        quietSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [autoSync, quietSync]);

  return {
    data,
    loading,
    error,
    refreshing,
    loadData,
    onRefresh,
    optimisticUpdate,
    rollbackUpdate,
    needsSync,
    quietSync,
  };
};

// Специализированные хуки для разных сущностей
export const useLocalFirstTasks = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'tasks',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstHabits = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'habits',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstFolders = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'folders',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstStats = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'stats',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstFocus = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'focus',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstPomodoro = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'pomodoro',
    fetchFunction,
    dependencies,
  });
};

export const useLocalFirstSettings = (fetchFunction, dependencies = []) => {
  return useLocalFirst({
    type: 'settings',
    fetchFunction,
    dependencies,
  });
};

export default useLocalFirst;

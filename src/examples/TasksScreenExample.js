// Пример как будет выглядеть упрощенный TasksScreen с новым хуком

const TasksScreen = () => {
  const { colors } = useTheme();
  const { bumpAll } = useDataSync();
  
  // 🚀 Универсальные хуки заменяют все сложные функции
  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refreshing,
    loadData: loadTasks,
    onRefresh,
    optimisticUpdate,
    rollbackUpdate,
  } = useLocalFirstTasks(
    async () => {
      const token = await getToken();
      const [res, resStats] = await Promise.all([
        tasksAPI.getTasks({}),
        api.get('/tasks/stats')
      ]);
      return { tasks: res, stats: resStats.data };
    },
    [selectedDate] // зависимости
  );

  const {
    data: folders,
    loading: foldersLoading,
    loadData: loadFolders,
  } = useLocalFirstFolders(
    async () => {
      return await foldersAPI.getFolders();
    },
    []
  );

  // 🎯 Optimistic updates в одну строку
  const toggleTask = async (taskId) => {
    const result = optimisticUpdate(currentTasks => 
      currentTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      )
    );

    if (!result.success) {
      showToast('❌ Ошибка');
      return;
    }

    try {
      await tasksAPI.updateTask(taskId, { done: !result.originalData.find(t => t.id === taskId).done });
      showToast('✅ Задача обновлена');
      bumpAll();
    } catch (error) {
      rollbackUpdate(result.originalData);
      showToast('❌ Ошибка сервера');
    }
  };

  const deleteTask = async (taskId) => {
    const result = optimisticUpdate(currentTasks => 
      currentTasks.filter(task => task.id !== taskId)
    );

    if (!result.success) return;

    try {
      await tasksAPI.deleteTask(taskId);
      showToast('🗑️ Задача удалена');
      bumpAll();
    } catch (error) {
      rollbackUpdate(result.originalData);
      showToast('❌ Ошибка удаления');
    }
  };

  // 🎯 Все остальное - просто рендер
  return (
    <Background>
      <FlatList
        data={tasks?.tasks || []}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={renderItem}
        // ... остальные props
      />
    </Background>
  );
};

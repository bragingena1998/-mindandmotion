// ========================================
// API ДЛЯ РАБОТЫ С ЗАДАЧАМИ
// ========================================

const TASKS_API_URL = 'http://85.198.96.149:5000';

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

function getAuthToken() {
  return localStorage.getItem('app-auth-token');
}

function isUserLoggedIn() {
  return !!getAuthToken();
}

// ========================================
// API ЗАПРОСЫ
// ========================================

// GET: Получить все задачи пользователя
async function fetchTasks() {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');
  
  const response = await fetch(`${TASKS_API_URL}/api/tasks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка загрузки задач: ${response.status}`);
  }
  
  return response.json();
}

// POST: Создать новую задачу
async function createTask(taskData) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');
  
  const response = await fetch(`${TASKS_API_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка создания задачи: ${response.status}`);
  }
  
  return response.json();
}

// PUT: Обновить задачу
async function updateTask(taskId, taskData) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');
  
  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка обновления задачи: ${response.status}`);
  }
  
  return response.json();
}

// DELETE: Удалить задачу
async function deleteTask(taskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');
  
  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка удаления задачи: ${response.status}`);
  }
  
  return response.json();
}

// ========================================
// АДАПТЕРЫ ДАННЫХ
// ========================================

// Преобразование: БД → Frontend
function adaptTaskFromAPI(dbTask) {
  return {
    id: dbTask.id,
    title: dbTask.title || '',
    comment: dbTask.description || '',
    date: dbTask.date || getTodayISO(),
    deadline: dbTask.due_date || '',
    priority: priorityTextToNumber(dbTask.priority),
    done: !!dbTask.completed,
    doneDate: dbTask.donedate || null,
    focusSessions: dbTask.focussessions || 0
  };
}

// Преобразование: Frontend → БД
function adaptTaskForAPI(localTask) {
  return {
    title: localTask.title,
    description: localTask.comment || '',
    date: localTask.date,
    due_date: localTask.deadline || null,
    priority: priorityNumberToText(localTask.priority),
    completed: localTask.done,
    donedate: localTask.doneDate || null,
    focussessions: localTask.focusSessions || 0
  };
}

// Приоритет: текст → число (1=высокий, 2=средний, 3=низкий)
function priorityTextToNumber(text) {
  const map = {
    'high': 1,
    'medium': 2,
    'low': 3
  };
  return map[text] || 2;
}

// Приоритет: число → текст
function priorityNumberToText(num) {
  const map = {
    1: 'high',
    2: 'medium',
    3: 'low'
  };
  return map[num] || 'medium';
}

// Получить сегодняшнюю дату в формате ISO
function getTodayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ========================================
// ЭКСПОРТ ФУНКЦИЙ (для использования в HTML)
// ========================================

// Эти функции будут доступны глобально
window.TasksAPI = {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  adaptTaskFromAPI,
  adaptTaskForAPI,
  isUserLoggedIn
};

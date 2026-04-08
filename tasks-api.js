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
// ЗАДАЧИ
// ========================================

// GET: Получить задачи (с фильтром по папке)
async function fetchTasks(folderId = null) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const url = folderId !== null
    ? `${TASKS_API_URL}/api/tasks?folder_id=${folderId}`
    : `${TASKS_API_URL}/api/tasks`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка загрузки задач: ${response.status}`);
  return response.json();
}

// POST: Создать задачу
async function createTask(taskData) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(taskData)
  });
  if (!response.ok) throw new Error(`Ошибка создания задачи: ${response.status}`);
  return response.json();
}

// PUT: Обновить задачу
async function updateTask(taskId, taskData) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(taskData)
  });
  if (!response.ok) throw new Error(`Ошибка обновления задачи: ${response.status}`);
  return response.json();
}

// DELETE: Удалить задачу
async function deleteTask(taskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка удаления задачи: ${response.status}`);
  return response.json();
}

// PUT: Остановить повторение задачи
async function stopRecurringTask(taskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/stop-recurring`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка остановки повторения: ${response.status}`);
  return response.json();
}

// POST: Добавить фокус-сессию к задаче
async function addFocusSession(taskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/focus`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка добавления фокус-сессии: ${response.status}`);
  return response.json();
}

// GET: Статистика задач
async function fetchTaskStats() {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/stats`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка загрузки статистики: ${response.status}`);
  return response.json();
}

// ========================================
// ПАПКИ
// ========================================

// GET: Получить все папки
async function fetchFolders() {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/folders`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка загрузки папок: ${response.status}`);
  return response.json();
}

// POST: Создать папку
async function createFolder(name) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error(`Ошибка создания папки: ${response.status}`);
  return response.json();
}

// PUT: Переименовать папку
async function updateFolder(id, name) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error(`Ошибка обновления папки: ${response.status}`);
  return response.json();
}

// DELETE: Удалить папку
async function deleteFolder(id) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/folders/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка удаления папки: ${response.status}`);
  return response.json();
}

// ========================================
// ПОДЗАДАЧИ
// ========================================

// GET: Получить подзадачи задачи
async function fetchSubtasks(taskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/subtasks`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка загрузки подзадач: ${response.status}`);
  return response.json();
}

// POST: Создать подзадачу
async function createSubtask(taskId, title) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title })
  });
  if (!response.ok) throw new Error(`Ошибка создания подзадачи: ${response.status}`);
  return response.json();
}

// PUT: Переключить выполнение подзадачи
async function toggleSubtask(taskId, subtaskId, completed) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ completed })
  });
  if (!response.ok) throw new Error(`Ошибка обновления подзадачи: ${response.status}`);
  return response.json();
}

// DELETE: Удалить подзадачу
async function deleteSubtask(taskId, subtaskId) {
  const token = getAuthToken();
  if (!token) throw new Error('Не авторизован');

  const response = await fetch(`${TASKS_API_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Ошибка удаления подзадачи: ${response.status}`);
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
    comment: dbTask.description || dbTask.comment || '',
    date: dbTask.date || getTodayISO(),
    deadline: dbTask.due_date || dbTask.deadline || '',
    priority: priorityTextToNumber(dbTask.priority),
    done: !!(dbTask.completed || dbTask.done),
    doneDate: dbTask.donedate || dbTask.done_date || dbTask.doneDate || null,
    focusSessions: dbTask.focussessions || dbTask.focus_sessions || dbTask.focusSessions || 0,
    isRecurring: !!(dbTask.isrecurring || dbTask.is_recurring || dbTask.isRecurring),
    recurrenceType: dbTask.recurrencetype || dbTask.recurrence_type || dbTask.recurrenceType || '',
    recurrenceValue: dbTask.recurrencevalue || dbTask.recurrence_value || dbTask.recurrenceValue || '',
    isGenerated: !!(dbTask.isgenerated || dbTask.is_generated || dbTask.isGenerated),
    templateId: dbTask.templateid || dbTask.template_id || dbTask.templateId || null,
    folderId: dbTask.folderid || dbTask.folder_id || dbTask.folderId || null,
    subtasksCount: dbTask.subtasks_count || 0
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
    focussessions: localTask.focusSessions || 0,
    is_recurring: localTask.isRecurring || false,
    recurrence_type: localTask.recurrenceType || '',
    recurrence_value: localTask.recurrenceValue || '',
    folder_id: localTask.folderId || null
  };
}

// Приоритет: текст → число (1=высокий, 2=средний, 3=низкий)
function priorityTextToNumber(text) {
  const map = { 'high': 1, 'Высокий': 1, 'medium': 2, 'Нормальный': 2, 'low': 3, 'Низкий': 3 };
  return map[text] || 2;
}

// Приоритет: число → текст
function priorityNumberToText(num) {
  const map = { 1: 'high', 2: 'medium', 3: 'low' };
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

window.TasksAPI = {
  // Задачи
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  stopRecurringTask,
  addFocusSession,
  fetchTaskStats,
  // Папки
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  // Подзадачи
  fetchSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  // Адаптеры
  adaptTaskFromAPI,
  adaptTaskForAPI,
  isUserLoggedIn
};

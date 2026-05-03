// ========================================
// API для работы с задачами
// ========================================

import { apiClient } from './client';

// ========================================
// ТИПЫ
// ========================================

export interface Task {
  id: number;
  title: string;
  comment: string;
  date: string;
  time?: string;
  deadline: string | null;
  priority: 1 | 2 | 3; // 1=low, 2=medium, 3=high
  done: boolean;
  doneDate: string | null;
  focusSessions: number;
  isRecurring: boolean;
  recurrenceType: string;
  recurrenceValue: string;
  recurrence?: string; // 'none' | 'daily' | 'weekly' | 'monthly'
  isGenerated: boolean;
  templateId: number | null;
  folderId: number | null;
  subtasksCount: number;
  nextDate?: string;
}

export interface Folder {
  id: number;
  name: string;
  icon?: string; // ФАЙЛ 6: emoji иконка папки
}

export interface CreateTaskData {
  title: string;
  comment?: string;
  date?: string;
  time?: string;
  deadline?: string | null;
  priority?: 1 | 2 | 3;
  folderId?: number | null;
  recurrence?: string;
}

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  done: boolean;
}

// Адаптер подзадачи из API (snake_case → camelCase)
function adaptSubtaskFromAPI(raw: any): Subtask {
  return {
    id: raw.id,
    taskId: raw.task_id ?? raw.taskId,
    title: raw.title,
    done: Boolean(raw.completed ?? raw.done),
  };
}

// ========================================
// АДАПТЕРЫ
// ========================================

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function priorityTextToNumber(raw: any): 1 | 2 | 3 {
  // Если уже число
  const num = Number(raw);
  if (num === 1 || num === 2 || num === 3) return num as 1 | 2 | 3;
  // Если строка-текст
  const map: Record<string, 1 | 2 | 3> = {
    'low': 1, '1': 1,
    'medium': 2, '2': 2, 'normal': 2,
    'high': 3, '3': 3,
  };
  return map[String(raw)?.toLowerCase()] ?? 2;
}

// API → Frontend
export function adaptTaskFromAPI(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title || '',
    comment: dbTask.description || dbTask.comment || '',
    date: dbTask.date || getTodayISO(),
    // [4] ФИКС: конвертируем UTC время обратно в локальное
    time: extractLocalTime(dbTask.time || ''),
    deadline: dbTask.due_date || dbTask.deadline || '',
    priority: priorityTextToNumber(dbTask.priority),
    done: !!(dbTask.completed || dbTask.done),
    doneDate: dbTask.donedate || dbTask.done_date || dbTask.doneDate || null,
    focusSessions: dbTask.focussessions || dbTask.focus_sessions || dbTask.focusSessions || 0,
    isRecurring: !!(dbTask.isrecurring || dbTask.is_recurring || dbTask.isRecurring),
    recurrenceType: dbTask.recurrencetype || dbTask.recurrence_type || dbTask.recurrenceType || '',
    recurrenceValue: dbTask.recurrencevalue || dbTask.recurrence_value || dbTask.recurrenceValue || '',
    recurrence: dbTask.recurrence || 'none',
    isGenerated: !!(dbTask.isgenerated || dbTask.is_generated || dbTask.isGenerated),
    templateId: dbTask.templateid || dbTask.template_id || dbTask.templateId || null,
    folderId: dbTask.folderid || dbTask.folder_id || dbTask.folderId || null,
    subtasksCount: dbTask.subtasks_count || dbTask.subtasksCount || 0
  };
}

// ФАЙЛ 5 FIX: Конвертация локального времени в UTC для API
function localTimeToUTC(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  // Создаём дату с локальным временем
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  // Конвертируем в UTC
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

// [B] ФИКС: Конвертация UTC HH:MM → локальное время
export function extractLocalTime(isoOrTime: string): string {
  if (!isoOrTime) return '';
  if (isoOrTime.includes('T')) {
    // ISO строка — извлекаем время в локальном timezone
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  // [B] HH:MM из UTC (бэкенд) → конвертируем в локальное время
  const [h, m] = isoOrTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return isoOrTime;
  const today = new Date();
  const utcDate = new Date(Date.UTC(
    today.getFullYear(), today.getMonth(), today.getDate(), h, m
  ));
  return `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`;
}

export function adaptTaskForAPI(localTask: Partial<Task> | CreateTaskData & { nextDate?: string }): any {
  const task = localTask as any;

  // Определяем isRecurring — приоритет у явного поля isRecurring
  const isRecurring = task.isRecurring === true
    ? true
    : (task.recurrence && task.recurrence !== 'none') ? true : false;

  const recurrenceType = task.recurrenceType
    || (task.recurrence && task.recurrence !== 'none' ? task.recurrence : null)
    || null;

  const utcTime = task.time ? localTimeToUTC(task.time) : null;

  const result: any = {
    title:            task.title,
    comment:          task.comment || '',
    date:             task.date || null,
    time:             utcTime,
    deadline:         task.deadline || null,
    priority:         task.priority || 2,
    done:             task.done === true ? true : false,
    doneDate:         task.doneDate || null,
    focusSessions:    task.focusSessions || 0,
    isRecurring:      isRecurring,
    recurrenceType:   recurrenceType,
    recurrenceValue:  task.recurrenceValue || '',
    folderId:         task.folderId || null,
  };

  // Передаём nextDate если он есть
  if (task.nextDate) {
    result.nextDate = task.nextDate;
  }

  return result;
}

// ========================================
// API МЕТОДЫ
// ========================================

export async function fetchTasks(
  folderId?: number | null,
  month?: string // format: '2026-04'
): Promise<Task[]> {
  const params = new URLSearchParams();

  if (folderId !== undefined && folderId !== null) {
    params.append('folder_id', folderId.toString());
  }

  if (month) {
    const [year, monthNum] = month.split('-');
    params.append('year', year);
    params.append('month', monthNum);
  }

  const queryString = params.toString();
  const url = queryString ? `/tasks?${queryString}` : `/tasks`;

  const response = await apiClient.get(url);
  const data = response.data;
  return (data.tasks || data).map(adaptTaskFromAPI);
}

export async function createTask(taskData: CreateTaskData): Promise<Task> {
  const response = await apiClient.post('/tasks', adaptTaskForAPI(taskData));
  const data = response.data;
  return adaptTaskFromAPI(data.task || data);
}

export async function updateTask(taskId: number, taskData: Partial<Task>): Promise<Task> {
  const response = await apiClient.put(`/tasks/${taskId}`, adaptTaskForAPI(taskData));
  const data = response.data;
  return adaptTaskFromAPI(data.task || data);
}

export async function deleteTask(taskId: number): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

export async function fetchTotalCompletedCount(): Promise<number> {
  try {
    // Пробуем эндпоинт статистики (если есть на бэкенде)
    const response = await apiClient.get('/tasks/stats');
    const data = response.data;
    if (data.totalCompleted !== undefined) return Number(data.totalCompleted);
    if (data.total_completed !== undefined) return Number(data.total_completed);
    if (data.completed !== undefined) return Number(data.completed);
  } catch {
    // /tasks/stats не существует — идём запасным путём
  }

  try {
    // Запасной путь: GET /tasks?all=true
    const response = await apiClient.get('/tasks?all=true');
    const data = response.data;
    const tasks = (data.tasks || data).map(adaptTaskFromAPI);
    const count = tasks.filter((t: Task) => t.done).length;
    if (count > 0) return count;
  } catch {
    // /tasks?all=true тоже не работает
  }

  try {
    // Последний вариант: считаем из уже загруженных задач текущего запроса
    const response = await apiClient.get('/tasks');
    const data = response.data;
    const tasks = (data.tasks || data).map(adaptTaskFromAPI);
    return tasks.filter((t: Task) => t.done).length;
  } catch {
    return 0;
  }
}

// ========================================
// ПАПКИ
// ========================================

export async function fetchFolders(): Promise<Folder[]> {
  const response = await apiClient.get('/folders');
  const data = response.data;
  return data.folders || data;
}

export async function createFolder(name: string): Promise<Folder> {
  const response = await apiClient.post('/folders', { name });
  const data = response.data;
  return data.folder || data;
}

// ========================================
// ПОДЗАДАЧИ
// ========================================

export async function fetchSubtasks(taskId: number): Promise<Subtask[]> {
  const response = await apiClient.get(`/tasks/${taskId}/subtasks`);
  const data = response.data;
  return (data.subtasks || data).map(adaptSubtaskFromAPI);
}

export async function createSubtask(taskId: number, title: string): Promise<Subtask> {
  const response = await apiClient.post(`/tasks/${taskId}/subtasks`, { title });
  const data = response.data;
  return adaptSubtaskFromAPI(data.subtask || data);
}

export async function updateSubtask(
  taskId: number,
  subtaskId: number,
  data: Partial<Subtask>
): Promise<Subtask> {
  const response = await apiClient.put(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    title: data.title,
    completed: data.done,
  });
  const result = response.data;
  return adaptSubtaskFromAPI(result.subtask || result);
}

export async function deleteSubtask(taskId: number, subtaskId: number): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
}

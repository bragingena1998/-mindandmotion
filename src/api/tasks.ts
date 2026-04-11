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
  deadline: string;
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
}

export interface Folder {
  id: number;
  name: string;
}

export interface CreateTaskData {
  title: string;
  comment?: string;
  date?: string;
  time?: string;
  deadline?: string;
  priority?: 1 | 2 | 3;
  folderId?: number | null;
  recurrence?: string;
}

// ========================================
// АДАПТЕРЫ
// ========================================

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function priorityTextToNumber(text: string): 1 | 2 | 3 {
  const map: Record<string, 1 | 2 | 3> = {
    'low': 1, 'Низкий': 1,
    'medium': 2, 'Нормальный': 2,
    'high': 3, 'Высокий': 3
  };
  return map[text] ?? 2;
}

function priorityNumberToText(num: number): 'low' | 'medium' | 'high' {
  const map: Record<number, 'low' | 'medium' | 'high'> = { 1: 'low', 2: 'medium', 3: 'high' };
  return map[num] || 'medium';
}

// API → Frontend
export function adaptTaskFromAPI(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title || '',
    comment: dbTask.description || dbTask.comment || '',
    date: dbTask.date || getTodayISO(),
    time: dbTask.time || '',
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

// Frontend → API
export function adaptTaskForAPI(localTask: Partial<Task> | CreateTaskData): any {
  // БАГ 6 FIX: Определяем is_recurring из recurrence поля
  const recurrence = localTask.recurrence || 'none';
  const isRecurring = recurrence !== 'none';
  const recurrenceType = isRecurring ? recurrence : '';

  return {
    title: localTask.title,
    description: localTask.comment || '',
    date: (localTask as Task).date,
    time: localTask.time || null,
    due_date: localTask.deadline || null,
    priority: priorityNumberToText(localTask.priority || 2),
    completed: (localTask as Task).done,
    donedate: (localTask as Task).doneDate || null,
    focussessions: (localTask as Task).focusSessions || 0,
    is_recurring: (localTask as Task).isRecurring || isRecurring,
    recurrence_type: (localTask as Task).recurrenceType || recurrenceType,
    recurrence_value: (localTask as Task).recurrenceValue || '',
    recurrence: recurrence,
    folder_id: localTask.folderId || null
  };
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

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
  console.log('[DEBUG adaptTask]', JSON.stringify(dbTask).slice(0, 300));
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

export function adaptTaskForAPI(localTask: Partial<Task> | CreateTaskData): any {
  const recurrence = (localTask as any).recurrence ?? 'none';
  const isRecurring = recurrence !== 'none';
  const recurrenceType = isRecurring ? recurrence : '';
  const utcTime = localTask.time ? localTimeToUTC(localTask.time) : null;

  const deadlineRaw = (localTask as any).deadline;
  const dueDate = (deadlineRaw !== undefined && deadlineRaw !== '') ? deadlineRaw : null;

  const folderIdRaw = (localTask as any).folderId;
  const folderId = (folderIdRaw !== undefined) ? folderIdRaw : null;

  return {
    title: localTask.title,
    description: (localTask as any).comment ?? '',
    date: (localTask as any).date ?? null,
    time: utcTime,
    due_date: dueDate,
    priority: priorityNumberToText((localTask as any).priority ?? 2),
    completed: (localTask as any).done ?? false,
    donedate: (localTask as any).doneDate ?? null,
    focussessions: (localTask as any).focusSessions ?? 0,
    is_recurring: isRecurring,
    recurrence_type: recurrenceType,
    recurrence_value: '',
    recurrence: recurrence,
    folder_id: folderId
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

// ШАГ 1: Получение общего счётчика выполненных задач за всё время
export async function fetchTotalCompletedCount(): Promise<number> {
  try {
    // Пробуем статистический эндпоинт
    const response = await apiClient.get('/tasks/stats/total-completed');
    const data = response.data;
    return data.count ?? data.total ?? 0;
  } catch {
    // Fallback: загружаем все задачи без фильтра месяца
    const response = await apiClient.get('/tasks?all=true');
    const data = response.data;
    const tasks = (data.tasks || data).map(adaptTaskFromAPI);
    return tasks.filter((t: Task) => t.done).length;
  }
}

// ========================================
// ПАПКИ
// ========================================

export async function fetchFolders(): Promise<Folder[]> {
  const response = await apiClient.get('/folders');
  const data = response.data;
  console.log('[DEBUG folders]', JSON.stringify(data.folders || data).slice(0, 300));
  return data.folders || data;
}

export async function createFolder(name: string): Promise<Folder> {
  const response = await apiClient.post('/folders', { name });
  const data = response.data;
  return data.folder || data;
}

// ========================================
// API для работы с привычками
// ========================================

import { apiClient } from './client';

// ========================================
// ТИПЫ
// ========================================

export interface Habit {
  id: number;
  name: string;
  unit: string;                          // 'Дни' | 'Часы' | 'Кол-во' | string
  plan: number;
  targetType: 'daily' | 'monthly' | 'period';
  startYear?: number;
  startMonth?: number;
  startDate?: string | null;               // 'YYYY-MM-DD'
  endDate?: string | null;                 // 'YYYY-MM-DD'
  daysOfWeek?: number[];                 // [0,1,2] 0=Вс, в БД JSON string
  orderIndex: number;
  userId?: number;
  createdAt?: string;
}

export interface HabitRecord {
  habitId: number;
  year: number;
  month: number;
  day: number;
  value: number;
}

// ========================================
// АДАПТЕРЫ
// ========================================

// API → Frontend (defensive: покрываем все варианты имён полей)
function adaptHabitFromAPI(raw: any): Habit {
  // Парсинг days_of_week из JSON если это string
  let daysOfWeek: number[] | undefined;
  const rawDays = raw.days_of_week ?? raw.daysOfWeek ?? raw.daysofweek;
  if (rawDays) {
    if (Array.isArray(rawDays)) {
      daysOfWeek = rawDays;
    } else if (typeof rawDays === 'string') {
      try {
        daysOfWeek = JSON.parse(rawDays);
      } catch {
        daysOfWeek = [];
      }
    }
  }

  return {
    id: Number(raw.id),
    name: raw.name || '',
    unit: raw.unit || 'раз',
    plan: Number(raw.plan) || 0,
    targetType: (raw.target_type ?? raw.targetType ?? raw.targettype ?? 'monthly') as 'daily' | 'monthly' | 'period',
    startYear: raw.start_year ?? raw.startYear ?? raw.startyear ?? undefined,
    startMonth: raw.start_month ?? raw.startMonth ?? raw.startmonth ?? undefined,
    startDate: (raw.start_date || raw.startDate || raw.startdate) || null,
    endDate: (raw.end_date || raw.endDate || raw.enddate) || null,
    daysOfWeek,
    orderIndex: Number(raw.order_index ?? raw.orderIndex ?? raw.orderindex ?? 0),
    userId: raw.user_id ?? raw.userId ?? raw.userid ?? undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? raw.createdat ?? undefined,
  };
}

// Frontend → API (camelCase → snake_case)
function adaptHabitForAPI(habit: Partial<Habit>): any {
  const result: any = {};

  if (habit.name !== undefined) result.name = habit.name;
  if (habit.unit !== undefined) result.unit = habit.unit;
  if (habit.plan !== undefined) result.plan = habit.plan;
  if (habit.targetType !== undefined) result.target_type = habit.targetType;
  if (habit.startDate !== undefined) result.start_date = habit.startDate;
  if (habit.endDate !== undefined) result.end_date = habit.endDate;
  if (habit.startYear !== undefined) result.start_year = habit.startYear;
  if (habit.startMonth !== undefined) result.start_month = habit.startMonth;
  if (habit.orderIndex !== undefined) result.order_index = habit.orderIndex;

  // daysOfWeek → JSON string
  if (habit.daysOfWeek !== undefined) {
    result.days_of_week = Array.isArray(habit.daysOfWeek) ? JSON.stringify(habit.daysOfWeek) : habit.daysOfWeek;
  }

  return result;
}

// API → Frontend для записи привычки
// ВАЖНО: сервер возвращает habitid (без underscore!)
function adaptRecordFromAPI(raw: any): HabitRecord {
  return {
    habitId: Number(raw.habitid ?? raw.habit_id ?? raw.habitId ?? 0),
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    value: Number(raw.value) || 0,
  };
}

// ========================================
// API МЕТОДЫ — Загрузка
// ========================================

export async function fetchHabits(year: number, month: number): Promise<Habit[]> {
  const response = await apiClient.get(`/habits?year=${year}&month=${month}`);
  const data = response.data;
  const habits = data.habits ?? data ?? [];
  return habits.map(adaptHabitFromAPI);
}

export async function fetchHabitRecords(year: number, month: number): Promise<HabitRecord[]> {
  console.log('[fetchHabitRecords] START', { year, month });

  const response = await apiClient.get(`/habits/records/${year}/${month}`);

  console.log('[fetchHabitRecords] RAW RESPONSE:', {
    status: response.status,
    dataType: typeof response.data,
    isArray: Array.isArray(response.data),
    length: Array.isArray(response.data) ? response.data.length : 'N/A',
    first3: Array.isArray(response.data) ? response.data.slice(0, 3) : response.data,
  });

  const data = response.data;
  const records = data.records ?? data ?? [];
  const mapped = records.map(adaptRecordFromAPI);

  console.log('[fetchHabitRecords] MAPPED:', {
    count: mapped.length,
    first3: mapped.slice(0, 3),
  });

  return mapped;
}

// ========================================
// API МЕТОДЫ — Записи (ячейки таблицы)
// ========================================

export async function createHabitRecord(
  habitId: number,
  year: number,
  month: number,
  day: number,
  value: number
): Promise<void> {
  const payload = { habit_id: habitId, year, month, day, value };
  console.log('[API createHabitRecord] Request:', { url: '/habits/records', payload });
  try {
    const response = await apiClient.post('/habits/records', payload);
    console.log('[API createHabitRecord] Response:', { status: response.status, data: response.data });
  } catch (err: any) {
    console.error('[API createHabitRecord] Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers,
    });
    throw err;
  }
}

export async function deleteHabitRecord(
  habitId: number,
  year: number,
  month: number,
  day: number
): Promise<void> {
  const url = `/habits/records/${habitId}/${year}/${month}/${day}`;
  console.log('[API deleteHabitRecord] Request:', { url, habitId, year, month, day });
  try {
    const response = await apiClient.delete(url);
    console.log('[API deleteHabitRecord] Response:', { status: response.status, data: response.data });
  } catch (err: any) {
    console.error('[API deleteHabitRecord] Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers,
    });
    throw err;
  }
}

// ========================================
// API МЕТОДЫ — CRUD привычек
// ========================================

export async function createHabit(
  habit: Omit<Habit, 'id' | 'createdAt' | 'userId'> & { year: number; month: number }
): Promise<{ id: number }> {
  const payload = adaptHabitForAPI(habit);
  // Добавляем year/month для бэкенда
  payload.year = habit.year;
  payload.month = habit.month;

  const response = await apiClient.post('/habits', payload);
  const data = response.data;
  return { id: data.id ?? data.habitId ?? data.habit_id ?? data.insertId ?? 0 };
}

export async function updateHabit(id: number, habit: Partial<Habit>): Promise<void> {
  const payload = adaptHabitForAPI(habit);
  await apiClient.put(`/habits/${id}`, payload);
}

export async function archiveHabit(id: number, year: number, month: number): Promise<void> {
  await apiClient.put(`/habits/${id}/archive`, { year, month });
}

export async function reorderHabits(habits: { id: number; orderIndex: number }[]): Promise<void> {
  const payload = {
    habits: habits.map(h => ({
      id: h.id,
      order_index: h.orderIndex,
    })),
  };
  await apiClient.put('/habits/reorder', payload);
}

export async function deleteHabit(id: number, year: number, month: number): Promise<void> {
  await apiClient.delete(`/habits/${id}?year=${year}&month=${month}`);
}

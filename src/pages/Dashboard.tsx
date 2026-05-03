import { useState, useEffect, useCallback } from 'react';
import { Circle, Check, TrendingUp, Award, Calendar, Clock, CheckCheck, Target } from 'lucide-react';
import type { Task } from '../api/tasks';
import type { Habit, HabitRecord } from '../api/habits';
import { fetchTasks, updateTask } from '../api/tasks';
import { fetchHabits, fetchHabitRecords, createHabitRecord, deleteHabitRecord } from '../api/habits';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [completingId, setCompletingId] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Проверка выполнена ли привычка сегодня
  const isHabitDoneToday = (habitId: number) => {
    const today = new Date();
    return habitRecords.some(r =>
      r.habitId === habitId &&
      r.year === today.getFullYear() &&
      r.month === today.getMonth() + 1 &&
      r.day === today.getDate() &&
      r.value > 0
    );
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[Dashboard] Loading data...');
      const [tasksData, habitsData, recordsData] = await Promise.all([
        fetchTasks(),
        fetchHabits(currentYear, currentMonth),
        fetchHabitRecords(currentYear, currentMonth),
      ]);
      console.log('[Dashboard] Tasks loaded:', tasksData.length, 'Done tasks:', tasksData.filter(t => t.done).length);
      console.log('[Dashboard] Habits loaded:', habitsData.length, 'Active:', habitsData.filter(h => h.active === true).length);
      console.log('[Dashboard] Records loaded:', recordsData.length);
      setTasks(tasksData);
      setHabits(habitsData);
      setHabitRecords(recordsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();
    const storedName = localStorage.getItem('user-name') || localStorage.getItem('app-user-email')?.split('@')[0] || 'Пользователь';
    setUserName(storedName);
  }, [loadData]);

  const todayTasks = tasks.filter((task) => {
    if (!task.date) return false;
    if (!task.title || task.title.trim() === '') return false;
    return task.date.slice(0, 10) === today && !task.done;
  });
  const completedToday = tasks.filter((task) => {
    if (!task.date) return false;
    return task.date.slice(0, 10) === today && task.done;
  }).length;

  const overdueTasks = tasks.filter((task) => {
    if (!task.date || !task.title || task.title.trim() === '') return false;
    return task.date.slice(0, 10) < today && !task.done;
  });

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const tomorrowTasks = tasks.filter((task) => {
    if (!task.date || !task.title || task.title.trim() === '') return false;
    return task.date.slice(0, 10) === tomorrow && !task.done;
  });

  const activeHabits = habits.filter((h) => h.active !== false);
  const doneHabitsToday = activeHabits.filter(h => isHabitDoneToday(h.id)).length;

  const getHabitProgress = (habitId: number) => {
    const record = habitRecords.find((r) => r.habitId === habitId);
    return record ? record.completed : 0;
  };

  const handleTaskToggle = async (taskId: number, currentDone: boolean) => {
    if (!currentDone) setCompletingId(taskId);
    try {
      await updateTask(taskId, { done: !currentDone });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, done: !currentDone } : t))
      );
      setTimeout(() => setCompletingId(null), 600);
    } catch (error) {
      console.error('Failed to update task:', error);
      setCompletingId(null);
    }
  };

  const handleHabitToggle = async (habitId: number, dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);

    const existingRecord = habitRecords.find(
      (r) => r.habitId === habitId && r.year === year && r.month === month && r.day === day
    );

    try {
      if (existingRecord) {
        await deleteHabitRecord(habitId, year, month, day);
      } else {
        await createHabitRecord(habitId, year, month, day, 1);
      }
      // Точечное обновление только records вместо полного reload
      const updatedRecords = await fetchHabitRecords(currentYear, currentMonth);
      setHabitRecords(updatedRecords);
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateStreak = () => {
    if (activeHabits.length === 0) return 0;
    const today = new Date();
    const completedToday = activeHabits.filter(habit =>
      habitRecords.some(r =>
        r.habitId === habit.id &&
        r.year === today.getFullYear() &&
        r.month === today.getMonth() + 1 &&
        r.day === today.getDate() &&
        r.value > 0
      )
    ).length;
    return Math.floor((completedToday / activeHabits.length) * 100) || 0;
  };

  const buildWeekGrid = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter(t => t.date?.slice(0,10) === dateStr);
      const done = dayTasks.filter(t => t.done).length;
      const total = dayTasks.length;
      const pct = total > 0 ? done / total : 0;
      const isToday = dateStr === today;
      days.push({ dateStr, done, total, pct, isToday, label: d.toLocaleDateString('ru-RU', { weekday: 'short' }) });
    }
    return days;
  };
  const weekGrid = buildWeekGrid();

  const upcomingTask = tasks
    .filter(t => {
      if (!t.date || !t.time || t.done || !t.title?.trim()) return false;
      const taskDateTime = new Date(`${t.date.slice(0,10)}T${t.time}`);
      return taskDateTime > new Date();
    })
    .sort((a, b) => {
      const da = new Date(`${a.date.slice(0,10)}T${a.time}`);
      const db = new Date(`${b.date.slice(0,10)}T${b.time}`);
      return da.getTime() - db.getTime();
    })[0] || null;

  const getTimeUntil = (date: string, time: string) => {
    const diff = new Date(`${date.slice(0,10)}T${time}`).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `через ${Math.floor(hours/24)} д.`;
    if (hours > 0) return `через ${hours} ч. ${mins} мин.`;
    return `через ${mins} мин.`;
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="dashboard-skeleton">
          <div className="skeleton-header" />
          <div className="dashboard-grid">
            <div className="skeleton-widget" />
            <div className="skeleton-widget" />
            <div className="skeleton-widget" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <div className="dashboard-header">
        <h1 className="greeting">
          {getGreeting()}, {userName}!
        </h1>
        <p className="current-date">
          <Calendar size={16} />
          {formatDate()}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Today's Tasks Widget */}
        <div className="dashboard-widget tasks-widget">
          <div className="widget-header">
            <Target size={20} />
            <h2>Задачи на сегодня</h2>
            <span className="task-count">{(tasksExpanded || isMobile ? todayTasks.length + overdueTasks.length : Math.min(4, todayTasks.length + overdueTasks.length))}</span>
          </div>
          <div className="widget-content">
            {overdueTasks.length === 0 && todayTasks.length === 0 && tomorrowTasks.length === 0 ? (
              <div className="tasks-empty-state">
                <div className="empty-confetti">🎉</div>
                <p className="empty-title">Всё выполнено!</p>
                <p className="empty-subtitle">Отличный день, {userName}!</p>
              </div>
            ) : (
              <ul className="task-list">
                {overdueTasks.length > 0 && (
                  <div className="task-section-label overdue-label">🔴 ПРОСРОЧЕННЫЕ</div>
                )}
                {overdueTasks.slice(0, tasksExpanded ? undefined : 3).map((task) => (
                  <li key={task.id} className={`dashboard-task-item priority-${task.priority} ${completingId === task.id ? 'task-completing' : ''}`}>
                    <button className="task-checkbox" onClick={() => handleTaskToggle(task.id, task.done)}>
                      {completingId === task.id ? <Check size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      {task.time && <span className="task-time">{task.time}</span>}
                    </div>
                  </li>
                ))}

                {todayTasks.length > 0 && overdueTasks.length > 0 && (
                  <div className="task-section-label">СЕГОДНЯ</div>
                )}
                {todayTasks.slice(0, tasksExpanded ? undefined : 4).map((task) => (
                  <li key={task.id} className={`dashboard-task-item priority-${task.priority} ${completingId === task.id ? 'task-completing' : ''}`}>
                    <button className="task-checkbox" onClick={() => handleTaskToggle(task.id, task.done)}>
                      {completingId === task.id ? <Check size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      {task.time && <span className="task-time">{task.time}</span>}
                    </div>
                  </li>
                ))}

                {tomorrowTasks.length > 0 && (
                  <div className="task-section-label">ЗАВТРА</div>
                )}
                {tomorrowTasks.slice(0, tasksExpanded ? undefined : 2).map((task) => (
                  <li key={task.id} className={`dashboard-task-item priority-${task.priority} ${completingId === task.id ? 'task-completing' : ''}`}>
                    <button className="task-checkbox" onClick={() => handleTaskToggle(task.id, task.done)}>
                      {completingId === task.id ? <Check size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      {task.time && <span className="task-time">{task.time}</span>}
                    </div>
                  </li>
                ))}

                {!tasksExpanded && (todayTasks.length + overdueTasks.length + tomorrowTasks.length > 5) && (
                  <button className="show-more-btn" onClick={() => setTasksExpanded(true)}>
                    ↓ показать ещё {todayTasks.length + overdueTasks.length + tomorrowTasks.length - 5} задач
                  </button>
                )}
                {tasksExpanded && (
                  <button className="show-more-btn" onClick={() => setTasksExpanded(false)}>
                    ↑ свернуть
                  </button>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Today's Habits Widget */}
        <div className="dashboard-widget habits-widget">
          <div className="widget-header">
            <TrendingUp size={20} />
            <h2>Привычки на сегодня</h2>
            <span className="habit-count">{doneHabitsToday}/{activeHabits.length}</span>
          </div>
          <div className="widget-content">
            {activeHabits.length === 0 ? (
              <p className="empty-state">Нет активных привычек. Начни формировать полезные привычки!</p>
            ) : (
              <ul className="habit-list">
                {activeHabits.slice(0, 5).map((habit) => {
                  const doneToday = isHabitDoneToday(habit.id);
                  const habitColor = habit.color || '#4caf50';
                  return (
                    <li key={habit.id} className="dashboard-habit-item">
                      <div
                        className={`habit-circle ${doneToday ? 'habit-circle-done' : ''}`}
                        style={{
                          backgroundColor: doneToday ? '#4caf50' : 'transparent',
                          border: `2px solid ${habitColor}`,
                          color: doneToday ? '#fff' : habitColor
                        }}
                        onClick={() => handleHabitToggle(habit.id, today)}
                      >
                        {habit.name?.slice(0, 2).toUpperCase()}
                        {doneToday && <span className="habit-circle-check">✓</span>}
                      </div>
                      <div className="habit-info">
                        <span className="habit-name">{habit.name}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Statistics Widget */}
        <div className="dashboard-widget stats-widget">
          <div className="widget-header">
            <Award size={20} />
            <h2>Статистика</h2>
          </div>
          <div className="widget-content stats-grid">
            <div className="stat-item">
              <span className="stat-value">{todayTasks.length + completedToday}</span>
              <span className="stat-label">Запланировано</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{completedToday}</span>
              <span className="stat-label">Выполнено сегодня</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{calculateStreak()}%</span>
              <span className="stat-label">Прогресс привычек</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{activeHabits.length}</span>
              <span className="stat-label">Активных привычек</span>
            </div>
          </div>
        </div>

        {/* Week Widget */}
        <div className="dashboard-widget week-widget">
          <div className="widget-header">
            <CheckCheck size={20} />
            <h2>Неделя</h2>
          </div>
          <div className="widget-content">
            <div className="week-grid">
              {weekGrid.map((day) => (
                <div key={day.dateStr} className={`week-day ${day.isToday ? 'week-day-today' : ''}`}>
                  <div
                    className="week-day-bar"
                    style={{
                      height: `${Math.max(day.pct * 48, day.total > 0 ? 4 : 0)}px`,
                      backgroundColor: day.pct >= 1 ? '#4caf50' : day.pct > 0 ? '#ff9800' : day.total > 0 ? '#f44336' : 'rgba(255,255,255,0.08)'
                    }}
                  />
                  <span className="week-day-label">{day.label}</span>
                  {day.total > 0 && (
                    <span className="week-day-count">{day.done}/{day.total}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Widget */}
        {upcomingTask && (
          <div className="dashboard-widget upcoming-widget">
            <div className="widget-header">
              <Calendar size={20} />
              <h2>Ближайшее</h2>
            </div>
            <div className="widget-content">
              <div className="upcoming-task">
                <div className={`upcoming-priority-bar priority-${upcomingTask.priority}`} />
                <div className="upcoming-info">
                  <span className="upcoming-title">{upcomingTask.title}</span>
                  <span className="upcoming-time">
                    ⏰ {upcomingTask.time} · {getTimeUntil(upcomingTask.date!, upcomingTask.time!)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

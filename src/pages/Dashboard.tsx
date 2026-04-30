import { useState, useEffect, useCallback } from 'react';
import { Check, Circle, TrendingUp, Calendar, Target, Award } from 'lucide-react';
import type { Task, Habit, HabitRecord } from '../api/types';
import { fetchTasks, updateTask, fetchTotalCompletedCount } from '../api/tasks';
import { fetchHabits, fetchHabitRecords } from '../api/habits';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, habitsData, recordsData, completedCount] = await Promise.all([
        fetchTasks(),
        fetchHabits(currentYear, currentMonth),
        fetchHabitRecords(currentYear, currentMonth),
        fetchTotalCompletedCount(),
      ]);
      setTasks(tasksData);
      setHabits(habitsData);
      setHabitRecords(recordsData);
      setTotalCompleted(completedCount);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();
    const storedName = localStorage.getItem('user-name') || 'User';
    setUserName(storedName);
  }, [loadData]);

  const todayTasks = tasks.filter((task) => task.date === today && !task.done);
  const completedToday = tasks.filter((task) => task.date === today && task.done).length;

  const activeHabits = habits.filter((h) => h.active);

  const getHabitProgress = (habitId: number) => {
    const record = habitRecords.find((r) => r.habitId === habitId);
    return record ? record.completed : 0;
  };

  const handleTaskToggle = async (taskId: number, currentDone: boolean) => {
    try {
      await updateTask(taskId, { done: !currentDone });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, done: !currentDone } : t))
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateStreak = () => {
    if (habitRecords.length === 0) return 0;
    const completedHabits = habitRecords.filter((r) => r.completed > 0).length;
    return Math.floor((completedHabits / activeHabits.length) * 100) || 0;
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
            <h2>Today&apos;s Tasks</h2>
            <span className="task-count">{todayTasks.length}</span>
          </div>
          <div className="widget-content">
            {todayTasks.length === 0 ? (
              <p className="empty-state">No tasks for today. You&apos;re all caught up!</p>
            ) : (
              <ul className="task-list">
                {todayTasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="dashboard-task-item">
                    <button
                      className="task-checkbox"
                      onClick={() => handleTaskToggle(task.id, task.done)}
                      aria-label={`Mark task ${task.title} as done`}
                    >
                      <Circle size={18} />
                    </button>
                    <span className="task-title">{task.title}</span>
                  </li>
                ))}
                {todayTasks.length > 5 && (
                  <p className="more-tasks">+{todayTasks.length - 5} more tasks</p>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Today's Habits Widget */}
        <div className="dashboard-widget habits-widget">
          <div className="widget-header">
            <TrendingUp size={20} />
            <h2>Today&apos;s Habits</h2>
            <span className="habit-count">{activeHabits.length}</span>
          </div>
          <div className="widget-content">
            {activeHabits.length === 0 ? (
              <p className="empty-state">No active habits. Start building good habits!</p>
            ) : (
              <ul className="habit-list">
                {activeHabits.slice(0, 5).map((habit) => {
                  const completed = getHabitProgress(habit.id);
                  const goal = habit.goal || 1;
                  const progress = Math.min((completed / goal) * 100, 100);

                  return (
                    <li key={habit.id} className="dashboard-habit-item">
                      <div className="habit-info">
                        <span className="habit-title">{habit.title}</span>
                        <span className="habit-progress-text">
                          {completed}/{goal}
                        </span>
                      </div>
                      <div className="habit-progress-bar">
                        <div
                          className="habit-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
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
            <h2>Statistics</h2>
          </div>
          <div className="widget-content stats-grid">
            <div className="stat-item">
              <span className="stat-value">{totalCompleted}</span>
              <span className="stat-label">Tasks Completed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{completedToday}</span>
              <span className="stat-label">Completed Today</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{calculateStreak()}%</span>
              <span className="stat-label">Habit Streak</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{activeHabits.length}</span>
              <span className="stat-label">Active Habits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

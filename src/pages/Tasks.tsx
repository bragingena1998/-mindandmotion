import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchTasks,
  fetchFolders,
  createTask,
  updateTask,
  deleteTask,
  type Task,
  type Folder,
  type CreateTaskData
} from '../api/tasks';
import TaskCard from '../components/TaskCard';
import FolderChips from '../components/FolderChips';
import TaskModal from '../components/TaskModal';
import '../styles/tasks.css';

// Types for grouped tasks
type TaskSection = {
  title: string;
  icon: string;
  tasks: Task[];
};

// Calculate next date based on recurrence
function calculateNextDate(taskDate: string, recurrence: string): string {
  const date = new Date(taskDate);
  if (recurrence === 'daily') date.setDate(date.getDate() + 1);
  if (recurrence === 'weekly') date.setDate(date.getDate() + 7);
  if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}

// Calculate statistics from tasks — ФАЙЛ 2 FIX
function calculateStats(allTasks: Task[]) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // СЕГОДНЯ: все задачи с датой <= сегодня (просрочка + сегодня)
  const todayPool = allTasks.filter(t => t.date && t.date.substring(0,10) <= todayStr)
  const todayDone = todayPool.filter(t => t.done === true).length
  const todayTotal = todayPool.length

  // НЕДЕЛЯ: выполненные за текущую неделю (Пн-Вс)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekDone = allTasks.filter(t => t.done && t.date && t.date.substring(0,10) >= weekStartStr).length

  // МЕСЯЦ: выполненные в текущем месяце
  const monthStr = todayStr.substring(0,7) // 'YYYY-MM'
  const monthDone = allTasks.filter(t => t.done && t.date && t.date.substring(0,7) === monthStr).length

  // ВСЕГО: все задачи загруженные (за выбранный месяц)
  const totalDone = allTasks.filter(t => t.done).length
  const totalAll = allTasks.length

  return {
    today: { completed: todayDone, total: todayTotal },
    week: weekDone,
    month: monthDone,
    total: totalDone,
    all: totalAll
  }
}

// Group tasks by date — ФАЙЛ 2 FIX: подсветка сегодня/просрочка
function groupTasksByDate(tasks: Task[], showDone: boolean): TaskSection[] {
  // Получаем сегодня как строку YYYY-MM-DD
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const sections: TaskSection[] = [];

  // БАГ 1 FIX: Фильтруем пустые задачи (без title или id)
  const validTasks = tasks.filter(t => t.id && t.title && t.title.trim());

  // Overdue tasks (before today) — красные
  const overdue = validTasks.filter(t => {
    if (!t.date) return false;
    if (!showDone && t.done) return false;
    const taskDate = t.date.substring(0, 10);
    return taskDate < todayStr; // строго меньше = просроченные
  });

  if (overdue.length > 0) {
    sections.push({ title: '🔥 ПРОСРОЧЕННЫЕ', icon: '🔥', tasks: overdue });
  }

  // Today tasks — зелёные
  const todaysTasks = validTasks.filter(t => {
    if (!t.date) return false;
    if (!showDone && t.done) return false;
    const taskDate = t.date.substring(0, 10);
    return taskDate === todayStr; // = сегодня
  });

  if (todaysTasks.length > 0) {
    sections.push({ title: '⚡ СЕГОДНЯ', icon: '⚡', tasks: todaysTasks });
  }

  // Tomorrow tasks
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`
  const tomorrowTasks = validTasks.filter(t => {
    if (!t.date) return false;
    if (!showDone && t.done) return false;
    const taskDate = t.date.substring(0, 10);
    return taskDate === tomorrowStr;
  });

  if (tomorrowTasks.length > 0) {
    sections.push({ title: '📅 ЗАВТРА', icon: '📅', tasks: tomorrowTasks });
  }

  // Future tasks by date
  const futureTasks = validTasks.filter(t => {
    if (!t.date) return false;
    if (!showDone && t.done) return false;
    const taskDate = t.date.substring(0, 10);
    return taskDate > tomorrowStr;
  });

  // Group future tasks by date
  const futureByDate = new Map<string, Task[]>();
  futureTasks.forEach(task => {
    const dateKey = task.date!;
    if (!futureByDate.has(dateKey)) {
      futureByDate.set(dateKey, []);
    }
    futureByDate.get(dateKey)!.push(task);
  });

  // Sort dates and add sections
  const sortedDates = Array.from(futureByDate.keys()).sort();
  sortedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const title = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'short'
    }).toUpperCase();
    sections.push({ title, icon: '📅', tasks: futureByDate.get(dateStr)! });
  });

  // Tasks without date (at the end)
  const noDateTasks = validTasks.filter(t => {
    if (!t.date) return !showDone ? !t.done : true;
    return false;
  });
  if (noDateTasks.length > 0) {
    sections.push({ title: '📝 БЕЗ ДАТЫ', icon: '📝', tasks: noDateTasks });
  }

  // Completed tasks (if showDone is true, shown at the very end)
  if (showDone) {
    const completedTasks = validTasks.filter(t => t.done);
    if (completedTasks.length > 0) {
      sections.push({ title: '✓ ВЫПОЛНЕННЫЕ', icon: '✓', tasks: completedTasks });
    }
  }

  return sections;
}

// Helper to get current month in YYYY-MM format
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// Helper to format month for display (АПРЕЛЬ 2026)
function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();
}

// ФАЙЛ 2 FIX: правильная реализация без setMonth багов
function getNextMonth(current: string): string {
  const [year, month] = current.split('-').map(Number)
  const d = new Date(year, month - 1 + 1, 1) // -1 для 0-based, +1 для next
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function getPrevMonth(current: string): string {
  const [year, month] = current.split('-').map(Number)
  const d = new Date(year, month - 1 - 1, 1) // -1 для 0-based, ещё -1 для prev
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [scrollToSection, setScrollToSection] = useState<string | null>(null);
  // БАГ 5 FIX: Состояние текущего месяца для архива
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());

  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Load folders
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const data = await fetchFolders();
        setFolders(data);
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    };
    loadFolders();
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const folderId = selectedFolder === 'all' ? undefined : selectedFolder;
      // БАГ 5 FIX: Передаем текущий месяц для загрузки архива
      const data = await fetchTasks(folderId, currentMonth);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentMonth]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Scroll to section after tasks load
  useEffect(() => {
    if (scrollToSection && !isLoading) {
      setTimeout(() => {
        const element = sectionRefs.current.get(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setScrollToSection(null);
      }, 50);
    }
  }, [scrollToSection, isLoading]);

  // Handle task toggle with recurrence logic
  const handleToggleTask = async (id: number, done: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const doneDate = done ? new Date().toISOString() : null;
      await updateTask(id, { done, doneDate });

      // ФАЙЛ 7 FIX: Проверяем оба поля recurrence и recurrence_type
      const hasRecurrence = (task.recurrence && task.recurrence !== 'none') ||
                           (task.recurrenceType && task.recurrenceType !== 'none');
      const recurrenceValue = task.recurrence || task.recurrenceType || 'none';

      // If task is recurring and being marked as done, create next occurrence
      if (done && hasRecurrence && task.date) {
        const nextDate = calculateNextDate(task.date, recurrenceValue);

        // Create new task with same properties but new date
        const newTaskData: CreateTaskData = {
          title: task.title,
          comment: task.comment,
          date: nextDate,
          time: task.time,
          priority: task.priority,
          folderId: task.folderId,
          recurrence: recurrenceValue
        };

        await createTask(newTaskData);

        // Reload tasks to show the new recurring task
        await loadTasks();

        // Scroll to the section of the new task date
        const todayStr = new Date().toISOString().split('T')[0];
        if (nextDate === todayStr) {
          setScrollToSection('⚡ СЕГОДНЯ');
        } else if (nextDate > todayStr) {
          setScrollToSection('📅'); // Future date section
        }
      } else {
        // Just update local state
        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, done, doneDate } : t
        ));
      }
    } catch (err) {
      alert('Не удалось обновить задачу');
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      alert('Не удалось удалить задачу');
    }
  };

  // [1] ФИКС: переименовано в handleSaveTask, добавлен id параметр для update
  const handleSaveTask = async (taskData: CreateTaskData, id?: number) => {
    try {
      if (id) {
        // UPDATE существующей задачи
        await updateTask(id, taskData);
        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, ...taskData, id } as Task : t
        ));
      } else {
        // CREATE новой задачи
        await createTask(taskData);
        await loadTasks();

        // Determine which section to scroll to
        const todayStr = new Date().toISOString().split('T')[0];
        if (taskData.date) {
          if (taskData.date < todayStr) {
            setScrollToSection('🔥 ПРОСРОЧЕННЫЕ');
          } else if (taskData.date === todayStr) {
            setScrollToSection('⚡ СЕГОДНЯ');
          } else if (taskData.date > todayStr) {
            setScrollToSection('📅');
          }
        } else {
          setScrollToSection('📝 БЕЗ ДАТЫ');
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(id ? 'Не удалось обновить задачу' : 'Не удалось создать задачу');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Calculate statistics
  const stats = calculateStats(tasks);

  // Group tasks by date
  const groupedTasks = groupTasksByDate(tasks, showDone);

  // Get folder by id helper
  const getFolder = (folderId: number | null) => {
    if (!folderId) return null;
    return folders.find(f => f.id === folderId) || null;
  };

  // Set section ref
  const setSectionRef = (title: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(title, el);
    }
  };

  return (
    <div className="page-tasks">
      <div className="page-inner">
        {/* БАГ 5 FIX: Заголовок с переключателем месяцев */}
        <div className="page-header">
          <h1 className="page-title">🎯 МОИ ЗАДАЧИ</h1>
          <div className="month-navigator">
            <button
              className="month-nav-btn"
              onClick={() => setCurrentMonth(getPrevMonth(currentMonth))}
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="month-display">{formatMonthDisplay(currentMonth)}</span>
            <button
              className="month-nav-btn"
              onClick={() => setCurrentMonth(getNextMonth(currentMonth))}
              aria-label="Следующий месяц"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Statistics - 4 cards in grid */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-card-number" style={{ color: 'var(--accent-border)' }}>
              {stats.today.completed}/{stats.today.total}
            </div>
            <div className="stat-card-label">СЕГОДНЯ</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">{stats.week}</div>
            <div className="stat-card-label">НЕДЕЛЯ</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">{stats.month}</div>
            <div className="stat-card-label">МЕСЯЦ</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">{stats.total}/{stats.all}</div>
            <div className="stat-card-label">ВСЕГО</div>
          </div>
        </div>

        <FolderChips
          folders={folders}
          selectedId={selectedFolder}
          onSelect={setSelectedFolder}
        />

        {/* ФАЙЛ 3 FIX: убран нативный input, оставлена только иконка */}
        <div
          className="filter-toggle"
          onClick={() => setShowDone(!showDone)}
          style={{ cursor: 'pointer' }}
        >
          {showDone ? <CheckSquare size={16} /> : <Square size={16} />}
          <span style={{ marginLeft: '8px' }}>Показывать выполненные</span>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Загрузка...</div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-text" style={{ color: 'var(--danger-1)' }}>
              {error}
            </div>
          </div>
        ) : groupedTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              Нет задач. Создайте первую!
            </div>
          </div>
        ) : (
          <div className="tasks-grouped">
            {groupedTasks.map((section, index) => (
              <div
                key={section.title + index}
                ref={el => setSectionRef(section.title.startsWith('📅') ? '📅' : section.title, el)}
                className="task-section"
              >
                <h2 className="task-section-title">{section.title}</h2>
                <div className="tasks-list">
                  {section.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      folder={getFolder(task.folderId)}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onEdit={handleEditTask}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="add-task-fab"
        onClick={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
      >
        <Plus size={24} />
      </button>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        folders={folders}
        editingTask={editingTask}
      />
    </div>
  );
}

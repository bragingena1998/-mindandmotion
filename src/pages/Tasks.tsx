import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchTasks,
  fetchFolders,
  createTask,
  updateTask,
  deleteTask,
  fetchTotalCompletedCount,
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

// Calculate statistics from tasks — ФАЙЛ 2 FIX
function calculateStats(allTasks: Task[]) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // Сегодня: невыполненные с date=сегодня + выполненные с doneDate=сегодня
  const todayPool = allTasks.filter(t => {
    const taskDate = t.date?.substring(0, 10);
    const doneDateStr = t.doneDate?.substring(0, 10);
    if (t.done) {
      return doneDateStr === todayStr; // выполненные — по doneDate
    } else {
      return taskDate === todayStr; // невыполненные — по date
    }
  });
  const todayDone = todayPool.filter(t => t.done).length;
  const todayTotal = todayPool.length;

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
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [scrollToSection, setScrollToSection] = useState<string | null>(null);
  // БАГ 5 FIX: Состояние текущего месяца для архива
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  // ШАГ 2: Общий счётчик выполненных за всё время
  const [totalCompleted, setTotalCompleted] = useState(0);

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
      // [2] ФИКС: клиентская фильтрация как страховка
      const filtered = folderId
        ? data.filter((t: Task) => t.folderId === folderId)
        : data;
      setTasks(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentMonth]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ШАГ 2: Загружаем общий счётчик выполненных (один раз при маунте)
  useEffect(() => {
    fetchTotalCompletedCount()
      .then(setTotalCompleted)
      .catch(() => { /* silently ignore */ });
  }, []);

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

  const handleToggleTask = async (id: number, done: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const hasRecurrence = task.isRecurring === true;
      const recurrenceType = task.recurrenceType ?? null;
      const recurrenceValue = task.recurrenceValue ?? null;

      // Вычисляем nextDate на фронте (только если задача с повторением и отмечается выполненной)
      let nextDate: string | undefined = undefined;
      if (done && hasRecurrence && task.date && recurrenceType) {
        const [y, m, d] = task.date.substring(0,10).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        if (recurrenceType === 'daily') {
          dt.setDate(dt.getDate() + 1);
        } else if (recurrenceType === 'weekly') {
          dt.setDate(dt.getDate() + 7);
        } else if (recurrenceType === 'monthly') {
          dt.setMonth(dt.getMonth() + 1);
        } else if (recurrenceType === 'custom' && recurrenceValue) {
          try {
            const days = JSON.parse(recurrenceValue);
            if (Array.isArray(days) && days.length > 0) {
              for (let i = 1; i <= 7; i++) {
                dt.setDate(dt.getDate() + 1);
                if (days.includes(dt.getDay())) break;
              }
            } else { dt.setDate(dt.getDate() + 1); }
          } catch { dt.setDate(dt.getDate() + 1); }
        }
        const yy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        nextDate = `${yy}-${mm}-${dd}`;
      }

      // Передаём ВСЕ поля задачи + nextDate бэкенду
      await updateTask(id, {
        title:           task.title,
        date:            task.date,
        time:            task.time ?? null,
        deadline:        task.deadline ?? null,
        priority:        task.priority,
        comment:         task.comment ?? '',
        folderId:        task.folderId ?? null,
        done:            done,
        doneDate:        done ? new Date().toISOString().split('T')[0] : null,
        isRecurring:     task.isRecurring,
        recurrenceType:  recurrenceType,
        recurrenceValue: recurrenceValue ?? '',
        focusSessions:   task.focusSessions ?? 0,
        ...(nextDate ? { nextDate } : {}),
      } as Partial<Task>);

      // Просто перезагружаем список — бэкенд сам создал следующую задачу
      await loadTasks();

    } catch (err) {
      alert('Не удалось обновить задачу');
    }
  };

  // [4] ФИКС: показываем модалку подтверждения вместо immediate delete
  const handleDeleteTask = (id: number) => {
    setDeletingTaskId(id);
  };

  const confirmDelete = async () => {
    if (!deletingTaskId) return;
    try {
      await deleteTask(deletingTaskId);
      setTasks(prev => prev.filter(task => task.id !== deletingTaskId));
    } catch {
      alert('Не удалось удалить задачу');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // [1] ФИКС: переименовано в handleSaveTask, добавлен id параметр для update
  const handleSaveTask = async (taskData: CreateTaskData, id?: number) => {
    try {
      if (id) {
        // [C] ФИКС: полная перезагрузка безопаснее чем ручной merge
        await updateTask(id, taskData as Partial<Task>);
        await loadTasks();
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
      setEditingTask(null);
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
        {/* Month Navigator — compact with add button */}
        <div className="month-navigator compact">
          <button
            className="month-nav-btn"
            onClick={() => setCurrentMonth(getPrevMonth(currentMonth))}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="month-display">{formatMonthDisplay(currentMonth)}</span>
          <button
            className="month-nav-btn"
            onClick={() => setCurrentMonth(getNextMonth(currentMonth))}
            aria-label="Следующий месяц"
          >
            <ChevronRight size={16} />
          </button>
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
            {/* ШАГ 3: ВСЕГО — выполненные за всё время, не зависит от месяца */}
            <div className="stat-card-number">{totalCompleted}</div>
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

      {/* [4] ФИКС: модалка подтверждения удаления */}
      {deletingTaskId !== null && (
        <div className="modal-overlay" onClick={() => setDeletingTaskId(null)}>
          <div className="modal-content modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Удалить задачу?</h2>
              <button className="modal-close" onClick={() => setDeletingTaskId(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px', fontSize: '14px', lineHeight: 1.5 }}>
              Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingTaskId(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid var(--accent-border)',
                  background: 'transparent', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(251,113,133,0.18)',
                  color: '#fb7185',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

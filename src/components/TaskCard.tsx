import { useState, useEffect, useRef } from 'react';
import { Trash2, Pencil, Plus, Check, X } from 'lucide-react';
import type { Task, Folder, Subtask } from '../api/tasks';
import { fetchSubtasks, createSubtask, updateSubtask, deleteSubtask, updateTask } from '../api/tasks';
import FocusModal from './FocusModal';

interface TaskCardProps {
  task: Task;
  folder?: Folder | null;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
  onEdit?: (task: Task) => void;
}

function formatTaskDateRange(date: string, deadline?: string | null): string {
  const parseDate = (d: string) => {
    const [year, month, day] = d.split('-');
    return { day: parseInt(day), month: parseInt(month), year: parseInt(year) };
  };
  const fmt2 = (n: number) => String(n).padStart(2, '0');
  const d = parseDate(date);

  if (!deadline) {
    return `${fmt2(d.day)}.${fmt2(d.month)}.${String(d.year).slice(2)}`;
  }

  const dl = parseDate(deadline);

  if (d.month === dl.month && d.year === dl.year) {
    // Одинаковый месяц: 13-15.03.26
    return `${fmt2(d.day)}-${fmt2(dl.day)}.${fmt2(d.month)}.${String(d.year).slice(2)}`;
  } else {
    // Разные месяцы: 13.04-14.05.26
    return `${fmt2(d.day)}.${fmt2(d.month)}-${fmt2(dl.day)}.${fmt2(dl.month)}.${String(dl.year).slice(2)}`;
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  // Если ISO datetime — извлекаем время в локальном timezone
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return timeStr.slice(0, 5); // HH:MM
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'НИЗКИЙ';
    case 2: return 'СРЕДНИЙ';
    case 3: return 'ВЫСОКИЙ';
    default: return 'СРЕДНИЙ';
  }
}

function getPriorityClass(priority: number): string {
  switch (priority) {
    case 1: return 'low';
    case 2: return 'medium';
    case 3: return 'high';
    default: return 'medium';
  }
}

function getFolderEmoji(folderName?: string): string {
  if (!folderName) return '📁';
  const lower = folderName.toLowerCase();
  if (lower.includes('дом')) return '🏠';
  if (lower.includes('работ')) return '💼';
  if (lower.includes('учеб')) return '📚';
  if (lower.includes('здоров')) return '💪';
  if (lower.includes('финанс')) return '💰';
  if (lower.includes('покуп')) return '🛒';
  if (lower.includes('путешеств')) return '✈️';
  if (lower.includes('семь')) return '❤️';
  return '📁';
}

function getTaskStatus(task: Task, todayStr: string): { label: string; className: string } {
  if (task.done) return { label: '', className: '' };

  if (task.date) {
    const taskDate = task.date.substring(0, 10);
    // Сравниваем строки YYYY-MM-DD
    if (taskDate < todayStr) return { label: '🔥 ПРОСРОЧЕНО', className: 'status-overdue' };
    if (taskDate === todayStr) return { label: '⚡ СЕГОДНЯ', className: 'status-today' };
  }

  return { label: '', className: '' };
}

export default function TaskCard({ task, folder, onToggle, onDelete, onEdit }: TaskCardProps) {
  // ── Subtasks state ────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // ── Long press / Focus state ──────────────────────────────────────────────
  const [showFocus, setShowFocus] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLongPress = useRef(false);

  const handlePointerDown = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowFocus(true);
    }, 600);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    // Prevent click if it was a long press
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };

  const handleFocusSave = async (minutes: number) => {
    try {
      await updateTask(task.id, {
        focusSessions: task.focusSessions + 1,
      } as Partial<Task>);
      // Обновляем локальное значение для отображения
      task.focusSessions += 1;
    } catch {
      console.error('Failed to update focus sessions');
    }
  };

  // ── Load subtasks when expanded ───────────────────────────────────────────
  useEffect(() => {
    if (expanded && task.subtasksCount > 0) {
      setLoadingSubtasks(true);
      fetchSubtasks(task.id)
        .then(setSubtasks)
        .catch(() => setSubtasks([]))
        .finally(() => setLoadingSubtasks(false));
    }
  }, [expanded, task.id, task.subtasksCount]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task.id, !task.done);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить задачу?')) {
      onDelete(task.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // ── Subtask handlers ────────────────────────────────────────────────────
  const handleAddSubtask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const subtask = await createSubtask(task.id, newSubtaskTitle.trim());
      setSubtasks([...subtasks, subtask]);
      setNewSubtaskTitle('');
    } catch {
      alert('Не удалось создать подзадачу');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      const updated = await updateSubtask(task.id, subtask.id, { done: !subtask.done });
      setSubtasks(subtasks.map(s => s.id === updated.id ? updated : s));
    } catch {
      alert('Не удалось обновить подзадачу');
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!confirm('Удалить подзадачу?')) return;
    try {
      await deleteSubtask(task.id, subtaskId);
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
    } catch {
      alert('Не удалось удалить подзадачу');
    }
  };

  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const saveEditSubtask = async () => {
    if (!editingSubtaskTitle.trim() || editingSubtaskId === null) {
      setEditingSubtaskId(null);
      return;
    }
    try {
      const updated = await updateSubtask(task.id, editingSubtaskId, { title: editingSubtaskTitle.trim() });
      setSubtasks(subtasks.map(s => s.id === updated.id ? updated : s));
    } catch {
      alert('Не удалось обновить подзадачу');
    } finally {
      setEditingSubtaskId(null);
    }
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateStr = formatTaskDateRange(task.date, task.deadline);
  const isOverdue = !task.done && task.date && task.date.substring(0, 10) < todayStr;
  const status = getTaskStatus(task, todayStr);

  const hasRecurrence = (task.recurrence && task.recurrence !== 'none') ||
                       (task.recurrenceType && task.recurrenceType !== 'none');

  const completedSubtasks = subtasks.filter(s => s.done).length;

  return (
    <>
      <div 
        className={`task-card-compact ${task.done ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${expanded ? 'expanded' : ''}`}
        onClick={toggleExpanded}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
      <div className="task-card-main">
        {/* Checkbox */}
        <div
          className={`task-checkbox ${task.done ? 'checked' : ''}`}
          onClick={handleToggle}
        />

        {/* Content */}
        <div className="task-content-compact">
          {/* Row 1: Title + Actions */}
          <div className="task-header-compact">
            <h3 className="task-title-compact">{task.title}</h3>
            <div className="task-actions-compact">
              {onEdit && (
                <button className="task-action-btn" onClick={handleEdit}>
                  <Pencil size={12} />
                </button>
              )}
              <button className="task-action-btn" onClick={handleDelete}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Row 2: Status (if not empty) */}
          {status.label && (
            <div className="task-status-compact">
              <span className={`task-status-badge ${status.className}`}>{status.label}</span>
            </div>
          )}

          {/* Row 3: Meta info */}
          <div className="task-meta-compact">
            {dateStr && <span className="meta-date">{dateStr}</span>}
            {task.time && <span className="meta-time">{formatTime(task.time)}</span>}
            {folder && (
              <span className="meta-folder">
                {folder.icon || getFolderEmoji(folder.name)} {folder.name}
              </span>
            )}
            <span className={`meta-priority ${getPriorityClass(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            {hasRecurrence && (
              <span className="meta-recurrence" title="Повторяющаяся задача">↻</span>
            )}
            {task.subtasksCount > 0 && (
              <span className="meta-subtasks" title="Подзадачи">
                ☰ {completedSubtasks}/{task.subtasksCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtasks panel */}
      {expanded && (
        <div className="subtasks-panel" onClick={(e) => e.stopPropagation()}>
          {loadingSubtasks ? (
            <div className="subtasks-loading">Загрузка...</div>
          ) : (
            <>
              {/* Subtasks list */}
              <div className="subtasks-list">
                {subtasks.length === 0 ? (
                  <div className="subtasks-empty">Нет подзадач</div>
                ) : (
                  subtasks.map(subtask => (
                    <div key={subtask.id} className={`subtask-item ${subtask.done ? 'done' : ''}`}>
                      <div 
                        className={`subtask-checkbox ${subtask.done ? 'checked' : ''}`}
                        onClick={() => handleToggleSubtask(subtask)}
                      />
                      
                      {editingSubtaskId === subtask.id ? (
                        <div className="subtask-edit">
                          <input
                            type="text"
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditSubtask();
                              if (e.key === 'Escape') cancelEditSubtask();
                            }}
                            autoFocus
                          />
                          <button onClick={saveEditSubtask}><Check size={14} /></button>
                          <button onClick={cancelEditSubtask}><X size={14} /></button>
                        </div>
                      ) : (
                        <span 
                          className="subtask-title"
                          onClick={() => startEditSubtask(subtask)}
                        >
                          {subtask.title}
                        </span>
                      )}
                      
                      <button 
                        className="subtask-delete"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add subtask form */}
              <form className="subtask-add" onSubmit={handleAddSubtask}>
                <input
                  type="text"
                  placeholder="Новая подзадача..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                />
                <button type="submit" disabled={!newSubtaskTitle.trim()}>
                  <Plus size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
      </div>

      {/* Focus Modal */}
      {showFocus && (
        <FocusModal
          task={task}
          onClose={() => setShowFocus(false)}
          onSave={handleFocusSave}
        />
      )}
    </>
  );
}
